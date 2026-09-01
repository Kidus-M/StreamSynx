// components/TastePicker.jsx — search TMDB for one title to drop into a taste
// slot. Deliberately narrower than SearchModal: it is locked to a single media
// type and returns a pick instead of navigating away.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiSearch, FiX, FiCheck } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { posterUrl, tmdbGet } from "../lib/tmdb";
import { normalizePick, pickKey } from "../lib/tasteProfile";

const ResultRow = ({ item, type, taken, onSelect }) => {
  const pick = normalizePick(item, type);
  const alreadyPicked = taken.has(pickKey(pick));
  const poster = posterUrl(item.poster_path);

  return (
    <button
      type="button"
      disabled={alreadyPicked}
      onClick={() => onSelect(pick)}
      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
        alreadyPicked ? "cursor-not-allowed opacity-45" : "hover:bg-white/[0.06]"
      }`}
    >
      <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-secondary">
        {poster && <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-textprimary">{pick.title}</p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-textsecondary">
          {pick.year && <span>{pick.year}</span>}
          {item.vote_average > 0 && (
            <span className="inline-flex items-center gap-1">
              <FaStar className="h-2.5 w-2.5 text-accent" />
              {item.vote_average.toFixed(1)}
            </span>
          )}
        </p>
      </div>
      {alreadyPicked && (
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-accent">
          <FiCheck className="h-3 w-3" /> Picked
        </span>
      )}
    </button>
  );
};

const TastePicker = ({ isOpen, type, taken, onSelect, onClose }) => {
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(false);

  const trimmed = query.trim();
  const label = type === "tv" ? "series" : "film";
  const takenKeys = useMemo(() => new Set(taken || []), [taken]);

  useEffect(() => {
    if (!isOpen) return undefined;
    setQuery("");
    setResults([]);
    const timer = setTimeout(() => inputRef.current?.focus(), 60);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Top-rated titles are a better empty state here than trending: taste picks
  // are meant to be favourites, not whatever came out this week.
  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    setPopular([]);
    tmdbGet(`/${type === "tv" ? "tv" : "movie"}/top_rated`)
      .then(({ data }) => {
        if (active) setPopular((data.results || []).filter((item) => item.poster_path).slice(0, 12));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen, type]);

  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await tmdbGet(`/search/${type === "tv" ? "tv" : "movie"}`, {
          query: trimmed,
          include_adult: false,
        });
        setResults(
          (data.results || [])
            .filter((item) => item.poster_path)
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, 24)
        );
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [trimmed, type]);

  const visible = trimmed ? results : popular;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 px-4 pt-[10vh] backdrop-blur-md"
          onMouseDown={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`Choose a ${label}`}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.key === "Escape" && onClose()}
            className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-primary-soft/95 shadow-lift backdrop-blur-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4">
              <FiSearch className="h-[18px] w-[18px] shrink-0 text-textsecondary" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search for a ${label}...`}
                className="w-full bg-transparent py-4 text-[15px] text-textprimary outline-none placeholder:text-textsecondary/70"
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1 text-textsecondary transition-colors hover:text-textprimary"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
              {!trimmed && (
                <p className="section-label px-2 pb-1 pt-2">
                  Highest rated {type === "tv" ? "series" : "films"}
                </p>
              )}

              {loading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="skeleton m-2 h-[68px] rounded-xl" />
                ))}

              {!loading &&
                visible.map((item) => (
                  <ResultRow
                    key={item.id}
                    item={item}
                    type={type}
                    taken={takenKeys}
                    onSelect={onSelect}
                  />
                ))}

              {!loading && trimmed && !visible.length && (
                <p className="px-4 py-12 text-center text-sm text-textsecondary">
                  No {label} found for &ldquo;{trimmed}&rdquo;.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TastePicker;
