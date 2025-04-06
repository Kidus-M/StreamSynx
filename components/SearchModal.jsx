import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import MovieCard from "./MinimalCard"; // Make sure this path is correct
import { useRouter } from "next/router";
import { Mosaic } from "react-loading-indicators"; // Or your preferred loader

const BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

// Debounce function utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const SearchModal = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isMovie, setIsMovie] = useState(null); // null, true (Movie), false (TV)
  const [year, setYear] = useState("");
  const [genre, setGenre] = useState("");
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState([]);
  const [showTrending, setShowTrending] = useState(true); // Show trending initially

  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // --- Fetch Genres (Only Once) ---
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/genre/movie/list`, {
          params: { api_key: API_KEY, language: "en-US" },
        });
        setGenres(response.data.genres);
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };
    fetchGenres();
  }, []); // Empty dependency array ensures this runs only once

  // --- Fetch Trending (When modal opens with no query) ---
  useEffect(() => {
    if (isOpen && !query && trending.length === 0) { // Fetch only if open, no query, and not already fetched
      const fetchTrending = async () => {
        setLoading(true); // Show loader while fetching trending
        setShowTrending(true);
        try {
          const response = await axios.get(`${BASE_URL}/trending/all/week`, {
            params: { api_key: API_KEY },
          });
          const filtered = response.data.results.filter(item => item.poster_path).slice(0, 12); // Show a few more
          setTrending(filtered);
        } catch (error) {
          console.error("Error fetching trending items:", error);
          setTrending([]); // Clear on error
        } finally {
            setLoading(false);
        }
      };
      fetchTrending();
    } else if (!query) {
        setShowTrending(true); // Ensure trending shows if query is cleared
        setResults([]); // Clear search results when query is empty
    } else {
        setShowTrending(false); // Hide trending if there's a query
    }
  }, [isOpen, query]); // Re-run when modal opens or query changes

  // --- Fetch Search Results (Debounced) ---
  const fetchSearchResults = useCallback(async (currentQuery, currentIsMovie, currentYear, currentGenre) => {
    if (!currentQuery) {
      setResults([]);
      setLoading(false);
      setShowTrending(true);
      return;
    }

    setLoading(true);
    setShowTrending(false); // Hide trending when searching

    try {
      // Use /search/movie or /search/tv if filtered, /search/multi otherwise
      let searchPath = "search/multi";
      let params = {
          api_key: API_KEY,
          query: currentQuery,
          include_adult: false, // Good practice to add
      };

      if (currentIsMovie === true) {
          searchPath = "search/movie";
          if (currentYear) params.primary_release_year = parseInt(currentYear);
          // Genre filter for movies needs 'discover/movie' endpoint usually,
          // but we can try client-side filtering later if needed, as /search doesn't natively support genre filtering well combined with query
      } else if (currentIsMovie === false) {
          searchPath = "search/tv";
          if (currentYear) params.first_air_date_year = parseInt(currentYear);
          // Genre filter for TV - similar limitations as movies with /search
      } else {
          // Multi search - year filter not directly supported, filter client-side
      }

      const response = await axios.get(`${BASE_URL}/${searchPath}`, { params });

      let rawResults = response.data.results;

      // --- Client-Side Filtering (for multi-search year/genre and specific genre filtering) ---
       let filteredResults = rawResults.filter(item =>
           item.poster_path && // Must have poster
           // Media type filter (already handled by specific endpoint if isMovie is not null)
           (currentIsMovie === null || (currentIsMovie ? item.media_type === 'movie' : item.media_type === 'tv')) &&
           // Year filter (only needed for multi-search or if API didn't filter)
           (currentIsMovie !== null || !currentYear || (item.release_date?.substring(0, 4) === currentYear || item.first_air_date?.substring(0, 4) === currentYear)) &&
           // Genre filter (client-side)
           (!currentGenre || (item.genre_ids && item.genre_ids.includes(parseInt(currentGenre))))
       );


      setResults(filteredResults);

    } catch (error) {
      console.error("Error fetching search results:", error);
      setResults([]); // Clear results on error
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies here, rely on the debounced function call

  // --- Debounced Search Trigger ---
   const debouncedFetch = useCallback(debounce(fetchSearchResults, 500), [fetchSearchResults]);

   useEffect(() => {
     // Trigger the debounced fetch when query or filters change
     if (query) {
        debouncedFetch(query, isMovie, year, genre);
     } else {
        // If query is cleared, cancel any pending fetch and show trending
        debouncedFetch.cancel?.(); // Assuming debounce utility has a cancel method
        setResults([]);
        setLoading(false);
        setShowTrending(true);
     }

     // Cleanup function to cancel debounce on unmount or dependency change
     return () => {
       debouncedFetch.cancel?.();
     };
   }, [query, isMovie, year, genre, debouncedFetch]);


  // --- Modal Handling ---
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
      inputRef.current?.focus(); // Auto-focus input
    } else {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = 'auto'; // Restore background scroll
    }
    // Cleanup listener and style on component unmount or when isOpen changes
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Close on overlay click
  const handleOverlayClick = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      onClose();
    }
  };

  const handleResultClick = (item) => {
    const mediaType = item.media_type === 'movie' ? 'movie' : 'tv'; // Determine media type
    router.push(`/${mediaType}/${item.id}`);
    onClose(); // Close modal after clicking a result
  };

  // Render Nothing if Closed
  if (!isOpen) {
    return null;
  }

  // --- Render Modal ---
  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-start pt-16 md:pt-24 px-4"
      onClick={handleOverlayClick} // Close on overlay click
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-modal-title"
    >
      <div
        ref={modalRef} // Ref for detecting clicks inside the modal
        className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
      >
        {/* Header with Title and Close Button */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
           <h2 id="search-modal-title" className="text-xl font-semibold text-white">Search</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Input and Filters */}
        <div className="p-4 space-y-4 flex-shrink-0">
          <input
            ref={inputRef} // Ref for auto-focus
            type="text"
            placeholder="Search for movies or TV shows..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {/* Filters */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
             {/* Movie/TV Show Toggle */}
             <div className="flex items-center space-x-1 bg-gray-800 rounded-lg p-1">
                <button onClick={() => setIsMovie(null)} className={`px-3 py-1 rounded ${ isMovie === null ? "bg-orange-600 text-white" : "text-gray-400 hover:bg-gray-700 hover:text-gray-200" } text-sm transition-colors`}>All</button>
                <button onClick={() => setIsMovie(true)} className={`px-3 py-1 rounded ${ isMovie === true ? "bg-orange-600 text-white" : "text-gray-400 hover:bg-gray-700 hover:text-gray-200" } text-sm transition-colors`}>Movies</button>
                <button onClick={() => setIsMovie(false)} className={`px-3 py-1 rounded ${ isMovie === false ? "bg-orange-600 text-white" : "text-gray-400 hover:bg-gray-700 hover:text-gray-200" } text-sm transition-colors`}>TV Shows</button>
              </div>
             {/* Year Filter */}
             <div className="flex items-center space-x-2">
                <label htmlFor="yearInputModal" className="text-sm text-gray-400">Year:</label>
                <input
                    type="number" id="yearInputModal" placeholder="YYYY" value={year}
                    onChange={(e) => setYear(e.target.value.slice(0, 4))} // Limit input length
                    className="px-2 py-1 w-20 bg-gray-800 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500 appearance-none"
                    // Hide browser spin buttons for number input
                    style={{ MozAppearance: 'textfield' }} // Firefox
                />
                <style jsx>{`
                    input[type=number]::-webkit-inner-spin-button,
                    input[type=number]::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                    }
                `}</style>
              </div>
             {/* Genre Filter */}
             <div className="flex items-center space-x-2">
                <label htmlFor="genreSelectModal" className="text-sm text-gray-400">Genre:</label>
                <select id="genreSelectModal" value={genre} onChange={(e) => setGenre(e.target.value)} className="px-3 py-1 bg-gray-800 rounded text-white focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm">
                    <option value="">All</option>
                    {genres.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
                </select>
              </div>
          </div>
        </div>

        {/* Results Area - Make this scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-full py-10">
              <Mosaic color="#ff7f50" size="medium" text="" textColor="" />
            </div>
          ) : (
            <>
              {/* Show Search Results if query exists */}
              {query && results.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {results.map((item) => (
                    <MovieCard key={item.id} movie={item} onClick={() => handleResultClick(item)} />
                  ))}
                </div>
              )}
              {/* Show No Results message */}
              {query && results.length === 0 && (
                <p className="text-center text-gray-400 py-10">No results found for "{query}".</p>
              )}
              {/* Show Trending if no query */}
              {!query && showTrending && trending.length > 0 && (
                 <div>
                   <h3 className="text-lg font-semibold mb-3 text-gray-300">Trending This Week</h3>
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {trending.map((item) => (
                        <MovieCard key={item.id} movie={item} onClick={() => handleResultClick(item)} />
                    ))}
                   </div>
                 </div>
              )}
               {/* Handle case where trending might be empty or failed to load */}
               {!query && showTrending && trending.length === 0 && !loading && (
                 <p className="text-center text-gray-400 py-10">Trending items could not be loaded.</p>
               )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper debounce function implementation if not imported from elsewhere
if (typeof debounce !== 'function') {
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

        // Add a cancel method to the debounced function
        executedFunction.cancel = () => {
            clearTimeout(timeout);
        };

        return executedFunction;
    }
}


export default SearchModal;