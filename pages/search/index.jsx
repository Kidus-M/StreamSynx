import React, { useState, useEffect } from "react";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import axios from "axios";
import MovieCard from "../../components/MinimalCard";
import { useRouter } from "next/router";
import { Mosaic } from "react-loading-indicators";
const BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

const SearchPage = () => {
  const router = useRouter();
  const [query, setQuery] = useState(""); // Search query
  const [results, setResults] = useState([]); // Search results
  const [isMovie, setIsMovie] = useState(null); // Filter: Movie or TV Show (null for both)
  const [year, setYear] = useState(""); // Filter: Release year
  const [genre, setGenre] = useState(""); // Filter: Genre
  const [genres, setGenres] = useState([]); // List of genres
  const [loading, setLoading] = useState(false); // Loading state
  const [mostSearched, setMostSearched] = useState([]); // Most searched shows
  const [initialLoad, setInitialLoad] = useState(true);
  // Fetch genres on component mount
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/genre/movie/list`, {
          params: { api_key: API_KEY, language: "en-US" },
        });
        setGenres(response.data.genres);
      } catch (error) {
        console.error("Error fetching genres:", error);
      } finally {
        setInitialLoad(false); // Set initial load to false after fetching genres
      }
    };

    fetchGenres();
  }, []);

  useEffect(() => {
    if (!query && !initialLoad) {
      const fetchMostSearched = async () => {
        try {
          const response = await axios.get(`${BASE_URL}/trending/all/week`, {
            params: { api_key: API_KEY },
          });
          const filteredResults = response.data.results.filter(
            (item) => item.poster_path
          );
          setMostSearched(filteredResults.slice(0, 10));
        } catch (error) {
          console.error("Error fetching most searched shows:", error);
        }
      };

      fetchMostSearched();
    }
  }, [query, initialLoad]);

  useEffect(() => {
    if (query) {
      const fetchResults = async () => {
        setLoading(true);
        try {
          const response = await axios.get(`${BASE_URL}/search/multi`, {
            params: {
              api_key: API_KEY,
              query: query,
              year: year ? parseInt(year) : undefined, // Convert to number or undefined
              with_genres: genre || undefined, // Pass genre or undefined
            },
          });
          let filteredResults = response.data.results;
          if (query) {
            filteredResults = response.data.results.filter(
              (item) =>
                item.poster_path &&
                (isMovie === null ||
                  (isMovie
                    ? item.media_type === "movie"
                    : item.media_type === "tv"))
            );
          }
          setResults(filteredResults);
        } catch (error) {
          console.error("Error fetching search results:", error);
        } finally {
          setLoading(false);
        }
      };

      const debounceTimer = setTimeout(() => {
        fetchResults();
      }, 500);

      return () => clearTimeout(debounceTimer);
    } else {
      setResults([]);
    }
  }, [query, isMovie, year, genre]);

  if (initialLoad) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <Mosaic color="#ff7f50" size="medium" text="" textColor="" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col mt-20">
      <NavBar />
      <main className="flex-1 p-6">
        {/* Search Section */}
        <section className="max-w-4xl mx-auto">
          <div className="flex flex-col space-y-4">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search for movies or TV shows..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              {/* Movie/TV Show Toggle */}
              <div className="flex items-center space-x-2">
                <label className="text-sm">Type:</label>
                <button
                  onClick={() => setIsMovie(null)}
                  className={`px-4 py-2 rounded-lg ${
                    isMovie === null
                      ? "bg-orange-500 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setIsMovie(true)}
                  className={`px-4 py-2 rounded-lg ${
                    isMovie === true
                      ? "bg-orange-500 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Movies
                </button>
                <button
                  onClick={() => setIsMovie(false)}
                  className={`px-4 py-2 rounded-lg ${
                    isMovie === false
                      ? "bg-orange-500 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  TV Shows
                </button>
              </div>

              {/* Year Filter */}
              <div className="flex items-center space-x-2 relative">
                <label htmlFor="yearInput" className="text-sm">
                  Year:
                </label>
                <input
                  type="number"
                  id="yearInput"
                  placeholder="YYYY"
                  value={year}
                  onChange={(e) => {
                    if (e.target.value.length <= 4) {
                      setYear(e.target.value);
                    }
                  }}
                  className={`px-4 py-2 bg-gray-800 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    year && year.length !== 4 ? "border-red-500" : ""
                  }`}
                  aria-label="Year filter"
                  maxLength={4}
                />
                {year && (
                  <button
                    onClick={() => setYear("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    aria-label="Clear year filter"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Genre Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm">Genre:</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="px-4 py-2 bg-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All Genres</option>
                  {genres.map((genre) => (
                    <option key={genre.id} value={genre.id}>
                      {genre.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="max-w-4xl mx-auto mt-8">
          {loading ? (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-between">
              <Mosaic color="#ff7f50" size="medium" text="" textColor="" />
            </div>
          ) : query ? (
            results.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {results.map((item) => (
                  <MovieCard
                    key={item.id}
                    movie={item}
                    onClick={() =>
                      router.push(`/${item.media_type}/${item.id}`)
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-300">No results found.</p>
            )
          ) : (
            <div>
              <h2 className="text-2xl font-bold mb-6">Most Searched</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {mostSearched.map((item) => (
                  <MovieCard
                    key={item.id}
                    movie={item}
                    onClick={() =>
                      router.push(`/${item.media_type}/${item.id}`)
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SearchPage;
