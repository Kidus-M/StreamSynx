/**
 * lib/watchStats.js — how people actually watch, measured on their own device.
 *
 * The players are cross-origin iframes, so we never see play/pause or the
 * playhead. What we can measure honestly is how long a title's player stayed
 * open while the tab was visible. Against the runtime TMDB gives us, that is
 * enough to tell a film that was finished from one abandoned at minute twelve,
 * and a viewer who settles in for three hours from one who wants ninety
 * minutes and out.
 *
 * Everything lives in localStorage; nothing here is written to Firestore. The
 * summary is what the assistant reads to size its suggestions to the person.
 */

const STORE_KEY = "streamsynx:watch-stats";
const STATE_VERSION = 1;

/** Sessions shorter than this are a misclick, not a viewing. */
const MIN_SESSION_MS = 60 * 1000;
/** Flush cadence while a player is open. */
const TICK_MS = 15 * 1000;
/** Keep the store small: most recent titles and sittings only. */
const MAX_TITLES = 120;
const MAX_SESSIONS = 80;
/** A gap longer than this between episodes ends a "sitting". */
const SITTING_GAP_MS = 45 * 60 * 1000;

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

const EMPTY = { v: STATE_VERSION, titles: {}, sessions: [] };

const readState = () => {
  if (!canUseStorage()) return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== STATE_VERSION) return EMPTY;
    return {
      v: STATE_VERSION,
      titles: parsed.titles && typeof parsed.titles === "object" ? parsed.titles : {},
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return EMPTY;
  }
};

const writeState = (state) => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode — stats are best effort */
  }
};

const keyOf = (mediaType, id) => `${mediaType}:${id}`;

/** Trims the title map to the most recently watched entries. */
const trimTitles = (titles) => {
  const entries = Object.entries(titles);
  if (entries.length <= MAX_TITLES) return titles;
  return Object.fromEntries(
    entries.sort((a, b) => (b[1].lastAt || 0) - (a[1].lastAt || 0)).slice(0, MAX_TITLES)
  );
};

/**
 * Adds `ms` of visible player time to a title and to the open session.
 * `sessionId` groups the ticks of one continuous play into one row.
 */
const record = (meta, sessionId, ms, now) => {
  if (ms <= 0) return;
  const state = readState();
  const key = keyOf(meta.media_type, meta.id);
  const existing = state.titles[key] || {
    id: meta.id,
    media_type: meta.media_type,
    title: meta.title || "",
    runtime: 0,
    genre_ids: [],
    watchedMs: 0,
    sessions: 0,
    firstAt: now,
    lastAt: now,
    // Series: how far they got, so a show they dropped can be told from
    // one they are still working through.
    season: null,
    episode: null,
    episodesSeen: 0,
  };

  const title = {
    ...existing,
    title: meta.title || existing.title,
    runtime: meta.runtime || existing.runtime,
    genre_ids: meta.genre_ids?.length ? meta.genre_ids : existing.genre_ids,
    watchedMs: existing.watchedMs + ms,
    lastAt: now,
  };

  const sessions = state.sessions.slice();
  const openIndex = sessions.findIndex((row) => row.sid === sessionId);
  if (openIndex >= 0) {
    sessions[openIndex] = { ...sessions[openIndex], ms: sessions[openIndex].ms + ms, endedAt: now };
  } else {
    title.sessions += 1;
    if (meta.media_type === "tv") {
      title.season = meta.season || null;
      title.episode = meta.episode || null;
      title.episodesSeen += 1;
    }
    sessions.push({
      sid: sessionId,
      key,
      media_type: meta.media_type,
      runtime: meta.runtime || 0,
      startedAt: now,
      endedAt: now,
      ms,
      hour: new Date(now).getHours(),
    });
  }

  writeState({
    v: STATE_VERSION,
    titles: trimTitles({ ...state.titles, [key]: title }),
    sessions: sessions.slice(-MAX_SESSIONS),
  });
};

/**
 * Starts timing a title. Returns a stop function; call it when the player
 * unmounts or the route changes. Time only counts while the tab is visible.
 *
 * `meta`: { id, media_type, title, runtime (minutes), genre_ids, season, episode }
 */
export const startWatchSession = (meta) => {
  if (!canUseStorage() || !meta?.id || !meta?.media_type) return () => {};

  const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  let visibleSince = document.visibilityState === "visible" ? Date.now() : null;

  const flush = () => {
    if (visibleSince === null) return;
    const now = Date.now();
    record(meta, sessionId, now - visibleSince, now);
    visibleSince = now;
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      if (visibleSince === null) visibleSince = Date.now();
    } else {
      flush();
      visibleSince = null;
    }
  };

  const timer = setInterval(flush, TICK_MS);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", flush);

  return () => {
    flush();
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", flush);
  };
};

