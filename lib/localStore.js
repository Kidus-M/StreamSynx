/**
 * Browser-only preferences. Everything here lives in localStorage on the
 * visitor's own device - none of it is written to Firestore.
 */

const KEYS = {
  searches: "streamsynx:recent-searches",
  continueWatching: "streamsynx:continue-watching",
  source: "streamsynx:preferred-source",
  lastEpisode: "streamsynx:last-episode",
};

const MAX_SEARCHES = 8;
const MAX_CONTINUE = 20;

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

const read = (key, fallback) => {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    // Same-tab listeners (the `storage` event only fires in other tabs).
    window.dispatchEvent(new CustomEvent("streamsynx:store", { detail: { key } }));
  } catch {
    /* quota exceeded or storage disabled - preferences are best effort */
  }
};

/** Subscribe to changes for a key, in this tab and across tabs. */
export const subscribeToStore = (key, callback) => {
  if (!canUseStorage()) return () => {};
  const onLocal = (event) => {
    if (!event.detail || event.detail.key === key) callback();
  };
  const onCrossTab = (event) => {
    if (!event.key || event.key === key) callback();
  };
  window.addEventListener("streamsynx:store", onLocal);
  window.addEventListener("storage", onCrossTab);
  return () => {
    window.removeEventListener("streamsynx:store", onLocal);
    window.removeEventListener("storage", onCrossTab);
  };
};

/* ---------------------------------- Search --------------------------------- */

export const SEARCHES_KEY = KEYS.searches;

export const getRecentSearches = () => {
  const items = read(KEYS.searches, []);
  return Array.isArray(items) ? items.filter((item) => typeof item?.query === "string") : [];
};

export const addRecentSearch = (query) => {
  const trimmed = (query || "").trim();
  if (trimmed.length < 2) return getRecentSearches();

  const existing = getRecentSearches().filter(
    (item) => item.query.toLowerCase() !== trimmed.toLowerCase()
  );
  const next = [{ query: trimmed, at: Date.now() }, ...existing].slice(0, MAX_SEARCHES);
  write(KEYS.searches, next);
  return next;
};

export const removeRecentSearch = (query) => {
  const next = getRecentSearches().filter(
    (item) => item.query.toLowerCase() !== (query || "").toLowerCase()
  );
  write(KEYS.searches, next);
  return next;
};

export const clearRecentSearches = () => {
  write(KEYS.searches, []);
  return [];
};

/* ----------------------------- Continue watching ---------------------------- */

export const CONTINUE_KEY = KEYS.continueWatching;

export const getContinueWatching = () => {
  const items = read(KEYS.continueWatching, []);
  return Array.isArray(items) ? items.filter((item) => item?.id && item?.media_type) : [];
};

export const addContinueWatching = (entry) => {
  if (!entry?.id || !entry?.media_type) return getContinueWatching();

  const key = `${entry.media_type}-${entry.id}`;
  const existing = getContinueWatching().filter(
    (item) => `${item.media_type}-${item.id}` !== key
  );
  const next = [{ ...entry, at: Date.now() }, ...existing].slice(0, MAX_CONTINUE);
  write(KEYS.continueWatching, next);
  return next;
};

export const removeContinueWatching = (mediaType, id) => {
  const key = `${mediaType}-${id}`;
  const next = getContinueWatching().filter(
    (item) => `${item.media_type}-${item.id}` !== key
  );
  write(KEYS.continueWatching, next);
  return next;
};

export const clearContinueWatching = () => {
  write(KEYS.continueWatching, []);
  return [];
};

/* ------------------------------ Player source ------------------------------ */

export const getPreferredSourceId = () => {
  const value = read(KEYS.source, null);
  return typeof value === "string" ? value : null;
};

export const setPreferredSourceId = (sourceId) => {
  if (typeof sourceId === "string" && sourceId) write(KEYS.source, sourceId);
};

/* --------------------------- Last episode per show -------------------------- */

export const getLastEpisode = (showId) => {
  const map = read(KEYS.lastEpisode, {});
  const entry = map?.[String(showId)];
  if (!entry?.season || !entry?.episode) return null;
  return entry;
};

export const setLastEpisode = (showId, season, episode) => {
  if (!showId || !season || !episode) return;
  const map = read(KEYS.lastEpisode, {}) || {};
  map[String(showId)] = { season: Number(season), episode: Number(episode), at: Date.now() };
  write(KEYS.lastEpisode, map);
};
