// components/TastePicks.jsx — the four films and four series that stand in for
// someone's taste, both as an editor (your own profile) and as a read-only
// strip (someone else's).
import React, { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FiPlus, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import TastePicker from "./TastePicker";
import { posterUrl } from "../lib/tmdb";
import {
  MAX_PICKS_PER_TYPE,
  TOTAL_PICK_SLOTS,
  countPicks,
  pickKey,
  saveTastePicks,
} from "../lib/tasteProfile";

const ROWS = [
  { key: "movies", type: "movie", title: "Films that are me", empty: "Add a film" },
  { key: "shows", type: "tv", title: "Series that are me", empty: "Add a series" },
];

/** One poster tile. `highlight` marks a title two people both picked. */
const PickTile = ({ pick, onRemove, highlight = false }) => {
  const poster = posterUrl(pick.poster_path);

  return (
    <div className="group relative">
      <div
        className={`relative aspect-[2/3] overflow-hidden rounded-xl border bg-secondary shadow-card transition-colors ${
          highlight ? "border-accent/70 ring-1 ring-accent/40" : "border-white/[0.06]"
        }`}
      >
        {poster ? (
          <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-textsecondary">
            {pick.title}
          </div>
        )}

        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(pick)}
            aria-label={`Remove ${pick.title}`}
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-black/70 text-textprimary opacity-0 backdrop-blur-md transition-all hover:bg-red-500 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <FiX size={12} />
          </button>
        )}

        {highlight && (
          <span className="absolute inset-x-0 bottom-0 bg-accent/90 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wider text-primary">
            Shared
          </span>
        )}
      </div>
      <p className="mt-1.5 truncate px-0.5 text-[11px] font-medium text-textprimary">{pick.title}</p>
      {pick.year && <p className="truncate px-0.5 text-[10px] text-textsecondary">{pick.year}</p>}
    </div>
  );
};

const EmptySlot = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.14] bg-white/[0.02] text-textsecondary transition-colors hover:border-accent/50 hover:bg-accent/[0.06] hover:text-accent"
  >
    <FiPlus className="h-5 w-5" />
    <span className="px-2 text-center text-[10px] font-medium leading-tight">{label}</span>
  </button>
);

/**
 * Read-only picks, used on other people's profiles. `sharedKeys` highlights the
 * titles the viewer picked too, which is the whole point of showing them.
 */
export const TastePicksStrip = ({ picks, sharedKeys = new Set(), compact = false }) => {
  const all = [...(picks?.movies || []), ...(picks?.shows || [])];

  if (!all.length) {
    return <p className="text-sm text-textsecondary">No taste picks yet.</p>;
  }

  return (
    <div className={`grid gap-3 ${compact ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-8"}`}>
      {all.map((pick) => (
        <PickTile key={pickKey(pick)} pick={pick} highlight={sharedKeys.has(pickKey(pick))} />
      ))}
    </div>
  );
};

/**
 * The editor on your own profile. Changes are staged locally and committed on
 * save, because saving rebuilds the taste vector from TMDB and that should not
 * fire on every single click.
 */
export const TastePicksEditor = ({ uid, initialPicks, fallbackGenreIds = [], onSaved }) => {
  const [picks, setPicks] = useState(initialPicks);
  const [picking, setPicking] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const takenKeys = useMemo(
    () => [...picks.movies, ...picks.shows].map(pickKey),
    [picks]
  );

  const total = countPicks(picks);

  const addPick = useCallback(
    (pick) => {
      const rowKey = pick.type === "tv" ? "shows" : "movies";
      setPicks((previous) => {
        if (previous[rowKey].length >= MAX_PICKS_PER_TYPE) return previous;
        return { ...previous, [rowKey]: [...previous[rowKey], pick] };
      });
      setDirty(true);
      setPicking(null);
    },
    []
  );

  const removePick = useCallback((pick) => {
    const rowKey = pick.type === "tv" ? "shows" : "movies";
    setPicks((previous) => ({
      ...previous,
      [rowKey]: previous[rowKey].filter((entry) => pickKey(entry) !== pickKey(pick)),
    }));
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    if (!uid) return;
    setSaving(true);
    try {
      const profile = await saveTastePicks(uid, picks, { fallbackGenreIds });
      setDirty(false);
      onSaved?.(picks, profile);
      toast.success("Taste picks saved");
    } catch (error) {
      console.error("Error saving taste picks:", error);
      toast.error("Could not save your picks. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [uid, picks, fallbackGenreIds, onSaved]);

  return (
    <section className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-textsecondary">
            Your taste picks
          </h2>
          <p className="mt-1 max-w-md text-sm text-textsecondary">
            Four films and four series that say what you actually watch. Buddies see these, and
            they drive who gets recommended to you.
          </p>
        </div>
        <span className="chip shrink-0 tabular-nums">
          {total}/{TOTAL_PICK_SLOTS}
        </span>
      </div>

      <div className="mt-5 space-y-5">
        {ROWS.map((row) => {
          const rowPicks = picks[row.key];
          const slots = MAX_PICKS_PER_TYPE - rowPicks.length;

          return (
            <div key={row.key}>
              <p className="mb-2.5 text-xs font-medium text-textprimary">{row.title}</p>
              <div className="grid grid-cols-4 gap-3">
                {rowPicks.map((pick) => (
                  <PickTile key={pickKey(pick)} pick={pick} onRemove={removePick} />
                ))}
                {Array.from({ length: slots }).map((_, index) => (
                  <EmptySlot key={index} label={row.empty} onClick={() => setPicking(row.type)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {dirty && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4"
        >
          <button type="button" onClick={save} disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save picks"}
          </button>
          <p className="text-xs text-textsecondary">
            Saving refreshes your match profile, so Discover updates right away.
          </p>
        </motion.div>
      )}

      <TastePicker
        isOpen={Boolean(picking)}
        type={picking || "movie"}
        taken={takenKeys}
        onSelect={addPick}
        onClose={() => setPicking(null)}
      />
    </section>
  );
};

export default TastePicksEditor;
