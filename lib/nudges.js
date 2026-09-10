/**
 * lib/nudges.js — the rules behind the small prompts that point people at
 * features they would otherwise never find (taste picks, Discover, having an
 * account at all).
 *
 * The hard part of a nudge is not showing it, it is not showing it too often.
 * Everything here exists to keep that honest:
 *
 *   - one nudge per session, ever;
 *   - a global gap between nudges, so two visits in a row are never both nudged;
 *   - a per-nudge cooldown and a lifetime show cap, after which it stays gone;
 *   - "don't show this again" is permanent;
 *   - anything that reads as a task (a player, a login form, a watch party) is
 *     a quiet route where nothing is allowed to appear.
 *
 * State lives in localStorage on the visitor's own device — nothing is written
 * to Firestore, and a cleared browser simply starts the counters over.
 */

const STORE_KEY = "streamsynx:nudges";
const SESSION_KEY = "streamsynx:nudge-session";
const STATE_VERSION = 1;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const NUDGE_ACCOUNT = "account";
export const NUDGE_TASTE = "taste";
export const NUDGE_DISCOVER = "discover";

/** Minimum quiet time between two nudges of any kind. */
const GLOBAL_GAP_MS = 20 * HOUR;

/** How long someone has to be on the site before anything appears. */
export const NUDGE_DELAY_MS = 20 * 1000;

/**
 * Order matters: the first eligible entry wins, so the prompt that asks for
 * the least ("you already have picks, go look at Discover") never gets buried
 * behind the one that asks for more.
 */
const NUDGES = [
  {
    id: NUDGE_TASTE,
    audience: "user",
    // Needs picks it does not have yet.
    when: ({ hasTastePicks }) => hasTastePicks === false,
    maxShows: 4,
    cooldownMs: 2 * DAY,
    hideOn: ["/profile"],
  },
  {
    id: NUDGE_DISCOVER,
    audience: "user",
    // Picks are in, but Discover has never been opened.
    when: ({ hasTastePicks, goals }) => hasTastePicks === true && !goals[NUDGE_DISCOVER],
    maxShows: 3,
    cooldownMs: 3 * DAY,
    hideOn: ["/buddies"],
  },
  {
    id: NUDGE_ACCOUNT,
    audience: "guest",
    when: () => true,
    maxShows: 3,
    cooldownMs: 3 * DAY,
    hideOn: [],
  },
];

/**
 * Routes where a prompt would interrupt something. Prefix-matched against
 * `router.pathname`, so the dynamic player and room routes are covered too.
 */
const QUIET_ROUTES = [
  "/login",
  "/signup",
  "/watch",
  "/watchTv",
  "/rooms/[roomId]",
  "/open",
  "/download",
  "/404",
];

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

const EMPTY_STATE = { v: STATE_VERSION, lastShownAt: 0, goals: {}, items: {} };

const readState = () => {
  if (!canUseStorage()) return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== STATE_VERSION) return EMPTY_STATE;
    return {
      v: STATE_VERSION,
      lastShownAt: Number(parsed.lastShownAt) || 0,
      goals: parsed.goals && typeof parsed.goals === "object" ? parsed.goals : {},
      items: parsed.items && typeof parsed.items === "object" ? parsed.items : {},
    };
  } catch {
    return EMPTY_STATE;
  }
};

const writeState = (state) => {
  if (!canUseStorage()) return state;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked — nudges are best effort, never a hard failure */
  }
  return state;
};

const itemOf = (state, id) => state.items[id] || { shows: 0, lastAt: 0, off: false };

const updateItem = (id, changes) => {
  const state = readState();
  const next = {
    ...state,
    items: { ...state.items, [id]: { ...itemOf(state, id), ...changes } },
  };
  return writeState(next);
};

/* --------------------------------- Session -------------------------------- */

const sessionSpent = () => {
  if (typeof window === "undefined" || !window.sessionStorage) return false;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
};

const spendSession = () => {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* private mode — the localStorage caps still apply */
  }
};

/* ---------------------------------- Rules --------------------------------- */

/** True on routes where nothing should ever pop up. */
export const isQuietRoute = (pathname) =>
  !pathname || QUIET_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

/**
 * Picks the one nudge that is allowed to show right now, or null.
 *
 * `hasTastePicks` is deliberately tri-state: `null` means "not looked up yet",
 * and the taste and Discover prompts both stay silent until it resolves rather
 * than guessing and showing the wrong one.
 */
export const chooseNudge = ({ pathname, signedIn, hasTastePicks = null, now = Date.now() }) => {
  if (isQuietRoute(pathname) || sessionSpent()) return null;

  const state = readState();
  if (state.lastShownAt && now - state.lastShownAt < GLOBAL_GAP_MS) return null;

  const audience = signedIn ? "user" : "guest";

  const match = NUDGES.find((nudge) => {
    if (nudge.audience !== audience) return false;
    if (nudge.hideOn.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
      return false;
    }

    const item = itemOf(state, nudge.id);
    if (item.off) return false;
    if (item.shows >= nudge.maxShows) return false;
    if (item.lastAt && now - item.lastAt < nudge.cooldownMs) return false;

    return nudge.when({ hasTastePicks, goals: state.goals });
  });

  return match ? match.id : null;
};

/** Records a nudge as shown: burns the session and starts its cooldown. */
export const recordNudgeShown = (id, now = Date.now()) => {
  const state = readState();
  const item = itemOf(state, id);
  writeState({
    ...state,
    lastShownAt: now,
    items: { ...state.items, [id]: { ...item, shows: item.shows + 1, lastAt: now } },
  });
  spendSession();
};

/** "Don't show this again" — retires the nudge for good on this device. */
export const disableNudge = (id) => updateItem(id, { off: true });

/**
 * Marks the thing a nudge was asking for as done, so it stops asking. Used for
 * goals Firestore cannot tell us about, like "has opened Discover".
 */
export const markNudgeGoal = (id) => {
  const state = readState();
  if (state.goals[id]) return state;
  return writeState({ ...state, goals: { ...state.goals, [id]: true } });
};

/** Test/debug helper: wipes every counter and cooldown. */
export const resetNudges = () => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(STORE_KEY);
    window.sessionStorage?.removeItem(SESSION_KEY);
  } catch {
    /* nothing to clean up */
  }
};
