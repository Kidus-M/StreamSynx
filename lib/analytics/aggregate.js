/**
 * lib/analytics/aggregate.js — turns raw analytics_sessions rows into the
 * numbers the dashboard draws. Pure functions; no Firestore in here.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
/** A session that sent a beacon within this window counts as "live". */
export const LIVE_WINDOW_MS = 2 * 60 * 1000;
/** Under this much watch time, a session did not really watch anything. */
const WATCHED_MS = 60 * 1000;

/** Web-vitals thresholds (good, poor) from web.dev. CLS is unitless. */
export const VITAL_THRESHOLDS = {
  LCP: [2500, 4000],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

const n = (value) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

const percentile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
};

const countBy = (rows, keyOf, valueOf = () => 1) => {
  const map = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    if (key === null || key === undefined || key === "") continue;
    map.set(key, (map.get(key) || 0) + valueOf(row));
  }
  return map;
};

/** [{ key, value }] sorted descending, capped. */
const ranked = (map, limit = 12) =>
  [...map.entries()]
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

const pathFromKey = (key) => (key === "~" ? "/" : key.replace(/~/g, "/"));

const isBounce = (s) => n(s.pageviews) <= 1 && n(s.activeMs) < 30000 && n(s.watchMs) < WATCHED_MS;

/** Headline numbers for one window of sessions. */
export const summarize = (sessions) => {
  const visitors = new Set(sessions.map((s) => s.vid)).size;
  const users = new Set(sessions.filter((s) => s.uid).map((s) => s.uid)).size;
  const count = sessions.length;
  const activeMs = sessions.reduce((sum, s) => sum + n(s.activeMs), 0);
  const watchMs = sessions.reduce((sum, s) => sum + n(s.watchMs), 0);
  const pageviews = sessions.reduce((sum, s) => sum + n(s.pageviews), 0);
  const durations = sessions.map((s) => n(s.activeMs)).filter((ms) => ms > 0);
  return {
    visitors,
    users,
    sessions: count,
    pageviews,
    activeMs,
    watchMs,
    medianSessionMs: percentile(durations, 50) || 0,
    avgSessionMs: count ? activeMs / count : 0,
    viewsPerSession: count ? pageviews / count : 0,
    bounceRate: count ? sessions.filter(isBounce).length / count : 0,
    watchRate: count ? sessions.filter((s) => n(s.watchMs) >= WATCHED_MS).length / count : 0,
    newVisitorRate: count ? sessions.filter((s) => s.newVisitor).length / count : 0,
  };
};

/** Buckets by UTC day (or hour when the window is a day or shorter). */
export const timeseries = (sessions, since, until, signups = []) => {
  const hourly = until - since <= DAY_MS + HOUR_MS;
  const step = hourly ? HOUR_MS : DAY_MS;
  const start = Math.floor(since / step) * step;
  const buckets = [];
  for (let t = start; t <= until; t += step) {
    buckets.push({ t, visitors: new Set(), users: new Set(), sessions: 0, watchMs: 0, pageviews: 0, signups: 0 });
  }
  const at = (time) => buckets[Math.floor((time - start) / step)];
  for (const s of sessions) {
    const bucket = at(n(s.startedAt) || n(s.lastSeenAt));
    if (!bucket) continue;
    bucket.visitors.add(s.vid);
    if (s.uid) bucket.users.add(s.uid);
    bucket.sessions += 1;
    bucket.watchMs += n(s.watchMs);
    bucket.pageviews += n(s.pageviews);
  }
  for (const time of signups) {
    const bucket = at(time);
    if (bucket) bucket.signups += 1;
  }
  return {
    step: hourly ? "hour" : "day",
    points: buckets.map((b) => ({
      t: b.t,
      visitors: b.visitors.size,
      users: b.users.size,
      sessions: b.sessions,
      watchMs: b.watchMs,
      pageviews: b.pageviews,
      signups: b.signups,
    })),
  };
};

export const geography = (sessions) => {
  const countries = new Map();
  const cities = new Map();
  for (const s of sessions) {
    const geo = s.geo || {};
    const code = geo.country || "XX";
    const c = countries.get(code) || { code, visitors: new Set(), users: new Set(), sessions: 0, watchMs: 0, activeMs: 0 };
    c.visitors.add(s.vid);
    if (s.uid) c.users.add(s.uid);
    c.sessions += 1;
    c.watchMs += n(s.watchMs);
    c.activeMs += n(s.activeMs);
    countries.set(code, c);

    if (geo.city && geo.lat !== null && geo.lat !== undefined) {
      const key = `${geo.city}|${code}`;
      const city = cities.get(key) || {
        city: geo.city,
        region: geo.region || "",
        country: code,
        lat: geo.lat,
        lon: geo.lon,
        visitors: new Set(),
        sessions: 0,
        watchMs: 0,
        live: false,
      };
      city.visitors.add(s.vid);
      city.sessions += 1;
      city.watchMs += n(s.watchMs);
      cities.set(key, city);
    }
  }
  const flat = (entry) => ({
    ...entry,
    visitors: entry.visitors.size,
    ...(entry.users ? { users: entry.users.size } : {}),
  });
  return {
    countries: [...countries.values()].map(flat).sort((a, b) => b.visitors - a.visitors),
    cities: [...cities.values()].map(flat).sort((a, b) => b.visitors - a.visitors).slice(0, 150),
  };
};

