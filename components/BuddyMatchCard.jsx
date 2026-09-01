// components/BuddyMatchCard.jsx — one ranked taste match in the Discover tab.
import React from "react";
import { FiUserPlus, FiCheck, FiClock } from "react-icons/fi";
import { posterUrl } from "../lib/tmdb";
import { pickKey } from "../lib/tasteProfile";

const RING_SIZE = 46;
const RING_RADIUS = 19;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Circular match percentage. The arc is the quickest read on the card. */
export const MatchRing = ({ percent, size = RING_SIZE }) => {
  const scale = size / RING_SIZE;
  const offset = RING_CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, percent)) / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth="3"
          className="stroke-white/[0.08]"
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="stroke-accent transition-[stroke-dashoffset] duration-700 ease-out-expo"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-semibold tabular-nums text-accent"
        style={{ fontSize: 13 * scale }}
      >
        {percent}
        <span style={{ fontSize: 8 * scale }}>%</span>
      </span>
    </div>
  );
};

/** Small poster row so a match is judged on titles, not just a number. */
const PosterStrip = ({ picks, sharedKeys }) => {
  const all = [...(picks?.movies || []), ...(picks?.shows || [])].slice(0, 8);
  if (!all.length) return null;

  return (
    <div className="mt-3 flex gap-1.5 overflow-hidden">
      {all.map((pick) => {
        const poster = posterUrl(pick.poster_path);
        const shared = sharedKeys.has(pickKey(pick));
        return (
          <div
            key={pickKey(pick)}
            title={pick.title}
            className={`h-16 w-[42px] shrink-0 overflow-hidden rounded-md border bg-secondary ${
              shared ? "border-accent/70" : "border-white/[0.06]"
            }`}
          >
            {poster && <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover" />}
          </div>
        );
      })}
    </div>
  );
};

const BuddyMatchCard = ({ match, onOpen, onAddFriend, requestSent, isFriend, isLoading }) => {
  const { user, percent, tier, reasons, sharedTitles } = match;
  const sharedKeys = new Set(sharedTitles.map(pickKey));

  const addButton = () => {
    if (isFriend) {
      return (
        <span className="btn-ghost pointer-events-none px-3 py-2 text-xs">
          <FiCheck className="h-3.5 w-3.5" /> Buddies
        </span>
      );
    }
    if (requestSent) {
      return (
        <span className="btn-ghost pointer-events-none px-3 py-2 text-xs">
          <FiClock className="h-3.5 w-3.5" /> Requested
        </span>
      );
    }
    return (
      <button
        type="button"
        disabled={isLoading}
        onClick={(event) => {
          event.stopPropagation();
          onAddFriend(user.uid);
        }}
        className="btn-primary px-3 py-2 text-xs"
      >
        <FiUserPlus className="h-3.5 w-3.5" /> Add
      </button>
    );
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(match)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(match);
        }
      }}
      className="surface cursor-pointer p-4 text-left transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]"
    >
      <div className="flex items-start gap-3">
        <img
          src={
            user.avatar ||
            "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
          }
          alt=""
          className="h-11 w-11 shrink-0 rounded-full border border-white/10 object-cover"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-textprimary">
            {user.username || "Unknown viewer"}
          </p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-accent">
            {tier?.label}
          </p>
        </div>

        <MatchRing percent={percent} />
      </div>

      <ul className="mt-3 space-y-1">
        {reasons.slice(0, 3).map((reason) => (
          <li key={reason.kind} className="truncate text-xs text-textsecondary">
            {reason.text}
          </li>
        ))}
      </ul>

      <PosterStrip picks={user.tastePicks} sharedKeys={sharedKeys} />

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-[11px] text-textsecondary">Tap for their profile</span>
        {addButton()}
      </div>
    </article>
  );
};

export default BuddyMatchCard;
