/**
 * lib/analytics/tracker.js — first-party analytics in the browser.
 *
 * Batches what a visit looks like — page views, visible time, watch time per
 * title, Core Web Vitals and JS errors — and ships it to /api/track every
 * FLUSH_MS and when the tab is hidden. The server adds geo and the account.
 *
 *   visitor (vid)  random id in localStorage, stable per browser
 *   session (sid)  random id in sessionStorage, rolls after IDLE_MS of nothing
 *
 * Everything is best effort: no call here may throw into the app.
 */
import { auth } from "../../firebase";

const ENDPOINT = "/api/track";
const VID_KEY = "streamsynx:vid";
const SID_KEY = "streamsynx:sid";
const FLUSH_MS = 30 * 1000;
const IDLE_MS = 30 * 60 * 1000;
const EXCLUDED = /^\/admin(\/|$)/;

let started = false;
let queue = [];
let sid = null;
let vid = null;
let visibleSince = null;
let token = null;
let flushTimer = null;

const randomId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

const safe = (fn) => {
  try {
    return fn();
  } catch {
    return null;
  }
};

const currentPath = () => window.location.pathname;
const isExcluded = () => EXCLUDED.test(currentPath());

/** Returns the visitor id and whether it was just created. */
const ensureVisitor = () => {
  const existing = safe(() => window.localStorage.getItem(VID_KEY));
  if (existing) return { id: existing, isNew: false };
  const id = randomId();
  safe(() => window.localStorage.setItem(VID_KEY, id));
  return { id, isNew: true };
};

/** Reuses the tab's session unless it has been idle; queues a `start` for new ones. */
const ensureSession = (isNewVisitor = false) => {
  const now = Date.now();
  const stored = safe(() => JSON.parse(window.sessionStorage.getItem(SID_KEY) || "null"));
  if (stored?.id && now - stored.last < IDLE_MS) {
    sid = stored.id;
  } else {
    sid = randomId();
    const params = new URLSearchParams(window.location.search);
    const date = new Date();
    queue.push({
      t: "start",
      at: now,
      path: currentPath(),
      ref: document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : "",
      utm: {
        source: params.get("utm_source") || "",
        medium: params.get("utm_medium") || "",
        campaign: params.get("utm_campaign") || "",
      },
      screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      lang: navigator.language || "",
      tz: safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone) || "",
      localHour: date.getHours(),
      localDow: date.getDay(),
      newVisitor: isNewVisitor,
    });
  }
  safe(() => window.sessionStorage.setItem(SID_KEY, JSON.stringify({ id: sid, last: now })));
};

const touchSession = () => {
  safe(() => window.sessionStorage.setItem(SID_KEY, JSON.stringify({ id: sid, last: Date.now() })));
};

/** Moves visible time accumulated so far into the queue. */
const takeVisibleTime = () => {
  if (visibleSince === null) return;
  const now = Date.now();
  const ms = now - visibleSince;
  visibleSince = now;
  if (ms > 0) queue.push({ t: "hb", ms });
};

const refreshToken = async () => {
  const user = auth.currentUser;
  token = user ? await user.getIdToken().catch(() => null) : null;
};

const send = (useBeacon) => {
  if (!queue.length || !sid) return;
  const payload = JSON.stringify({ sid, vid, token, events: queue });
  queue = [];
  touchSession();
  if (useBeacon && navigator.sendBeacon) {
    // text/plain keeps the beacon a "simple" request; the route parses strings.
    if (navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "text/plain" }))) return;
  }
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
};

const flush = async () => {
  takeVisibleTime();
  if (!queue.length) return;
  await refreshToken();
  send(false);
};

/** Synchronous flush for pagehide — uses the last token we already have. */
const flushNow = () => {
  takeVisibleTime();
  send(true);
};

const onVisibility = () => {
  if (document.visibilityState === "visible") {
    // Coming back after a long absence starts a new session.
    ensureSession(false);
    visibleSince = Date.now();
  } else {
    flushNow();
    visibleSince = null;
  }
};

/** Called by _app on every route change. */
export const trackPageview = (path) => {
  if (!started || EXCLUDED.test(path)) return;
  queue.push({ t: "pv", path });
};

/** Called by the watch-time timer: `ms` of visible player time for a title. */
export const trackWatch = (meta, ms) => {
  if (!started || !meta?.id || ms <= 0) return;
  queue.push({
    t: "watch",
    id: meta.id,
    mt: meta.media_type,
    title: meta.title || "",
    season: meta.season || null,
    episode: meta.episode || null,
    ms,
  });
};

/** Wired to Next's reportWebVitals in _app. */
export const trackVital = (metric) => {
  // TTFB/FCP can arrive before initAnalytics runs; queue them anyway — they
  // go out with the first flush (and are simply never sent on /admin pages).
  if (!metric?.name || metric.label === "custom" || queue.length > 100) return;
  queue.push({ t: "vital", name: metric.name, value: metric.value });
};

const trackError = (message, source) => {
  if (!started || !message) return;
  queue.push({ t: "err", message: String(message), source: source || "", path: currentPath() });
};

export const initAnalytics = () => {
  if (started || typeof window === "undefined") return;
  if (isExcluded() || navigator.webdriver) return;
  started = true;

  const visitor = ensureVisitor();
  vid = visitor.id;
  ensureSession(visitor.isNew);
  queue.push({ t: "pv", path: currentPath() });
  visibleSince = document.visibilityState === "visible" ? Date.now() : null;

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", flushNow);
  window.addEventListener("error", (event) =>
    trackError(event.message, event.filename ? `${event.filename}:${event.lineno}` : "")
  );
  window.addEventListener("unhandledrejection", (event) =>
    trackError(event.reason?.message || String(event.reason), "unhandledrejection")
  );

  flushTimer = setInterval(() => {
    flush().catch(() => {});
  }, FLUSH_MS);
  // First batch soon after load so short visits still register.
  setTimeout(() => flush().catch(() => {}), 4000);
};

export const stopAnalytics = () => {
  if (flushTimer) clearInterval(flushTimer);
};