/* --------------------------------- Summary -------------------------------- */

const median = (values) => {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const dayPart = (hour) => {
  if (hour < 5) return "late night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 22) return "evening";
  return "late night";
};

/** Ratio of time watched to runtime, capped so replays do not read as 300%. */
const completionOf = (entry) => {
  if (!entry.runtime) return null;
  const perPlay = entry.media_type === "tv"
    ? entry.watchedMs / Math.max(entry.episodesSeen, 1)
    : entry.watchedMs;
  return Math.min(perPlay / (entry.runtime * 60 * 1000), 1.2);
};

/**
 * The compact picture the assistant reasons over. Every number is derived
 * from real sittings (a minute or longer); with nothing recorded yet it
 * returns null so the prompt can say so instead of inventing habits.
 */
export const summarizeWatchStats = () => {
  const state = readState();
  const sittings = state.sessions.filter((row) => row.ms >= MIN_SESSION_MS);
  const titles = Object.values(state.titles).filter((entry) => entry.watchedMs >= MIN_SESSION_MS);
  if (!sittings.length && !titles.length) return null;

  const minutes = sittings.map((row) => row.ms / 60000);
  const medianSittingMin = Math.round(median(minutes));
  const longestSittingMin = Math.round(Math.max(0, ...minutes));

  // Group episode sessions into sittings to see how many they chain.
  const tvRows = sittings
    .filter((row) => row.media_type === "tv")
    .sort((a, b) => a.startedAt - b.startedAt);
  const runs = [];
  tvRows.forEach((row) => {
    const last = runs[runs.length - 1];
    if (last && row.startedAt - last.endedAt <= SITTING_GAP_MS) {
      last.count += 1;
      last.endedAt = row.endedAt;
    } else {
      runs.push({ count: 1, endedAt: row.endedAt });
    }
  });
  const episodesPerSitting = runs.length
    ? Math.round((runs.reduce((sum, run) => sum + run.count, 0) / runs.length) * 10) / 10
    : null;

  const withRuntime = titles.map((entry) => ({ entry, ratio: completionOf(entry) })).filter((x) => x.ratio !== null);
  const finished = withRuntime.filter((x) => x.ratio >= 0.8);
  const abandoned = withRuntime.filter((x) => x.ratio < 0.35 && x.entry.media_type === "movie");
  const finishRate = withRuntime.length ? Math.round((finished.length / withRuntime.length) * 100) : null;

  // Runtime they finish vs. runtime they bail on tells us their sweet spot.
  const finishedRuntimes = finished.map((x) => x.entry.runtime).filter(Boolean);
  const sweetSpotMin = finishedRuntimes.length ? Math.round(median(finishedRuntimes)) : null;

  let preferredLength = null;
  const gauge = sweetSpotMin || medianSittingMin;
  if (gauge) preferredLength = gauge < 75 ? "short (under 75 min)" : gauge < 130 ? "standard (75–130 min)" : "long (130 min+)";

  const hourCounts = {};
  sittings.forEach((row) => {
    const part = dayPart(row.hour);
    hourCounts[part] = (hourCounts[part] || 0) + 1;
  });
  const usualTime = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const nameOf = (entry) => `${entry.title || "Untitled"}${entry.media_type === "tv" ? " (series)" : ""}`;

  return {
    titlesTracked: titles.length,
    totalHours: Math.round((titles.reduce((sum, entry) => sum + entry.watchedMs, 0) / 3600000) * 10) / 10,
    medianSittingMin,
    longestSittingMin,
    preferredLength,
    finishRate,
    sweetSpotMin,
    episodesPerSitting,
    usualTime,
    finishedRecently: finished
      .sort((a, b) => b.entry.lastAt - a.entry.lastAt)
      .slice(0, 6)
      .map((x) => nameOf(x.entry)),
    abandoned: abandoned
      .sort((a, b) => b.entry.lastAt - a.entry.lastAt)
      .slice(0, 5)
      .map((x) => `${nameOf(x.entry)} — stopped around ${Math.round(x.ratio * 100)}%`),
    stillWatching: titles
      .filter((entry) => entry.media_type === "tv" && entry.season)
      .sort((a, b) => b.lastAt - a.lastAt)
      .slice(0, 5)
      .map((entry) => `${entry.title} — at S${entry.season}E${entry.episode}`),
  };
};

/** Test/debug helper. */
export const resetWatchStats = () => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(STORE_KEY);
  } catch {
    /* nothing to clean up */
  }
};
