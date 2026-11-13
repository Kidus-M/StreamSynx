/**
 * POST /api/track — first-party analytics ingestion.
 *
 * The browser tracker (lib/analytics/tracker.js) batches events and sends them
 * here with sendBeacon/fetch. This route adds what only the server knows —
 * where the request came from (Vercel's geo headers) — and folds the batch into
 * three Firestore collections:
 *
 *   analytics_sessions/{sid}  one row per visit: geo, device, pages, active and
 *                             watch time, titles, web vitals
 *   analytics_users/{uid}     running totals per signed-in account
 *   analytics_errors/{auto}   client-side JS errors (capped per batch)
 *
 * This is a public endpoint, so everything in the body is untrusted: ids are
 * pattern-checked, strings truncated, durations clamped, and the account is
 * taken only from a verified Firebase ID token, never from a claimed uid.
 */
import { FieldValue } from "firebase-admin/firestore";
import { getAdmin } from "../../lib/server/firebaseAdmin";
import { parseUserAgent, isBot } from "../../lib/analytics/userAgent";

export const config = { api: { bodyParser: { sizeLimit: "64kb" } } };

const ID_RE = /^[a-z0-9-]{8,48}$/i;
const MAX_EVENTS = 60;
/** The tracker flushes at most every ~30s; anything above this is not one flush. */
const MAX_DELTA_MS = 5 * 60 * 1000;
const VITALS = new Set(["LCP", "FCP", "CLS", "INP", "TTFB", "FID"]);

const str = (value, max = 200) => (typeof value === "string" ? value.slice(0, max) : "");
const num = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(min, n));
};

/** Paths only — drop query strings (they can carry ids/tokens) and cap length. */
const cleanPath = (value) => {
  const path = str(value, 300).split("?")[0].split("#")[0];
  return path.startsWith("/") ? path.slice(0, 120) : "";
};

/** Firestore map keys cannot be empty and are nicer without dots/slashes. */
const pathKey = (path) => (path === "/" ? "~" : path.replace(/[./]/g, "~").slice(0, 120));

const header = (req, name) => {
  const value = req.headers[name];
  if (!value) return "";
  try {
    return decodeURIComponent(String(value));
  } catch {
    return String(value);
  }
};

const readGeo = (req) => {
  const lat = parseFloat(header(req, "x-vercel-ip-latitude"));
  const lon = parseFloat(header(req, "x-vercel-ip-longitude"));
  return {
    country: header(req, "x-vercel-ip-country").slice(0, 2).toUpperCase() || "XX",
    region: header(req, "x-vercel-ip-country-region").slice(0, 40),
    city: header(req, "x-vercel-ip-city").slice(0, 80),
    lat: Number.isFinite(lat) ? Math.round(lat * 100) / 100 : null,
    lon: Number.isFinite(lon) ? Math.round(lon * 100) / 100 : null,
    tz: header(req, "x-vercel-ip-timezone").slice(0, 60),
  };
};

const refHostOf = (ref) => {
  if (!ref) return "";
  try {
    return new URL(ref).hostname.replace(/^www\./, "").slice(0, 80);
  } catch {
    return "";
  }
};

