import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import { FiSearch, FiX, FiClock, FiTrendingUp, FiCornerDownLeft } from "react-icons/fi";
import { FaStar, FaPlus, FaCheck } from "react-icons/fa";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from "../lib/localStore";
import { mediaTypeOf, posterUrl, tmdbGet, titleOf, watchHref, yearOf } from "../lib/tmdb";
import { useWatchlist } from "../lib/watchlist";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "Series" },
];

const ResultRow = ({ item, active, saved, onSelect, onHover, onToggleSave }) => {
  const poster = posterUrl(item.poster_path);
  const type = mediaTypeOf(item);
  const title = titleOf(item);

  // A row is a container, not a button: the save control has to sit outside the
  // clickable area rather than nested inside it.
  return (
    <div
      onMouseMove={onHover}
      className={`group/row flex w-full items-center gap-1 rounded-xl pr-1.5 transition-colors ${
        active ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2.5 py-2 text-left"
      >
        <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-secondary">
          {poster ? (
            <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-textprimary">{title}</p>
          <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-textsecondary">
            <span className="rounded border border-white/10 px-1.5 py-px text-[10px] uppercase tracking-wide">
              {type === "tv" ? "Series" : "Film"}
            </span>
            {yearOf(item) && <span>{yearOf(item)}</span>}
            {item.vote_average > 0 && (
              <span className="inline-flex items-center gap-1">
                <FaStar className="h-2.5 w-2.5 text-accent" />
                {item.vote_average.toFixed(1)}
              </span>
            )}
          </p>
        </div>
      </button>

      {active && <FiCornerDownLeft className="h-4 w-4 shrink-0 text-textsecondary" />}

      <button
        type="button"
        onClick={onToggleSave}
        aria-label={saved ? `Remove ${title} from watchlist` : `Add ${title} to watchlist`}
        title={saved ? "Remove from watchlist" : "Add to watchlist"}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
          saved
            ? "bg-accent text-primary"
            : `border border-white/10 bg-white/[0.04] text-textsecondary hover:bg-accent hover:text-primary ${
                active ? "opacity-100" : "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
              }`
        }`}
      >
        {saved ? <FaCheck size={11} /> : <FaPlus size={11} />}
      </button>
    </div>
  );
};

