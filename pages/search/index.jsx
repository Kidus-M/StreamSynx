import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { FiSearch, FiX, FiClock } from "react-icons/fi";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import MovieCard from "../../components/MinimalCard";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from "../../lib/localStore";
import { mediaTypeOf, tmdbGet, yearOf } from "../../lib/tmdb";

const TYPES = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "Series" },
];

const CURRENT_YEAR = new Date().getFullYear();
const DECADES = [
  { id: "", label: "Any year" },
  { id: `${CURRENT_YEAR}`, label: "This year" },
  { id: "2020s", label: "2020s" },
  { id: "2010s", label: "2010s" },
  { id: "2000s", label: "2000s" },
  { id: "1990s", label: "1990s" },
];

const matchesPeriod = (item, period) => {
  if (!period) return true;
  const year = Number(yearOf(item));
  if (!year) return false;
  if (/^\d{4}$/.test(period)) return year === Number(period);
  const decade = Number(period.slice(0, 4));
  return year >= decade && year < decade + 10;
};

export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef(null);

  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [period, setPeriod] = useState("");
  const [genre, setGenre] = useState("");
  const [genres, setGenres] = useState([]);
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState([]);

  const trimmed = query.trim();

  // Hydrate from the URL so shared links and the palette land in the same place.
  useEffect(() => {
    if (!router.isReady) return;
    setQuery(typeof router.query.q === "string" ? router.query.q : "");
    if (typeof router.query.type === "string" && TYPES.some((item) => item.id === router.query.type)) {
      setType(router.query.type);
    }
  }, [router.isReady, router.query.q, router.query.type]);

  useEffect(() => {
    setRecents(getRecentSearches());
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    Promise.all([tmdbGet("/genre/movie/list"), tmdbGet("/genre/tv/list")])
      .then(([movies, shows]) => {
        const combined = [...(movies.data.genres || []), ...(shows.data.genres || [])];
        const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
        setGenres(unique.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {});

    tmdbGet("/trending/all/week")
      .then(({ data }) =>
        setTrending(
          (data.results || [])
            .filter((item) => item.poster_path && ["movie", "tv"].includes(item.media_type))
            .slice(0, 18)
        )
      )
      .catch(() => {});
  }, []);

  // Debounced search, then remember the term on this device.
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
          (data.results || []).filter(
            (item) => item.poster_path && ["movie", "tv"].includes(item.media_type)
          )
        );
        setRecents(addRecentSearch(trimmed));
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 420);

    return () => clearTimeout(timer);
  }, [trimmed]);

  const filtered = useMemo(
    () =>
      results.filter((item) => {
        if (type !== "all" && mediaTypeOf(item) !== type) return false;
        if (!matchesPeriod(item, period)) return false;
        if (genre && !(item.genre_ids || []).includes(Number(genre))) return false;
        return true;
      }),
    [results, type, period, genre]
  );

  const runSearch = useCallback(
    (term) => {
      setQuery(term);
      inputRef.current?.focus();
    },
    []
  );

  const grid = trimmed ? filtered : trending;

  return (
    <div className="flex min-h-screen flex-col bg-primary text-textprimary">
      <Head>
        <title>{trimmed ? `${trimmed} — Search` : "Search"} — StreamSynx</title>
      </Head>

      <NavBar />

      <main className="flex-1 px-4 pb-16 pt-24 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <h1 className="heading-xl">Search</h1>
          <p className="mt-2 text-sm text-textsecondary">
            Films and series from TMDB. Your recent searches stay on this device.
          </p>

          {/* Search field */}
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 focus-within:border-accent/50">
            <FiSearch className="h-[18px] w-[18px] shrink-0 text-textsecondary" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title..."
              className="w-full bg-transparent py-4 text-[15px] text-textprimary outline-none placeholder:text-textsecondary/70"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="p-1 text-textsecondary transition-colors hover:text-textprimary"
              >
                <FiX size={17} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {TYPES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setType(option.id)}
                className={`chip ${type === option.id ? "chip-active" : ""}`}
              >
                {option.label}
              </button>
            ))}

            <span className="mx-1 h-5 w-px bg-white/10" />

            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="chip cursor-pointer appearance-none pr-3"
              aria-label="Filter by period"
            >
              {DECADES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={genre}
              onChange={(event) => setGenre(event.target.value)}
              className="chip cursor-pointer appearance-none pr-3"
              aria-label="Filter by genre"
            >
              <option value="">Any genre</option>
              {genres.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>

            {(period || genre || type !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setPeriod("");
                  setGenre("");
                  setType("all");
                }}
                className="text-[12px] text-textsecondary transition-colors hover:text-accent"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Recent searches (localStorage only) */}
          {recents.length > 0 && !trimmed && (
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <span className="section-label inline-flex items-center gap-1.5">
                  <FiClock size={12} /> Recent searches
                </span>
                <button
                  type="button"
                  onClick={() => setRecents(clearRecentSearches())}
                  className="text-[12px] text-textsecondary transition-colors hover:text-accent"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recents.map((item) => (
                  <span key={item.query} className="chip pr-1.5">
                    <button
                      type="button"
                      onClick={() => runSearch(item.query)}
                      className="max-w-[200px] truncate"
                    >
                      {item.query}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${item.query}`}
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

          {/* Results */}
          <div className="mt-10">
            <h2 className="heading-lg mb-4">
              {trimmed
                ? loading
                  ? "Searching…"
                  : `${filtered.length} result${filtered.length === 1 ? "" : "s"} for “${trimmed}”`
                : "Trending this week"}
            </h2>

            {loading ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={index}>
                    <div className="skeleton aspect-[2/3] w-full rounded-xl" />
                    <div className="skeleton mt-2.5 h-3 w-4/5 rounded" />
                  </div>
                ))}
              </div>
            ) : grid.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {grid.map((item) => (
                  <MovieCard key={`${item.media_type}-${item.id}`} movie={item} />
                ))}
              </div>
            ) : (
              <div className="surface px-6 py-16 text-center">
                <p className="text-sm text-textprimary">Nothing matched those filters.</p>
                <p className="mt-1 text-xs text-textsecondary">
                  Try a different spelling, or reset the filters above.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
