import { useEffect, useState } from "react";
import MovieCard from "../../components/MinimalCard"; // Import your card component
import NavBar from "../../components/Navbar"; // Import your navbar component
import Footer from "../../components/Footer";
import TrendingCard from "../../components/TrendingCard";
import TrendingShows from "../../components/TrendingShows";
import { FaFilter, FaFire, FaEye, FaStar } from "react-icons/fa";
import { FaGripLinesVertical } from "react-icons/fa";
import { Mosaic } from "react-loading-indicators"; // Import Mosaic

const MovieList = () => {
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [mostWatchedMovies, setMostWatchedMovies] = useState([]);
  const [highestRatedMovies, setHighestRatedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highestRatedShows, setHighestRatedShows] = useState([]);
  const [trendingShows, setTrendingShows] = useState([]);

  const apiKey = process.env.NEXT_PUBLIC_API_KEY;

  // Fetch Trending Movies
  useEffect(() => {
    const fetchTrendingMovies = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch trending movies");
        }
        const data = await response.json();
        setTrendingMovies(data.results.slice(0, 20)); // Get the first 20 trending movies
      } catch (error) {
        setError(error.message);
      }
    };

    fetchTrendingMovies();
  }, [apiKey]);

  // Fetch Most Watched Movies
  useEffect(() => {
    const fetchMostWatchedMovies = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=en-US&sort_by=popularity.desc&page=1`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch most watched movies");
        }
        const data = await response.json();
        setMostWatchedMovies(data.results.slice(0, 20)); // Get the first 20 most watched movies
      } catch (error) {
        setError(error.message);
      }
    };

    fetchMostWatchedMovies();
  }, [apiKey]);

  // Fetch Highest Rated Movies
  useEffect(() => {
    const fetchHighestRatedMovies = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=en-US&sort_by=vote_average.desc&vote_count.gte=1000&page=1`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch highest rated movies");
        }
        const data = await response.json();
        setHighestRatedMovies(data.results.slice(0, 20)); // Get the first 20 highest rated movies
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHighestRatedMovies();
  }, [apiKey]);

  const fetchHighestRatedShows = async () => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=en-US&sort_by=vote_average.desc&vote_count.gte=100&page=1` // Adjusted vote_count for TV shows
      );
      if (!response.ok) {
        throw new Error("Failed to fetch highest rated shows");
      }
      const data = await response.json();
      setHighestRatedShows(data.results.slice(0, 20)); // Get the first 20 highest rated shows
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const fetchTrendingShows = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/trending/tv/day?api_key=${apiKey}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch trending shows");
        }
        const data = await response.json();
        setTrendingShows(data.results.slice(0, 20)); // Get the first 20 trending shows
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchHighestRatedShows = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=en-US&sort_by=vote_average.desc&vote_count.gte=100&page=1`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch highest rated shows");
        }
        const data = await response.json();
        setHighestRatedShows(data.results.slice(0, 20)); // Get the first 20 highest rated shows
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    // Call both functions
    fetchHighestRatedShows();
    fetchTrendingShows();
  }, [apiKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <Mosaic color="#ff7f50" size="medium" text="" textColor="" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-primary text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="bg-primary text-white pt-24">
      <NavBar />
      {/* Hero Section */}
      <div className="px-6">
        <TrendingCard />
      </div>

      {/* Trending Movies Section */}
      <section className="px-6 my-8">
        <div className="flex items-center gap-4 mb-6">
          <FaGripLinesVertical className="text-2xl" />
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FaFire className="text-orange-500" /> Trending Now
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {trendingMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </section>

      {/* Highest Rated Movies Section */}
      {/* <section className="px-6 my-8">
        <div className="flex items-center gap-4 mb-6">
          <FaGripLinesVertical className="text-2xl" />
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FaStar className="text-yellow-500" /> Highest Rated
          </h2>
          <FaFilter className="text-gray-400 cursor-pointer hover:text-orange-500" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {highestRatedMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </section> */}

      <TrendingShows />

      {/* Highest Rated Shows Section */}
      {/* <section className="px-6 my-8">
        <div className="flex items-center gap-4 mb-6">
          <FaGripLinesVertical className="text-2xl" />
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FaStar className="text-yellow-500" /> Highest Rated Shows
          </h2>
          <FaFilter className="text-gray-400 cursor-pointer hover:text-orange-500" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {highestRatedShows.map((show) => (
            <MovieCard key={show.id} movie={{ ...show, media_type: "tv" }} />
          ))}
        </div>
      </section> */}

      {/* Trending Shows Section */}
      <section className="px-6 my-8">
        <div className="flex items-center gap-4 mb-6">
          <FaGripLinesVertical className="text-2xl" />
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FaStar className="text-yellow-500" /> Trending Shows
          </h2>
          <FaFilter className="text-gray-400 cursor-pointer hover:text-orange-500" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {trendingShows.map((show) => (
            <MovieCard key={show.id} movie={{ ...show, media_type: "tv" }} />
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default MovieList;
