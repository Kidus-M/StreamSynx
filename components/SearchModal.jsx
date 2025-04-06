import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import MovieCard from "./MinimalCard"; // Make sure this path is correct
import { useRouter } from "next/router";
import { Mosaic } from "react-loading-indicators"; // Or your preferred loader
import { IoClose } from "react-icons/io5"; // Using this close icon

const BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

// --- Debounce Utility ---
// (Ensuring it has a .cancel method for cleanup)
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
// --- End Debounce Utility ---


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
  const [showTrending, setShowTrending] = useState(true);

  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // --- Fetch Genres (Only Once) ---
  useEffect(() => {
    const fetchGenres = async () => {
      // Fetch both movie and TV genres for more comprehensive filtering options
      try {
        const [movieGenresRes, tvGenresRes] = await Promise.all([
          axios.get(`${BASE_URL}/genre/movie/list`, { params: { api_key: API_KEY } }),
          axios.get(`${BASE_URL}/genre/tv/list`, { params: { api_key: API_KEY } })
        ]);
        // Combine and remove duplicates
        const combinedGenres = [...movieGenresRes.data.genres, ...tvGenresRes.data.genres];
        const uniqueGenres = Array.from(new Map(combinedGenres.map(item => [item.id, item])).values());
        setGenres(uniqueGenres.sort((a, b) => a.name.localeCompare(b.name))); // Sort alphabetically
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };
    fetchGenres();
  }, []);

  // --- Fetch Trending (When modal opens/query clears) ---
  useEffect(() => {
    // Only fetch if modal is open AND query is empty AND trending is not already loaded
    if (isOpen && !query && trending.length === 0) {
      const fetchTrending = async () => {
        setLoading(true);
        setShowTrending(true);
        try {
          const response = await axios.get(`${BASE_URL}/trending/all/week`, {
            params: { api_key: API_KEY },
          });
          const filtered = response.data.results
            .filter(item => item.poster_path && (item.media_type === 'movie' || item.media_type === 'tv')) // Ensure media_type is movie or tv
            .slice(0, 15); // Show more trending items
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
        // If query is cleared, ensure trending is shown and search results are cleared
        setShowTrending(true);
        setResults([]);
        setLoading(false); // Ensure loading is off
    } else {
        // If there is a query, hide trending
        setShowTrending(false);
    }
  }, [isOpen, query]); // Dependency: run when modal opens or query changes

  // --- Fetch Search Results ---
  // This function now fetches data and applies client-side filtering robustly
  // --- Fetch Search Results ---
  const fetchSearchResults = useCallback(async (currentQuery, currentIsMovie, currentYear, currentGenre) => {
    if (!currentQuery) {
      setResults([]);
      setLoading(false);
      setShowTrending(true);
      return;
    }

    setLoading(true);
    setShowTrending(false);
    console.log(`[Search Fetch] Starting for: query="${currentQuery}", isMovie=${currentIsMovie}, year="${currentYear}", genre="${currentGenre}"`);

    try {
      let searchPath = "search/multi";
      let params = {
          api_key: API_KEY,
          query: currentQuery,
          include_adult: false,
          page: 1,
      };

      if (currentIsMovie === true) {
          searchPath = "search/movie";
          if (currentYear && /^\d{4}$/.test(currentYear)) params.primary_release_year = parseInt(currentYear);
      } else if (currentIsMovie === false) {
          searchPath = "search/tv";
          if (currentYear && /^\d{4}$/.test(currentYear)) params.first_air_date_year = parseInt(currentYear);
      }

      console.log(`[Search Fetch] Calling API: ${searchPath} with params:`, params);
      const response = await axios.get(`${BASE_URL}/${searchPath}`, { params });
      let rawResults = response.data.results || []; // Ensure rawResults is an array
      console.log(`[Search Fetch] Received ${rawResults.length} raw results.`);

      // --- Robust Client-Side Filtering with Debugging ---
      const yearInt = currentYear && /^\d{4}$/.test(currentYear) ? parseInt(currentYear) : null;
      const genreInt = currentGenre ? parseInt(currentGenre) : null;
      console.log(`[Filter Debug] Criteria: Year=${yearInt}, Genre=${genreInt}, IsMovie=${currentIsMovie}`);

      const filteredResults = rawResults.filter(item => {
          const itemName = item.title || item.name || 'Unknown Title';
          const itemMediaType = item.media_type;
          console.log(`\n[Filter Debug] ---- Checking Item: "${itemName}" (Type: ${itemMediaType}) ----`);

          // Basic check: must have poster and be movie/tv
          if (!item.poster_path || (itemMediaType !== 'movie' && itemMediaType !== 'tv')) {
              console.log(`[Filter Debug] -> FAIL (Basic: Missing poster or invalid media_type ${itemMediaType})`);
              return false;
          }
           console.log(`[Filter Debug] -> PASS (Basic)`);

          // 1. Filter by Media Type
          if (currentIsMovie !== null && itemMediaType !== (currentIsMovie ? 'movie' : 'tv')) {
              console.log(`[Filter Debug] -> FAIL (Media Type: Item is ${itemMediaType}, Filter requires ${currentIsMovie ? 'movie' : 'tv'})`);
              return false;
          }
           console.log(`[Filter Debug] -> PASS (Media Type)`);

          // 2. Filter by Year
          if (yearInt) { // Only filter if yearInt is valid
              const itemYearStr = itemMediaType === 'movie'
                  ? item.release_date?.substring(0, 4)
                  : item.first_air_date?.substring(0, 4);
              const itemYearInt = itemYearStr ? parseInt(itemYearStr) : null;

              console.log(`[Filter Debug] Year Check: Item year string = "${itemYearStr}", Item year int = ${itemYearInt}, Required year = ${yearInt}`);
              if (!itemYearInt || itemYearInt !== yearInt) {
                   console.log(`[Filter Debug] -> FAIL (Year: Item year ${itemYearInt} !== ${yearInt})`);
                   return false;
              }
          }
           console.log(`[Filter Debug] -> PASS (Year)`);

          // 3. Filter by Genre
          if (genreInt) { // Only filter if genreInt is valid
              const itemGenres = item.genre_ids; // Should be an array of numbers
               console.log(`[Filter Debug] Genre Check: Item genres = ${JSON.stringify(itemGenres)}, Required genre = ${genreInt}`);
              if (!itemGenres || !Array.isArray(itemGenres) || !itemGenres.includes(genreInt)) {
                  console.log(`[Filter Debug] -> FAIL (Genre: Item genres ${JSON.stringify(itemGenres)} does not include ${genreInt})`);
                  return false;
              }
          }
          console.log(`[Filter Debug] -> PASS (Genre)`);

          // If all checks pass
          console.log(`[Filter Debug] ---- Item "${itemName}" PASSED ALL FILTERS ----`);
          return true;
      });

      console.log(`[Filter Result] Final filtered count: ${filteredResults.length}`);
      setResults(filteredResults);

    } catch (error) {
      console.error("Error fetching or filtering search results:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []); // Keep dependency array empty for useCallback // This function itself doesn't depend on state/props directly

  // --- Debounced Search Trigger ---
   // Use useCallback for the debounced function itself to ensure stability if passed as prop later
  const debouncedFetch = useCallback(debounce(fetchSearchResults, 400), [fetchSearchResults]); // Slightly faster debounce

   // This useEffect triggers the debounced fetch when inputs change
  useEffect(() => {
    if (query) {
      // Call the debounced function with the current state values
      debouncedFetch(query, isMovie, year, genre);
    } else {
      // If query is cleared, cancel any pending fetch, clear results, show trending
      debouncedFetch.cancel?.();
      setResults([]);
      setLoading(false);
      setShowTrending(true);
    }

    // Cleanup function to cancel debounce on unmount or when dependencies change
    return () => {
      debouncedFetch.cancel?.();
    };
    // Dependencies: Trigger fetch when any of these change
  }, [query, isMovie, year, genre, debouncedFetch]);


  // --- Modal Handling (Escape, Overlay Click) ---
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = 'hidden';
      // Focus input shortly after modal opens to ensure transition completes
      const focusTimeout = setTimeout(() => inputRef.current?.focus(), 100);
      return () => { // Cleanup for focus timeout
          clearTimeout(focusTimeout);
          document.removeEventListener("keydown", handleEscape);
          document.body.style.overflow = 'auto';
      };
    } else {
       // Ensure styles are reset if component closes unexpectedly
      document.body.style.overflow = 'auto';
    }
  }, [isOpen, onClose]);

  const handleOverlayClick = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      onClose();
    }
  };

  const handleResultClick = (item) => {
    // Use media_type directly from the item which is reliable from TMDB
    if (item.media_type === 'movie' || item.media_type === 'tv') {
       router.push(`/${item.media_type}/${item.id}`);
       onClose();
    } else {
        console.warn("Clicked item with unexpected media type:", item.media_type);
    }
  };


  // --- Render Logic ---
  if (!isOpen) return null;

  return (
    // Overlay with transition
    <div
      className={`fixed inset-0 z-50 bg-black flex justify-center items-start pt-16 md:pt-24 px-4 transition-opacity duration-300 ease-in-out ${isOpen ? 'bg-opacity-75 backdrop-blur-sm' : 'bg-opacity-0 backdrop-blur-none pointer-events-none'}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-modal-title"
    >
      {/* Modal Panel with transition */}
      <div
        ref={modalRef}
        className={`bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
           <h2 id="search-modal-title" className="text-xl font-semibold text-white">Search</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close search">
            <IoClose className="h-6 w-6" />
          </button>
        </div>

        {/* Search Input and Filters */}
        <div className="p-4 space-y-4 border-b border-gray-700 flex-shrink-0"> {/* Added border */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search movies or TV shows (e.g., Dune, The Boys...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 rounded-lg text-white placeholder-gray-500 text-base focus:outline-none focus:ring-2 focus:ring-orange-500" // Adjusted placeholder text
          />
          {/* Filters Row */}
          <div className="flex flex-wrap gap-x-4 gap-y-3 items-center"> {/* Increased gap-y */}
             {/* Type Toggle */}
             <div className="flex items-center space-x-1 bg-gray-800 rounded-lg p-1 flex-shrink-0"> {/* Prevent shrinking */}
                <button title="Search All" onClick={() => setIsMovie(null)} className={`px-3 py-1 rounded ${ isMovie === null ? "bg-orange-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-700 hover:text-gray-200" } text-sm transition-all duration-150`}>All</button>
                <button title="Search Movies" onClick={() => setIsMovie(true)} className={`px-3 py-1 rounded ${ isMovie === true ? "bg-orange-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-700 hover:text-gray-200" } text-sm transition-all duration-150`}>Movies</button>
                <button title="Search TV Shows" onClick={() => setIsMovie(false)} className={`px-3 py-1 rounded ${ isMovie === false ? "bg-orange-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-700 hover:text-gray-200" } text-sm transition-all duration-150`}>TV</button>
              </div>
             {/* Year Input */}
             <div className="flex items-center space-x-2">
                <label htmlFor="yearInputModal" className="text-sm text-gray-400 font-medium">Year:</label>
                <input
                    type="number" id="yearInputModal" placeholder="Any" value={year}
                    onChange={(e) => setYear(e.target.value.slice(0, 4))}
                    className="px-2 py-1 w-20 bg-gray-800 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500 appearance-none text-sm"
                    style={{ MozAppearance: 'textfield' }}
                />
                 {/* Add clear button for year */}
                 {year && (
                     <button onClick={() => setYear('')} className="text-gray-500 hover:text-white -ml-1 p-0.5" title="Clear year">
                         <IoClose size={16} />
                     </button>
                 )}
              </div>
             {/* Genre Select */}
             <div className="flex items-center space-x-2">
                <label htmlFor="genreSelectModal" className="text-sm text-gray-400 font-medium">Genre:</label>
                <select
                    id="genreSelectModal"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="px-3 py-1.5 bg-gray-800 rounded text-white focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm appearance-none cursor-pointer" // Added appearance-none for custom arrow potentially needed
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }} // Hide default arrow (might need custom CSS arrow)
                >
                    <option value="">Any</option>
                    {genres.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
                </select>
                 {/* Add clear button for genre */}
                 {genre && (
                     <button onClick={() => setGenre('')} className="text-gray-500 hover:text-white -ml-1 p-0.5" title="Clear genre">
                        <IoClose size={16} />
                     </button>
                 )}
              </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[200px]"> {/* Added min-height */}
          {loading ? (
            <div className="flex justify-center items-center h-full py-10">
              <Mosaic color="#ff7f50" size="medium" />
            </div>
          ) : (
            <>
              {query && results.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {results.map((item) => (
                    <MovieCard key={`${item.id}-${item.media_type}`} movie={item} onClick={() => handleResultClick(item)} />
                  ))}
                </div>
              )}
              {query && results.length === 0 && !loading && (
                <p className="text-center text-gray-400 py-10 text-lg">No results found for "{query}"{year ? ` in ${year}` : ''}{genre ? ` in ${genres.find(g => g.id === parseInt(genre))?.name || ''}`: ''}.</p> // More informative message
              )}
              {!query && showTrending && trending.length > 0 && (
                 <div>
                   <h3 className="text-lg font-semibold mb-4 text-gray-300 px-1">Trending This Week</h3>
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {trending.map((item) => (
                        <MovieCard key={`${item.id}-${item.media_type}`} movie={item} onClick={() => handleResultClick(item)} />
                    ))}
                   </div>
                 </div>
              )}
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

export default SearchModal;


// Inline CSS needed to hide number input arrows if not using a CSS file
// (The <style jsx> tag from previous examples might not work directly here depending on setup)
// It's often better to put this in a global CSS file:
/*
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}
*/