/** Signed-in accounts in the window, ranked by time spent. */
export const people = (sessions, lifetime = new Map(), accounts = new Map()) => {
  const byUser = new Map();
  for (const s of sessions) {
    if (!s.uid) continue;
    const u =
      byUser.get(s.uid) ||
      {
        uid: s.uid,
        email: s.email || "",
        name: s.name || "",
        sessions: 0,
        activeMs: 0,
        watchMs: 0,
        pageviews: 0,
        lastSeenAt: 0,
        firstSeenAt: Infinity,
        titles: new Map(),
        places: new Map(),
        devices: new Map(),
        hours: new Array(24).fill(0),
        recent: [],
      };
    u.sessions += 1;
    u.activeMs += n(s.activeMs);
    u.watchMs += n(s.watchMs);
    u.pageviews += n(s.pageviews);
    u.lastSeenAt = Math.max(u.lastSeenAt, n(s.lastSeenAt));
    u.firstSeenAt = Math.min(u.firstSeenAt, n(s.startedAt) || n(s.lastSeenAt));
    if (s.geo?.country) {
      const place = [s.geo.city, s.geo.country].filter(Boolean).join(", ");
      u.places.set(place, (u.places.get(place) || 0) + 1);
    }
    if (s.device) {
      const device = `${s.device.app === "Web" ? s.device.browser : s.device.app} · ${s.device.os}`;
      u.devices.set(device, (u.devices.get(device) || 0) + 1);
    }
    if (typeof s.localHour === "number") u.hours[s.localHour] += n(s.activeMs) || 1;
    for (const t of Object.values(s.titles || {})) {
      const key = `${t.mt}_${t.id}`;
      const prev = u.titles.get(key) || { id: t.id, mt: t.mt, title: t.title, ms: 0, episodes: new Set() };
      prev.ms += n(t.ms);
      if (t.season) prev.episodes.add(`S${t.season}E${t.episode}`);
      u.titles.set(key, prev);
    }
    u.recent.push({
      startedAt: n(s.startedAt) || n(s.lastSeenAt),
      activeMs: n(s.activeMs),
      watchMs: n(s.watchMs),
      pageviews: n(s.pageviews),
      city: s.geo?.city || "",
      country: s.geo?.country || "",
      device: s.device || null,
    });
    byUser.set(s.uid, u);
  }

  return [...byUser.values()]
    .map((u) => {
      const life = lifetime.get(u.uid) || {};
      const account = accounts.get(u.uid) || {};
      return {
        uid: u.uid,
        email: u.email || account.email || life.email || "",
        name: u.name || account.name || life.name || "",
        photo: account.photo || "",
        createdAt: account.createdAt || null,
        sessions: u.sessions,
        activeMs: u.activeMs,
        watchMs: u.watchMs,
        pageviews: u.pageviews,
        lastSeenAt: u.lastSeenAt,
        firstSeenAt: Number.isFinite(u.firstSeenAt) ? u.firstSeenAt : null,
        place: ranked(u.places, 1)[0]?.key || "",
        device: ranked(u.devices, 1)[0]?.key || "",
        hours: u.hours,
        titles: [...u.titles.values()]
          .map((t) => ({ ...t, episodes: t.episodes.size }))
          .sort((a, b) => b.ms - a.ms)
          .slice(0, 15),
        recent: u.recent.sort((a, b) => b.startedAt - a.startedAt).slice(0, 12),
        lifetime: {
          activeMs: n(life.activeMs),
          watchMs: n(life.watchMs),
          sessions: n(life.sessions),
        },
      };
    })
    // activeMs is all visible time on the site, watching included — the total.
    .sort((a, b) => b.activeMs - a.activeMs || b.watchMs - a.watchMs);
};

export const content = (sessions) => {
  const titles = new Map();
  for (const s of sessions) {
    for (const t of Object.values(s.titles || {})) {
      const key = `${t.mt}_${t.id}`;
      const entry = titles.get(key) || { id: t.id, mt: t.mt, title: t.title, watchMs: 0, viewers: new Set(), sessions: 0 };
      entry.watchMs += n(t.ms);
      entry.viewers.add(s.uid || s.vid);
      entry.sessions += 1;
      if (t.title) entry.title = t.title;
      titles.set(key, entry);
    }
  }
  const list = [...titles.values()].map((t) => ({ ...t, viewers: t.viewers.size }));
  const movieMs = list.filter((t) => t.mt === "movie").reduce((sum, t) => sum + t.watchMs, 0);
  const tvMs = list.filter((t) => t.mt === "tv").reduce((sum, t) => sum + t.watchMs, 0);
  return {
    titles: list.sort((a, b) => b.watchMs - a.watchMs).slice(0, 25),
    split: { movieMs, tvMs },
    distinctTitles: list.length,
  };
};

