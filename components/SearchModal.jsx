// components/SearchModal.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import MovieCard from "./MinimalCard"; // Make sure this path is correct
import { useRouter } from "next/router";
import { Mosaic } from "react-loading-indicators";
import { IoClose } from "react-icons/io5";

const BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

// --- Debounce Utility ---
function debounce(func, wait) {
  let timeout;
  function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  }
  executedFunction.cancel = () => {
    clearTimeout(timeout);
  };
  return executedFunction;
}
// --- End Debounce Utility ---

const SearchModal = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isMovie, setIsMovie] = useState(null);
  const [year, setYear] = useState("");
  const [genre, setGenre] = useState("");
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState([]);
  const [showTrending, setShowTrending] = useState(true);

  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch Genres (keep as is)
  useEffect(() => {
    const fetchGenres = async () => {
      if (!API_KEY) return; // Don't fetch if no API key
      try {
        const [movieGenresRes, tvGenresRes] = await Promise.all([
          axios.get(`${BASE_URL}/genre/movie/list`, {
            params: { api_key: API_KEY },
          }),
          axios.get(`${BASE_URL}/genre/tv/list`, {
            params: { api_key: API_KEY },
          }),
        ]);
        const combinedGenres = [
          ...movieGenresRes.data.genres,
          ...tvGenresRes.data.genres,
        ];
        const uniqueGenres = Array.from(
          new Map(combinedGenres.map((item) => [item.id, item])).values()
        );
        setGenres(uniqueGenres.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };
    fetchGenres();
  }, [API_KEY]);

  // Fetch Trending (keep as is)
  useEffect(() => {
    if (isOpen && !query && trending.length === 0) {
      const fetchTrending = async () => {
        if (!API_KEY) return;
        setLoading(true);
        setShowTrending(true);
        try {
          const response = await axios.get(`${BASE_URL}/trending/all/week`, {
            params: { api_key: API_KEY },
          });
          const filtered = response.data.results
            .filter(
              (item) =>
                item.poster_path &&
                (item.media_type === "movie" || item.media_type === "tv")
            )
            .slice(0, 15);
          setTrending(filtered);
        } catch (error) {
          console.error("Error fetching trending items:", error);
          setTrending([]);
        } finally {
          setLoading(false);
        }
      };
      fetchTrending();
    } else if (!query) {
      setShowTrending(true);
      setResults([]);
      setLoading(false);
    } else {
      setShowTrending(false);
    }
  }, [isOpen, query, API_KEY, trending.length]);

  // --- Fetch Search Results - Reverted Strategy ---
  const fetchSearchResults = useCallback(
    async (currentQuery, currentIsMovie, currentYear, currentGenre) => {
      if (!currentQuery || !API_KEY) {
        setResults([]);
        setLoading(false);
        setShowTrending(true);
        return;
      }
      setLoading(true);
      setShowTrending(false);
      // console.log(`[Search Fetch] Starting for: query="${currentQuery}", isMovie=${currentIsMovie}, year="${currentYear}", genre="${currentGenre}"`);

      try {
        // ALWAYS use search/multi endpoint
        const searchPath = "search/multi";
        let params = {
          api_key: API_KEY,
          query: currentQuery,
          include_adult: false,
          page: 1,
        };
        // Do NOT add year or genre params here, /search/multi doesn't use them with query

        // console.log(`[Search Fetch] Calling API: ${searchPath} with params:`, params);
        const response = await axios.get(`${BASE_URL}/${searchPath}`, {
          params,
        });
        let rawResults = response.data.results || [];
        // console.log(`[Search Fetch] Received ${rawResults.length} raw results.`);

        const yearInt =
          currentYear && /^\d{4}$/.test(currentYear)
            ? parseInt(currentYear)
            : null;
        const genreInt = currentGenre ? parseInt(currentGenre) : null;
        // console.log(`[Filter Debug] Criteria: Year=${yearInt}, Genre=${genreInt}, IsMovie=${currentIsMovie}`);

        // --- Full Client-Side Filtering ---
        const filteredResults = rawResults.filter((item) => {
          const itemMediaType = item.media_type;

          // 1. Basic check: must have poster and be movie/tv
          if (
            !item.poster_path ||
            (itemMediaType !== "movie" && itemMediaType !== "tv")
          ) {
            return false;
          }

          // 2. Filter by Media Type (Using logic from original SearchPage)
          if (
            !(
              currentIsMovie === null ||
              (currentIsMovie
                ? itemMediaType === "movie"
                : itemMediaType === "tv")
            )
          ) {
            // console.log(`[Filter Debug] -> FAIL (Media Type: Item is ${itemMediaType}, Filter requires ${currentIsMovie === null ? 'All' : (currentIsMovie ? 'movie' : 'tv')})`);
            return false; // Fails if filter is set AND type doesn't match
          }

          // 3. Filter by Year
          if (yearInt) {
            const itemYearStr =
              itemMediaType === "movie"
                ? item.release_date?.substring(0, 4)
                : item.first_air_date?.substring(0, 4);
            const itemYearInt = itemYearStr ? parseInt(itemYearStr) : null;
            if (!itemYearInt || itemYearInt !== yearInt) {
              // console.log(`[Filter Debug] -> FAIL (Year: Item year ${itemYearInt} !== ${yearInt})`);
              return false;
            }
          }

          // 4. Filter by Genre
          if (genreInt) {
            const itemGenres = item.genre_ids;
            if (
              !itemGenres ||
              !Array.isArray(itemGenres) ||
              !itemGenres.includes(genreInt)
            ) {
              // console.log(`[Filter Debug] -> FAIL (Genre: Item genres ${JSON.stringify(itemGenres)} does not include ${genreInt})`);
              return false;
            }
          }

          // If all checks pass
          return true;
        });

        // console.log(`[Filter Result] Final filtered count: ${filteredResults.length}`);
        setResults(filteredResults);
      } catch (error) {
        console.error("Error fetching or filtering search results:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [API_KEY]
  ); // Only depends on API Key

  // Debounced Search Trigger (keep as is)
  const debouncedFetch = useCallback(debounce(fetchSearchResults, 400), [
    fetchSearchResults,
  ]);
  useEffect(() => {
    if (query) {
      debouncedFetch(query, isMovie, year, genre);
    } else {
      debouncedFetch.cancel?.();
      setResults([]);
      setLoading(false);
      setShowTrending(true);
    }
    return () => {
      debouncedFetch.cancel?.();
    };
  }, [query, isMovie, year, genre, debouncedFetch]);

  // Modal Handling (keep as is)
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      const focusTimeout = setTimeout(() => inputRef.current?.focus(), 100);
      return () => {
        clearTimeout(focusTimeout);
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "auto";
      };
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isOpen, onClose]);
  const handleOverlayClick = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      onClose();
    }
  };
  // const handleResultClick = (item) => { if (item.media_type === 'movie' || item.media_type === 'tv') { router.push(`/${item.media_type}/${item.id}`); onClose(); } else { console.warn("Clicked item with unexpected media type:", item.media_type); } };

  // --- Render Logic ---
  if (!isOpen) return null;

  return (
    // Overlay - Themed Background
    <div
      className={`fixed inset-0 z-50 bg-primary/80 backdrop-blur-md flex justify-center items-start pt-16 md:pt-24 px-4 transition-opacity duration-300 ease-in-out ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`} // Use primary bg
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-modal-title"
    >
      {/* Modal Panel - Themed Background */}
      <div
        ref={modalRef}
        className={`bg-secondary rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col transition-all duration-300 ease-in-out border border-secondary-light ${
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"
        }`} // Use secondary bg, add border
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Themed Text and Border */}
        <div className="flex justify-between items-center p-4 border-b border-secondary-light flex-shrink-0">
          <h2
            id="search-modal-title"
            className="text-xl font-semibold text-textprimary"
          >
            Search
          </h2>{" "}
          {/* text-textprimary */}
          <button
            onClick={onClose}
            className="text-textsecondary hover:text-textprimary transition-colors"
            aria-label="Close search"
          >
            {" "}
            {/* text-textsecondary */}
            <IoClose className="h-6 w-6" />
          </button>
        </div>

        {/* Search Input and Filters - Themed Backgrounds, Text, Rings */}
        <div className="p-4 space-y-4 border-b border-secondary-light flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search movies or TV shows..." // Updated placeholder
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-3 bg-primary rounded-lg text-textprimary placeholder-textsecondary text-base focus:outline-none focus:ring-2 focus:ring-accent" // bg-primary, themed text/placeholder/ring
          />
          {/* Filters Row */}
          <div className="flex flex-wrap gap-x-4 gap-y-3 items-center">
            {/* Type Toggle - Themed buttons */}
            <div className="flex items-center space-x-1 bg-primary rounded-lg p-1 flex-shrink-0">
              {" "}
              {/* bg-primary */}
              <button
                title="Search All"
                onClick={() => setIsMovie(null)}
                className={`px-3 py-1 rounded ${
                  isMovie === null
                    ? "bg-accent text-primary shadow-md"
                    : "text-textsecondary hover:bg-secondary hover:text-textprimary"
                } text-sm transition-all duration-150`}
              >
                All
              </button>{" "}
              {/* text-primary on accent */}
              <button
                title="Search Movies"
                onClick={() => setIsMovie(true)}
                className={`px-3 py-1 rounded ${
                  isMovie === true
                    ? "bg-accent text-primary shadow-md"
                    : "text-textsecondary hover:bg-secondary hover:text-textprimary"
                } text-sm transition-all duration-150`}
              >
                Movies
              </button>
              <button
                title="Search TV Shows"
                onClick={() => setIsMovie(false)}
                className={`px-3 py-1 rounded ${
                  isMovie === false
                    ? "bg-accent text-primary shadow-md"
                    : "text-textsecondary hover:bg-secondary hover:text-textprimary"
                } text-sm transition-all duration-150`}
              >
                TV
              </button>
            </div>
            {/* Year Input - Themed input and text */}
            <div className="flex items-center space-x-2">
              <label
                htmlFor="yearInputModal"
                className="text-sm text-textsecondary font-medium"
              >
                Year:
              </label>
              <input
                type="number"
                id="yearInputModal"
                placeholder="Any"
                value={year}
                onChange={(e) => setYear(e.target.value.slice(0, 4))}
                className="px-2 py-1 w-20 bg-primary rounded text-textprimary placeholder-textsecondary focus:outline-none focus:ring-1 focus:ring-accent appearance-none text-sm"
                style={{ MozAppearance: "textfield" }}
              />
              {year && (
                <button
                  onClick={() => setYear("")}
                  className="text-textsecondary hover:text-textprimary -ml-1 p-0.5"
                  title="Clear year"
                >
                  <IoClose size={16} />
                </button>
              )}
            </div>
            {/* Genre Select - Themed select and text */}
            <div className="flex items-center space-x-2">
              <label
                htmlFor="genreSelectModal"
                className="text-sm text-textsecondary font-medium"
              >
                Genre:
              </label>
              <select
                id="genreSelectModal"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="px-3 py-1.5 bg-primary rounded text-textprimary focus:outline-none focus:ring-1 focus:ring-accent text-sm appearance-none cursor-pointer"
                style={{
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  appearance: "none",
                }}
              >
                <option value="">Any</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              {genre && (
                <button
                  onClick={() => setGenre("")}
                  className="text-textsecondary hover:text-textprimary -ml-1 p-0.5"
                  title="Clear genre"
                >
                  <IoClose size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Area - Themed Text and Loader */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[200px]">
          {loading ? (
            <div className="flex justify-center items-center h-full py-10">
              <Mosaic color="#DAA520" size="medium" />{" "}
              {/* Accent color loader */}
            </div>
          ) : (
            <>
              {query && results.length > 0 && (
                // Assuming MovieCard uses theme colors
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {results.map((item) => (
                    <MovieCard
                      key={`${item.id}-${item.media_type}`}
                      movie={item}
                      // onClick={() => handleResultClick(item)}
                    />
                  ))}
                </div>
              )}
              {query && results.length === 0 && !loading && (
                <p className="text-center text-textsecondary py-10 text-lg">
                  No results found for "{query}"{year ? ` in ${year}` : ""}
                  {genre
                    ? ` in ${
                        genres.find((g) => g.id === parseInt(genre))?.name || ""
                      }`
                    : ""}
                  .
                </p> // Themed text
              )}
              {!query && showTrending && trending.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-textprimary px-1">
                    Trending This Week
                  </h3>{" "}
                  {/* Themed text */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {trending.map((item) => (
                      <MovieCard
                        key={`${item.id}-${item.media_type}`}
                        movie={item}
                        // onClick={() => handleResultClick(item)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {!query && showTrending && trending.length === 0 && !loading && (
                <p className="text-center text-textsecondary py-10">
                  Trending items could not be loaded.
                </p> // Themed text
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
