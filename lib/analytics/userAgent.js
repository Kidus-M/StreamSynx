/**
 * Small, dependency-free user-agent classification for analytics.
 * Good enough to split traffic by device / browser / OS / StreamSynx app —
 * not a full UA database.
 */

const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|vercel-screenshot/i;

export const isBot = (ua) => !ua || BOT_RE.test(ua);

const browserOf = (ua) => {
  if (/; wv\)/.test(ua)) return "Android WebView";
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/SamsungBrowser/.test(ua)) return "Samsung Internet";
  if (/Firefox\/|FxiOS/.test(ua)) return "Firefox";
  if (/CriOS|Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
};

const osOf = (ua) => {
  if (/Windows/.test(ua)) return "Windows";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Mac OS X|Macintosh/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Other";
};

const typeOf = (ua) => {
  if (/\bTV\b|SmartTV|SMART-TV|AFT[A-Z]|BRAVIA|GoogleTV|Android TV|Tizen|Web0S|CrKey/i.test(ua)) return "tv";
  if (/iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) return "tablet";
  if (/Mobi|iPhone|Android/.test(ua)) return "mobile";
  return "desktop";
};

export const parseUserAgent = (ua = "") => {
  const type = typeOf(ua);
  const browser = browserOf(ua);
  // The Android APKs wrap the site in a WebView; call that out as its own surface.
  const app = browser === "Android WebView" ? (type === "tv" ? "TV app" : "Android app") : "Web";
  return { type, browser, os: osOf(ua), app };
};
