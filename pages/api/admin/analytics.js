/**
 * GET /api/admin/analytics?range=24h|7d|30d|90d — everything the analytics
 * dashboard draws, aggregated server-side. Owner only (lib/server/requireAdmin).
 */
import { requireAdmin } from "../../../lib/server/requireAdmin";
import {
  acquisition,
  content,
  geography,
  liveNow,
  loyalty,
  people,
  recentSessions,
  rhythm,
  summarize,
  technology,
  timeseries,
  vitals,
} from "../../../lib/analytics/aggregate";

const RANGES = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };
const DAY_MS = 24 * 60 * 60 * 1000;
/** Hard cap on rows read per request — keeps Firestore reads bounded. */
const MAX_SESSIONS = 15000;

const readSessions = async (db, from, to) => {
  const snap = await db
    .collection("analytics_sessions")
    .where("lastSeenAt", ">=", from)
    .where("lastSeenAt", "<", to)
    .orderBy("lastSeenAt", "desc")
    .limit(MAX_SESSIONS)
    .get();
  return snap.docs.map((doc) => doc.data());
};

/** Every Firebase Auth account (paged), for signups and names. */
const readAccounts = async (auth) => {
  const accounts = new Map();
  let pageToken;
  for (let page = 0; page < 10; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const result = await auth.listUsers(1000, pageToken);
    for (const user of result.users) {
      accounts.set(user.uid, {
        email: user.email || "",
        name: user.displayName || "",
        photo: user.photoURL || "",
        createdAt: Date.parse(user.metadata.creationTime) || null,
        lastSignInAt: Date.parse(user.metadata.lastSignInTime) || null,
        provider: user.providerData?.[0]?.providerId || "password",
      });
    }
    pageToken = result.pageToken;
    if (!pageToken) break;
  }
  return accounts;
};

const readLifetime = async (db) => {
  const snap = await db.collection("analytics_users").get();
  return new Map(snap.docs.map((doc) => [doc.id, doc.data()]));
};

const readErrors = async (db, since) => {
  const snap = await db
    .collection("analytics_errors")
    .where("at", ">=", since)
    .orderBy("at", "desc")
    .limit(300)
    .get();
  const groups = new Map();
  for (const doc of snap.docs) {
    const e = doc.data();
    const key = `${e.message}|${e.source}`;
    const group = groups.get(key) || { message: e.message, source: e.source, count: 0, lastAt: 0, paths: new Set(), sessions: new Set() };
    group.count += 1;
    group.lastAt = Math.max(group.lastAt, e.at);
    if (e.path) group.paths.add(e.path);
    group.sessions.add(e.sid);
    groups.set(key, group);
  }
  return {
    total: snap.size,
    groups: [...groups.values()]
      .map((g) => ({ ...g, paths: [...g.paths].slice(0, 4), sessions: g.sessions.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25),
  };
};

const countCollection = async (db, name) => {
  try {
    const snap = await db.collection(name).count().get();
    return snap.data().count;
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  const gate = await requireAdmin(req, res);
  if (!gate) return undefined;
  const { db, auth } = gate.admin;

  const rangeKey = RANGES[req.query.range] ? req.query.range : "7d";
  const days = RANGES[rangeKey];
  const now = Date.now();
  const since = now - days * DAY_MS;
  const prevSince = since - days * DAY_MS;

  try {
    const [sessions, previous, accounts, lifetime, errors, rooms] = await Promise.all([
      readSessions(db, since, now + 60000),
      readSessions(db, prevSince, since),
      readAccounts(auth),
      readLifetime(db),
      readErrors(db, since),
      countCollection(db, "rooms"),
    ]);

    const accountList = [...accounts.values()];
    const signupTimes = accountList.map((a) => a.createdAt).filter((t) => t && t >= since);
    const prevSignups = accountList.filter((a) => a.createdAt && a.createdAt >= prevSince && a.createdAt < since).length;

    // Accounts that never show up in analytics yet still matter (signed up, never returned).
    const dormant = accountList.filter((a) => !a.lastSignInAt || a.lastSignInAt < now - 30 * DAY_MS).length;
    const providers = new Map();
    for (const a of accountList) providers.set(a.provider, (providers.get(a.provider) || 0) + 1);

    const lifetimeLeaders = [...lifetime.values()]
      .map((u) => ({
        uid: u.uid,
        email: u.email || accounts.get(u.uid)?.email || "",
        name: u.name || accounts.get(u.uid)?.name || "",
        activeMs: u.activeMs || 0,
        watchMs: u.watchMs || 0,
        sessions: u.sessions || 0,
        lastSeenAt: u.lastSeenAt || 0,
        place: [u.lastGeo?.city, u.lastGeo?.country].filter(Boolean).join(", "),
      }))
      .sort((a, b) => b.watchMs + b.activeMs - (a.watchMs + a.activeMs))
      .slice(0, 25);

    return res.status(200).json({
      generatedAt: now,
      range: rangeKey,
      days,
      since,
      truncated: sessions.length >= MAX_SESSIONS,
      summary: { ...summarize(sessions), signups: signupTimes.length },
      previous: { ...summarize(previous), signups: prevSignups },
      series: timeseries(sessions, since, now, signupTimes),
      live: liveNow(sessions, now),
      geo: geography(sessions),
      people: people(sessions, lifetime, accounts).slice(0, 150),
      lifetimeLeaders,
      content: content(sessions),
      acquisition: acquisition(sessions),
      tech: technology(sessions),
      rhythm: rhythm(sessions),
      vitals: vitals(sessions),
      loyalty: loyalty(sessions, days),
      errors,
      recent: recentSessions(sessions),
      accounts: {
        total: accounts.size,
        newInRange: signupTimes.length,
        dormant,
        tracked: lifetime.size,
        rooms,
        providers: [...providers.entries()].map(([key, value]) => ({ key, value })),
      },
    });
  } catch (error) {
    console.error("[admin/analytics]", error);
    // Firestore reports a missing composite index with a console link in the message.
    return res.status(500).json({ error: error?.message || "Failed to load analytics." });
  }
}
