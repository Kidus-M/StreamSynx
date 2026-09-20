/**
 * components/NudgeHost.jsx — the one place that advertises features people
 * would otherwise never stumble into: taste picks, Discover, and having an
 * account at all.
 *
 * It renders a small card in the corner, never a blocking dialog: the site
 * stays usable behind it and it can be waved away in one click. All of the
 * "is this welcome right now" logic lives in lib/nudges.js — this component
 * only asks, waits and draws.
 *
 * Timing rules enforced here (the frequency caps live in lib/nudges.js):
 *   - nothing before NUDGE_DELAY_MS on the site, and never on a quiet route;
 *   - nothing until the visitor has actually done something (scroll, tap, key),
 *     so a parked tab is left alone;
 *   - nothing while the tab is in the background.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import { FiArrowRight, FiFilm, FiUserPlus, FiUsers, FiX } from "react-icons/fi";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { loginHref, useAuth } from "../lib/auth";
import { countPicks, readTastePicks } from "../lib/tasteProfile";
import {
  NUDGE_ACCOUNT,
  NUDGE_DELAY_MS,
  NUDGE_DISCOVER,
  NUDGE_TASTE,
  chooseNudge,
  disableNudge,
  hasEligibleNudge,
  isQuietRoute,
  recordNudgeShown,
} from "../lib/nudges";

/** How often eligibility is re-checked, so navigation is picked up too. */
const TICK_MS = 8000;

/**
 * Copy for each prompt. `href` is a function because the guest prompt has to
 * send people back to wherever they already were after signing in.
 */
const CONTENT = {
  [NUDGE_TASTE]: {
    icon: FiFilm,
    eyebrow: "Your taste profile",
    title: "Four films, four series — that’s you",
    body: "Pick the titles that represent you. They sit on your profile, and they are what we match other viewers against.",
    cta: { label: "Choose my picks", href: () => "/profile#taste" },
  },
  [NUDGE_DISCOVER]: {
    icon: FiUsers,
    eyebrow: "Discover",
    title: "See who shares your taste",
    body: "Your picks are in. Discover ranks other viewers by how much your titles, genres, filmmakers and eras overlap.",
    cta: { label: "Open Discover", href: () => "/buddies?tab=discover" },
  },
  [NUDGE_ACCOUNT]: {
    icon: FiUserPlus,
    eyebrow: "Free account",
    title: "Save what you watch",
    body: "An account keeps your watchlist and history on every device, unlocks watch parties, and matches you with viewers who like what you like.",
    cta: { label: "Create account", href: () => "/signup" },
    secondary: { label: "Sign in", href: (asPath) => loginHref(asPath) },
  },
};

const NudgeCard = ({ id, asPath, onDismiss, onOptOut, onAct }) => {
  const content = CONTENT[id];
  if (!content) return null;

  const Icon = content.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      role="dialog"
      aria-modal="false"
      aria-label={content.title}
      className="glass-card-elevated pointer-events-auto w-full overflow-hidden p-4 sm:w-[356px] sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-inset ring-accent/25">
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="section-label">{content.eyebrow}</p>
          <h2 className="mt-1 text-[15px] font-semibold leading-snug tracking-tight text-textprimary">
            {content.title}
          </h2>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 p-1.5 text-textsecondary transition-colors hover:text-textprimary"
        >
          <FiX size={16} />
        </button>
      </div>

      <p className="mt-2.5 text-[13px] leading-relaxed text-textsecondary">{content.body}</p>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={content.cta.href(asPath)}
          onClick={onAct}
          className="btn-primary flex-1 px-4 py-2.5 text-[13px]"
        >
          {content.cta.label}
          <FiArrowRight className="h-3.5 w-3.5" />
        </Link>

        {content.secondary ? (
          <Link
            href={content.secondary.href(asPath)}
            onClick={onAct}
            className="btn-ghost px-3.5 py-2.5 text-[13px]"
          >
            {content.secondary.label}
          </Link>
        ) : (
          <button type="button" onClick={onDismiss} className="btn-ghost px-3.5 py-2.5 text-[13px]">
            Later
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onOptOut}
        className="mt-3 text-[11px] text-textsecondary/70 underline-offset-2 transition-colors hover:text-textsecondary hover:underline"
      >
        Don’t show this again
      </button>
    </motion.div>
  );
};