export const acquisition = (sessions) => {
  const pages = new Map();
  for (const s of sessions) {
    for (const [key, count] of Object.entries(s.paths || {})) {
      const path = pathFromKey(key);
      pages.set(path, (pages.get(path) || 0) + n(count));
    }
  }
  const source = (s) => s.utm?.source || s.referrer || "Direct";
  return {
    pages: ranked(pages, 15),
    entries: ranked(countBy(sessions, (s) => s.entry), 10),
    exits: ranked(countBy(sessions, (s) => s.exit), 10),
    sources: ranked(countBy(sessions, source), 12),
    campaigns: ranked(countBy(sessions, (s) => s.utm?.campaign), 8),
  };
};

export const technology = (sessions) => ({
  devices: ranked(countBy(sessions, (s) => s.device?.type || "unknown"), 6),
  browsers: ranked(countBy(sessions, (s) => s.device?.browser), 8),
  os: ranked(countBy(sessions, (s) => s.device?.os), 8),
  surfaces: ranked(countBy(sessions, (s) => s.device?.app), 4),
  screens: ranked(countBy(sessions, (s) => s.screen), 8),
  languages: ranked(countBy(sessions, (s) => (s.lang || "").split("-")[0]), 8),
});

/** 7 x 24 grid of sessions by the visitor's own local day/hour. */
export const rhythm = (sessions) => {
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const s of sessions) {
    if (typeof s.localDow === "number" && typeof s.localHour === "number") grid[s.localDow][s.localHour] += 1;
  }
  return grid;
};

export const vitals = (sessions) => {
  const out = {};
  for (const [name, [good, poor]] of Object.entries(VITAL_THRESHOLDS)) {
    const values = sessions.map((s) => s.vitals?.[name]).filter((v) => typeof v === "number");
    out[name] = {
      p75: percentile(values, 75),
      samples: values.length,
      good: values.filter((v) => v <= good).length,
      needs: values.filter((v) => v > good && v <= poor).length,
      poor: values.filter((v) => v > poor).length,
    };
  }
  return out;
};

/** Returning-visitor and stickiness signals within the window. */
export const loyalty = (sessions, days) => {
  const perVisitor = countBy(sessions, (s) => s.vid);
  const visitors = perVisitor.size;
  const returning = [...perVisitor.values()].filter((count) => count > 1).length;
  const daily = new Map();
  for (const s of sessions) {
    if (!s.uid) continue;
    const day = s.day || new Date(n(s.lastSeenAt)).toISOString().slice(0, 10);
    if (!daily.has(day)) daily.set(day, new Set());
    daily.get(day).add(s.uid);
  }
  const users = new Set(sessions.filter((s) => s.uid).map((s) => s.uid)).size;
  const avgDaily = daily.size ? [...daily.values()].reduce((sum, set) => sum + set.size, 0) / Math.max(days, daily.size, 1) : 0;
  const sessionsPerVisitor = visitors ? sessions.length / visitors : 0;
  return {
    returningRate: visitors ? returning / visitors : 0,
    sessionsPerVisitor,
    stickiness: users ? avgDaily / users : 0,
    avgDailyUsers: avgDaily,
  };
};

export const liveNow = (sessions, now) =>
  sessions
    .filter((s) => now - n(s.lastSeenAt) <= LIVE_WINDOW_MS)
    .map((s) => ({
      sid: s.sid,
      name: s.name || "",
      email: s.email || "",
      city: s.geo?.city || "",
      country: s.geo?.country || "",
      lat: s.geo?.lat ?? null,
      lon: s.geo?.lon ?? null,
      path: s.exit || s.entry || "",
      watching: Object.values(s.titles || {}).sort((a, b) => n(b.ms) - n(a.ms))[0]?.title || "",
      device: s.device || null,
      activeMs: n(s.activeMs),
    }));

export const recentSessions = (sessions, limit = 60) =>
  [...sessions]
    .sort((a, b) => n(b.startedAt || b.lastSeenAt) - n(a.startedAt || a.lastSeenAt))
    .slice(0, limit)
    .map((s) => ({
      sid: s.sid,
      startedAt: n(s.startedAt) || n(s.lastSeenAt),
      lastSeenAt: n(s.lastSeenAt),
      name: s.name || "",
      email: s.email || "",
      uid: s.uid || null,
      newVisitor: !!s.newVisitor,
      city: s.geo?.city || "",
      country: s.geo?.country || "",
      device: s.device || null,
      source: s.utm?.source || s.referrer || "Direct",
      entry: s.entry || "",
      pageviews: n(s.pageviews),
      activeMs: n(s.activeMs),
      watchMs: n(s.watchMs),
      titles: Object.values(s.titles || {}).map((t) => t.title).filter(Boolean).slice(0, 3),
    }));
