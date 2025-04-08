// pages/index.js or pages/home.js (or wherever MovieList is)
import { useEffect, useState } from "react";
import MovieCard from "../../components/MinimalCard"; // Adjust path
import NavBar from "../../components/NavBar";       // Adjust path
import Footer from "../../components/Footer";       // Adjust path
import TrendingMovies from "../../components/TrendingMovies"; // Adjust path
import TrendingShows from "../../components/TrendingShows";   // Adjust path
import { FaFire, FaStar } from "react-icons/fa"; // Removed unused icons
import { Mosaic } from "react-loading-indicators";
import axios from "axios"; // Using axios for consistency
import { motion } from "framer-motion";
import { useRouter } from "next/router";

const MovieList = () => {
  const [trendingMovies, setTrendingMovies] = useState([]);
  // const [mostWatchedMovies, setMostWatchedMovies] = useState([]); // Optional
  const [highestRatedMovies, setHighestRatedMovies] = useState([]);
  const [trendingShows, setTrendingShows] = useState([]);
  const [highestRatedShows, setHighestRatedShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  const BASE_URL = "https://api.themoviedb.org/3";

  // Consolidated Data Fetching
  useEffect(() => {
    if (!apiKey) {
        setError("API Key is missing.");
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);

    const fetchAllData = async () => {
      try {
        const endpoints = [
          `${BASE_URL}/trending/movie/week?api_key=${apiKey}&language=en-US&page=1`,
          `${BASE_URL}/discover/movie?api_key=${apiKey}&language=en-US&sort_by=vote_average.desc&vote_count.gte=1000&page=1`,
          `${BASE_URL}/trending/tv/week?api_key=${apiKey}&language=en-US&page=1`,
          `${BASE_URL}/discover/tv?api_key=${apiKey}&language=en-US&sort_by=vote_average.desc&vote_count.gte=500&page=1`,
          // Optional: Popular Movies endpoint
          // `${BASE_URL}/discover/movie?api_key=${apiKey}&language=en-US&sort_by=popularity.desc&page=1`,
        ];

        const responses = await Promise.all(
            endpoints.map(url => axios.get(url))
        );

        const filterAndSlice = (results) => (results || []).filter(item => item.poster_path).slice(0, 15);

        setTrendingMovies(filterAndSlice(responses[0]?.data?.results));
        setHighestRatedMovies(filterAndSlice(responses[1]?.data?.results));
        setTrendingShows(filterAndSlice(responses[2]?.data?.results));
        setHighestRatedShows(filterAndSlice(responses[3]?.data?.results));
        // if (responses[4]) setMostWatchedMovies(filterAndSlice(responses[4]?.data?.results));

      } catch (err) {
        console.error("Error fetching homepage data:", err);
        if (err.response) { setError(`API Error: ${err.response.data?.status_message || err.message}`); }
        else if (err.request) { setError("Network error. Please check your connection."); }
        else { setError(`Failed to load data: ${err.message}`); }
        setTrendingMovies([]); setHighestRatedMovies([]); setTrendingShows([]); setHighestRatedShows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [apiKey]);

  // Card hover variants
  const cardHoverVariants = {
     rest: { scale: 1, transition: { duration: 0.2 } },
     hover: { scale: 1.05, y: -5, transition: { duration: 0.2 } }
  }

  // Helper component for Carousel Section
  const CarouselSection = ({ title, icon: Icon, data, mediaType }) => {
    const router = useRouter();
    if (!data || data.length === 0) return null;
    
    
  
    return (
      <section className="mb-10 md:mb-12">
        <div className="flex items-center gap-3 mb-4 px-4 md:px-0">
          <Icon className="text-accent text-xl md:text-2xl" />
          <h2 className="text-xl md:text-2xl font-semibold text-textprimary">{title}</h2>
        </div>
        
        <div className="flex overflow-x-auto space-x-4 md:space-x-6 pb-4 scrollbar-hide pl-4 md:pl-0 hide-scrollbar" >
          {data.map((item) => (
            <motion.div
              key={`${mediaType}-${item.id}`}
              className="flex-shrink-0 w-36 md:w-44 lg:w-48 cursor-pointer"
              variants={cardHoverVariants}
              initial="rest"
              whileHover="hover"
              
            >
              <MovieCard
                movie={item}
                media_type={mediaType}
              />
            </motion.div>
          ))}
          <div className="flex-shrink-0 w-1"></div>
        </div>
      </section>
    );
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center">
        <NavBar />
        <div className="flex-grow flex items-center justify-center">
            <Mosaic color="#DAA520" size="medium" /> {/* Accent Color */}
        </div>
        <Footer />
      </div>
    );
  }

  return (
    // Themed background and text
    <div className="bg-primary text-textprimary min-h-screen flex flex-col font-poppins">
      <NavBar />

      {/* Wrapper with pt-16 to offset fixed NavBar */}
      <div className="flex-grow">

        {/* Hero Sections - Assuming these have mt-16 internally */}
        {/* If not, remove pt-16 above and add mt-16 to these two */}
        <TrendingMovies />
        

        {/* Main content area with padding */}
        <main className="px-4 md:px-6 lg:px-8 py-8 md:py-10 max-w-full mx-auto">
           {error && ( // Themed error display
             <div className="mb-8 p-4 bg-red-900/30 border border-red-700/50 text-red-300 rounded-md text-center">
               Error loading some sections: {error}
             </div>
           )}

            {/* Carousel Sections */}
            <CarouselSection title="Trending Movies" icon={FaFire} data={trendingMovies} mediaType="movie" />
            <CarouselSection title="Highest Rated Movies" icon={FaStar} data={highestRatedMovies} mediaType="movie" />
            <TrendingShows />
            <CarouselSection title="Trending Shows" icon={FaFire} data={trendingShows} mediaType="tv" />
            <CarouselSection title="Highest Rated Shows" icon={FaStar} data={highestRatedShows} mediaType="tv" />

            {/* Add Most Watched/Popular section if desired */}
            {/* <CarouselSection title="Most Popular Movies" icon={FaEye} data={mostWatchedMovies} mediaType="movie" /> */}

        </main>
      </div>

      <Footer />
    </div>
  );
};

export default MovieList;