export default function NudgeHost() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [nudgeId, setNudgeId] = useState(null);

  // Tri-state so the taste and Discover prompts stay silent until we know
  // which of the two applies: null = not looked up, true/false = known.
  const picks = useRef({ uid: null, status: "idle", hasPicks: null });
  const arrivedAt = useRef(Date.now());
  const interacted = useRef(false);

  // Read by the timer instead of closing over `router`, whose identity changes
  // on every navigation — the interval would otherwise restart, and someone
  // clicking around faster than the tick would never be evaluated at all.
  const route = useRef({ pathname: router.pathname, asPath: router.asPath });
  route.current = { pathname: router.pathname, asPath: router.asPath };

  // A parked tab is not an audience. Wait for a sign of life first.
  useEffect(() => {
    const events = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"];
    const onInteract = () => {
      interacted.current = true;
      events.forEach((event) => window.removeEventListener(event, onInteract));
    };
    events.forEach((event) => window.addEventListener(event, onInteract, { passive: true }));
    return () => events.forEach((event) => window.removeEventListener(event, onInteract));
  }, []);

  // Signing in or out invalidates what we know about someone's picks.
  useEffect(() => {
    picks.current = { uid: user?.uid || null, status: "idle", hasPicks: null };
  }, [user?.uid]);

  const loadPicks = useCallback(async (uid) => {
    picks.current = { uid, status: "loading", hasPicks: null };
    try {
      const snapshot = await getDoc(doc(db, "users", uid));
      const data = snapshot.exists() ? snapshot.data() : {};
      const hasPicks = data.hasTastePicks === true || countPicks(readTastePicks(data)) > 0;
      if (picks.current.uid === uid) picks.current = { uid, status: "ready", hasPicks };
    } catch (error) {
      console.error("Could not check taste picks for nudges:", error);
      // Unknown means silence, not a guess.
      if (picks.current.uid === uid) picks.current = { uid, status: "error", hasPicks: null };
    }
  }, []);

  useEffect(() => {
    if (loading || nudgeId) return undefined;

    const evaluate = () => {
      if (document.hidden || !interacted.current) return;
      if (Date.now() - arrivedAt.current < NUDGE_DELAY_MS) return;
      // Every overlay in the app locks body scroll, so this stands in for
      // "a modal, the search palette or the mobile drawer is open".
      if (document.body.style.overflow === "hidden") return;

      const { pathname } = route.current;
      if (isQuietRoute(pathname)) return;
      // Cheap gate first: no Firestore read for someone whose prompts are
      // already spent, snoozed, or used up for this session.
      if (!hasEligibleNudge({ pathname, signedIn: !!user })) return;

      let hasTastePicks = null;
      if (user) {
        if (picks.current.status === "idle") {
          loadPicks(user.uid);
          return;
        }
        if (picks.current.status !== "ready") return;
        hasTastePicks = picks.current.hasPicks;
      }

      const id = chooseNudge({ pathname, signedIn: !!user, hasTastePicks });
      if (!id) return;

      // Counted on display, not on dismissal, so a prompt someone ignores
      // still uses up one of its turns.
      recordNudgeShown(id);
      setNudgeId(id);
    };

    const timer = setInterval(evaluate, TICK_MS);
    return () => clearInterval(timer);
  }, [loading, nudgeId, user, loadPicks]);

  // Never leave a card hanging over a player or the page it is advertising.
  useEffect(() => {
    if (nudgeId && isQuietRoute(router.pathname)) setNudgeId(null);
  }, [nudgeId, router.pathname]);

  useEffect(() => {
    if (!nudgeId) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setNudgeId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nudgeId]);

  const dismiss = useCallback(() => setNudgeId(null), []);

  const optOut = useCallback(() => {
    if (nudgeId) disableNudge(nudgeId);
    setNudgeId(null);
  }, [nudgeId]);

  // Sits above the assistant launcher, which owns the corner itself.
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[4.75rem] z-[45] flex justify-center sm:inset-x-auto sm:bottom-[5.25rem] sm:right-5 sm:justify-end">
      <AnimatePresence>
        {nudgeId && (
          <NudgeCard
            key={nudgeId}
            id={nudgeId}
            asPath={router.asPath}
            onDismiss={dismiss}
            onOptOut={optOut}
            onAct={dismiss}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