const SearchModal = ({ isOpen, onClose }) => {
  const router = useRouter();
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const { isSaved, toggle } = useWatchlist();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [recents, setRecents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMac, setIsMac] = useState(false);

  const trimmed = query.trim();

  // Set after mount so the shortcut hint never mismatches the server render.
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || ""));
  }, []);

  // Reset + focus each time the palette opens.
  useEffect(() => {
    if (!isOpen) return undefined;
    setRecents(getRecentSearches());
    setActiveIndex(0);
    const timer = setTimeout(() => inputRef.current?.focus(), 60);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Trending acts as the empty state.
  useEffect(() => {
    if (!isOpen || trending.length) return;
    let active = true;
    tmdbGet("/trending/all/week")
      .then(({ data }) => {
        if (!active) return;
        setTrending(
          (data.results || [])
            .filter((item) => item.poster_path && ["movie", "tv"].includes(item.media_type))
            .slice(0, 12)
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen, trending.length]);

  // Debounced multi-search.
  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await tmdbGet("/search/multi", { query: trimmed, include_adult: false });
        setResults(
          (data.results || [])
            .filter((item) => item.poster_path && ["movie", "tv"].includes(item.media_type))
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        );
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [trimmed]);

  const visible = useMemo(() => {
    const source = trimmed ? results : trending;
    const filtered =
      filter === "all" ? source : source.filter((item) => mediaTypeOf(item) === filter);
    return filtered.slice(0, trimmed ? 24 : 8);
  }, [trimmed, results, trending, filter]);

  useEffect(() => setActiveIndex(0), [trimmed, filter]);

  const openItem = useCallback(
    (item) => {
      if (trimmed) setRecents(addRecentSearch(trimmed));
      onClose();
      router.push(watchHref(item));
    },
    [onClose, router, trimmed]
  );

  // Saving keeps the palette open — you can queue up several titles in one pass.
  const saveItem = useCallback(
    (item, event) => {
      event?.stopPropagation?.();
      event?.preventDefault?.();
      toggle(item);
    },
    [toggle]
  );

  const seeAll = useCallback(() => {
    if (!trimmed) return;
    setRecents(addRecentSearch(trimmed));
    onClose();
    router.push(`/search?q=${encodeURIComponent(trimmed)}${filter !== "all" ? `&type=${filter}` : ""}`);
  }, [trimmed, filter, onClose, router]);

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(visible.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      // Ctrl/Cmd + Enter saves the highlighted row instead of opening it.
      if ((event.metaKey || event.ctrlKey) && visible[activeIndex]) {
        saveItem(visible[activeIndex]);
        return;
      }
      if (visible[activeIndex]) openItem(visible[activeIndex]);
      else seeAll();
    }
  };

  // Keep the highlighted row in view while arrowing through results.
  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 px-4 pt-[8vh] backdrop-blur-md"
          onMouseDown={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={onKeyDown}
            className="flex max-h-[78vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-primary-soft/95 shadow-lift backdrop-blur-2xl"
          >
            {/* Input */}
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4">
              <FiSearch className="h-[18px] w-[18px] shrink-0 text-textsecondary" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search movies and series..."
                className="w-full bg-transparent py-4 text-[15px] text-textprimary outline-none placeholder:text-textsecondary/70"
                autoComplete="off"
                spellCheck="false"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="p-1 text-textsecondary transition-colors hover:text-textprimary"
                >
                  <FiX size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="hidden rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-textsecondary sm:block"
              >
                ESC
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
              {FILTERS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id)}
                  className={`chip ${filter === option.id ? "chip-active" : ""}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div ref={listRef} className="custom-scrollbar flex-1 overflow-y-auto p-2">
              {/* Recent searches - stored on this device only */}
              {!trimmed && recents.length > 0 && (
                <div className="px-2 pb-2 pt-1">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 section-label">
                      <FiClock size={12} /> Recent searches
                    </span>
                    <button
                      type="button"
                      onClick={() => setRecents(clearRecentSearches())}
                      className="text-[11px] text-textsecondary transition-colors hover:text-accent"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recents.map((item) => (
                      <span key={item.query} className="chip group/recent pr-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setQuery(item.query);
                            inputRef.current?.focus();
                          }}
                          className="max-w-[180px] truncate"
                        >
                          {item.query}
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${item.query} from recent searches`}
                          onClick={() => setRecents(removeRecentSearch(item.query))}
                          className="rounded p-0.5 text-textsecondary/70 transition-colors hover:text-textprimary"
                        >
                          <FiX size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!trimmed && (
                <p className="mb-1 inline-flex items-center gap-1.5 px-2 pt-2 section-label">
                  <FiTrendingUp size={12} /> Trending this week
                </p>
              )}

              {loading && (
                <div className="space-y-1.5 p-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="skeleton h-[68px] w-full rounded-xl" />
                  ))}
                </div>
              )}

              {!loading &&
                visible.map((item, index) => (
                  <div key={`${item.media_type}-${item.id}`} data-index={index}>
                    <ResultRow
                      item={item}
                      active={index === activeIndex}
                      saved={isSaved(item)}
                      onHover={() => setActiveIndex(index)}
                      onSelect={() => openItem(item)}
                      onToggleSave={(event) => saveItem(item, event)}
                    />
                  </div>
                ))}

              {!loading && trimmed && visible.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm text-textprimary">No matches for &ldquo;{trimmed}&rdquo;</p>
                  <p className="mt-1 text-xs text-textsecondary">
                    Try a different spelling or a shorter title.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {!loading && visible.length > 0 && (
              <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3 text-xs text-textsecondary">
                {trimmed ? (
                  <button
                    type="button"
                    onClick={seeAll}
                    className="min-w-0 truncate text-left transition-colors hover:text-textprimary"
                  >
                    See all results for <span className="text-textprimary">{trimmed}</span>
                  </button>
                ) : (
                  <span />
                )}
                <span className="flex shrink-0 items-center gap-3">
                  <span className="hidden items-center gap-1.5 sm:flex">
                    <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px]">
                      Enter
                    </kbd>
                    Watch
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px]">
                      {isMac ? "⌘" : "Ctrl"} ↵
                    </kbd>
                    Watchlist
                  </span>
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;