const verifyUser = async (auth, idToken) => {
  if (typeof idToken !== "string" || idToken.length < 100 || idToken.length > 4096) return null;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email || "", name: decoded.name || "" };
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).end();
    }
  }
  if (!body || !ID_RE.test(body.sid || "") || !ID_RE.test(body.vid || "")) {
    return res.status(400).end();
  }

  const ua = str(req.headers["user-agent"], 400);
  if (isBot(ua)) return res.status(204).end();

  const admin = getAdmin();
  if (!admin) return res.status(204).end(); // analytics not configured; never break the app

  const events = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
  const user = await verifyUser(admin.auth, body.token);
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);

  const session = {
    sid: body.sid,
    vid: body.vid,
    lastSeenAt: now,
    day,
  };
  if (user) {
    session.uid = user.uid;
    session.email = user.email;
    session.name = user.name;
  }

  let activeMs = 0;
  let watchMs = 0;
  let pageviews = 0;
  const paths = {};
  const titles = {};
  const vitals = {};
  const errors = [];

  for (const event of events) {
    if (!event || typeof event !== "object") continue;
    switch (event.t) {
      case "start": {
        const ref = str(event.ref, 300);
        session.startedAt = num(event.at, now - MAX_DELTA_MS, now) || now;
        session.entry = cleanPath(event.path);
        session.referrer = refHostOf(ref);
        session.utm = {
          source: str(event.utm?.source, 60),
          medium: str(event.utm?.medium, 60),
          campaign: str(event.utm?.campaign, 80),
        };
        session.screen = str(event.screen, 20);
        session.lang = str(event.lang, 20);
        session.tz = str(event.tz, 60);
        session.localHour = Math.round(num(event.localHour, 0, 23));
        session.localDow = Math.round(num(event.localDow, 0, 6));
        session.newVisitor = event.newVisitor === true;
        session.geo = readGeo(req);
        session.device = parseUserAgent(ua);
        break;
      }
      case "pv": {
        const path = cleanPath(event.path);
        if (!path) break;
        pageviews += 1;
        paths[pathKey(path)] = FieldValue.increment(1);
        session.exit = path;
        break;
      }
      case "hb":
        activeMs += num(event.ms, 0, MAX_DELTA_MS);
        break;
      case "watch": {
        const id = Math.round(num(event.id, 0, 1e9));
        const mediaType = event.mt === "tv" ? "tv" : event.mt === "movie" ? "movie" : "";
        const ms = num(event.ms, 0, MAX_DELTA_MS);
        if (!id || !mediaType || !ms) break;
        watchMs += ms;
        const key = `${mediaType}_${id}`;
        const prev = titles[key];
        titles[key] = {
          id,
          mt: mediaType,
          title: str(event.title, 120),
          season: event.season ? Math.round(num(event.season, 0, 200)) : null,
          episode: event.episode ? Math.round(num(event.episode, 0, 5000)) : null,
          ms: (prev?.ms || 0) + ms,
        };
        break;
      }
      case "vital": {
        const name = str(event.name, 8);
        if (VITALS.has(name) && !(name in vitals)) vitals[name] = num(event.value, 0, 120000);
        break;
      }
      case "err":
        if (errors.length < 5) {
          errors.push({
            at: now,
            message: str(event.message, 300),
            source: str(event.source, 200),
            path: cleanPath(event.path),
          });
        }
        break;
      default:
        break;
    }
  }

  const sessionWrite = {
    ...session,
    activeMs: FieldValue.increment(activeMs),
    watchMs: FieldValue.increment(watchMs),
    pageviews: FieldValue.increment(pageviews),
  };
  if (Object.keys(paths).length) sessionWrite.paths = paths;
  if (Object.keys(titles).length) {
    sessionWrite.titles = Object.fromEntries(
      Object.entries(titles).map(([key, t]) => [key, { ...t, ms: FieldValue.increment(t.ms) }])
    );
  }
  if (Object.keys(vitals).length) sessionWrite.vitals = vitals;
  if (errors.length) sessionWrite.errors = FieldValue.increment(errors.length);

  const { db } = admin;
  const batch = db.batch();
  batch.set(db.collection("analytics_sessions").doc(body.sid), sessionWrite, { merge: true });

  if (user) {
    const userWrite = {
      uid: user.uid,
      email: user.email,
      name: user.name,
      lastSeenAt: now,
      activeMs: FieldValue.increment(activeMs),
      watchMs: FieldValue.increment(watchMs),
      pageviews: FieldValue.increment(pageviews),
    };
    if (session.startedAt) {
      userWrite.sessions = FieldValue.increment(1);
      userWrite.lastGeo = session.geo;
      userWrite.lastDevice = session.device;
    }
    batch.set(db.collection("analytics_users").doc(user.uid), userWrite, { merge: true });
  }

  for (const error of errors) {
    batch.set(db.collection("analytics_errors").doc(), {
      ...error,
      sid: body.sid,
      uid: user?.uid || null,
      browser: session.device?.browser || parseUserAgent(ua).browser,
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    console.error("[track] write failed", error?.message);
    return res.status(500).end();
  }
  return res.status(204).end();
}
