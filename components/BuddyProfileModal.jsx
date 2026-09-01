// components/BuddyProfileModal.jsx — what a match looks like up close: their
// stats, the eight titles that represent them, why you two matched, and the
// button that turns them into a buddy.
import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IoClose } from "react-icons/io5";
import { FiUserPlus, FiCheck, FiClock } from "react-icons/fi";
import { MatchRing } from "./BuddyMatchCard";
import { TastePicksStrip } from "./TastePicks";
import { pickKey, genreNamesFor } from "../lib/tasteProfile";

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: 30, scale: 0.98, transition: { duration: 0.2 } },
};

const STAT_FIELDS = [
  { key: "moviesWatched", label: "Films watched" },
  { key: "episodesWatched", label: "Episodes" },
  { key: "watchlist", label: "On watchlist" },
  { key: "favoriteMovies", label: "Favorite films" },
  { key: "favoriteShows", label: "Favorite series" },
  { key: "buddies", label: "Buddies" },
];

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
    <p className="text-[10px] uppercase tracking-[0.14em] text-textsecondary">{label}</p>
    <p className="mt-1 text-xl font-semibold tabular-nums text-textprimary">{value}</p>
  </div>
);

const BuddyProfileModal = ({ match, onClose, onAddFriend, requestSent, isFriend, isLoading }) => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!match) return null;

  const { user, percent, tier, reasons, sharedTitles, sharedGenres, sharedPeople, sharedThemes } =
    match;
  const stats = user.publicStats || {};
  const sharedKeys = new Set(sharedTitles.map(pickKey));
  const theirGenres = genreNamesFor(user.tasteProfile?.topGenres || []).slice(0, 4);

  const action = () => {
    if (isFriend) {
      return (
        <span className="btn-ghost pointer-events-none">
          <FiCheck className="h-4 w-4" /> Already buddies
        </span>
      );
    }
    if (requestSent) {
      return (
        <span className="btn-ghost pointer-events-none">
          <FiClock className="h-4 w-4" /> Request sent
        </span>
      );
    }
    return (
      <button
        type="button"
        disabled={isLoading}
        onClick={() => onAddFriend(user.uid)}
        className="btn-primary"
      >
        <FiUserPlus className="h-4 w-4" /> Add buddy
      </button>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
        className="fixed inset-0 z-[65] flex items-center justify-center bg-primary/80 p-4 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-label={`${user.username || "Viewer"}'s profile`}
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(event) => event.stopPropagation()}
          className="glass-card-elevated flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start gap-4 border-b border-white/[0.06] p-5">
            <img
              src={
                user.avatar ||
                "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
              }
              alt=""
              className="h-14 w-14 shrink-0 rounded-full border border-white/10 object-cover"
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold text-textprimary">
                {user.username || "Unknown viewer"}
              </h2>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-accent">
                {tier?.label}
              </p>
              {theirGenres.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {theirGenres.map((name) => (
                    <span key={name} className="chip py-1 text-[10px]">
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <MatchRing percent={percent} size={56} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 text-textsecondary transition-colors hover:text-textprimary"
            >
              <IoClose size={22} />
            </button>
          </div>

          {/* Body */}
          <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-5">
            <section>
              <h3 className="section-label mb-2.5">Why you match</h3>
              <ul className="space-y-1.5">
                {reasons.map((reason) => (
                  <li key={reason.kind} className="flex gap-2 text-sm text-textsecondary">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {reason.text}
                  </li>
                ))}
                {!reasons.length && (
                  <li className="text-sm text-textsecondary">
                    Similar overall taste, no single standout overlap.
                  </li>
                )}
              </ul>

              {(sharedGenres.length || sharedPeople.length || sharedThemes.length) > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[...sharedGenres, ...sharedPeople, ...sharedThemes].slice(0, 8).map((label) => (
                    <span key={label} className="chip chip-active py-1 text-[10px]">
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="section-label mb-2.5">
                Titles that represent them
                {sharedTitles.length > 0 && (
                  <span className="ml-2 normal-case tracking-normal text-accent">
                    {sharedTitles.length} you also picked
                  </span>
                )}
              </h3>
              <TastePicksStrip picks={user.tastePicks} sharedKeys={sharedKeys} />
            </section>

            <section>
              <h3 className="section-label mb-2.5">Their stats</h3>
              {stats.updatedAt ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {STAT_FIELDS.map((field) => (
                    <Stat key={field.key} label={field.label} value={stats[field.key] ?? 0} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-textsecondary">
                  This viewer has not shared their stats yet.
                </p>
              )}
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] p-4">
            <p className="text-xs text-textsecondary">
              Add them to start a watch party together.
            </p>
            {action()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BuddyProfileModal;
