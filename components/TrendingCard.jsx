// components/TrendingMovies.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { Mosaic } from "react-loading-indicators";
import { useSwipeable } from "react-swipeable";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";

const TrendingMovies = () => {
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const router = useRouter();
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [movieDetails, setMovieDetails] = useState(null);
  const intervalRef = useRef(null);

  // Fetch trending movies list
  useEffect(() => {
    setLoadingList(true);
    const fetchTrending = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/trending/movie/day?language=en-US`, {
          params: { api_key: API_KEY },
        });
        const validMovies = response.data.results.filter(
            m => m.backdrop_path && m.overview && m.title && m.id
        ).slice(0, 10);
        setTrendingMovies(validMovies);
        if (validMovies.length > 0) {
            setCurrentMovieIndex(0);
        }
      } catch (error) {
        console.error("Error fetching trending movies:", error);
         setTrendingMovies([]);
      } finally {
        setLoadingList(false);
      }
    };
    fetchTrending();
  }, []);

   // Fetch details for the current movie
   useEffect(() => {
    let isMounted = true;
    if (trendingMovies.length > 0) {
      const currentMovie = trendingMovies[currentMovieIndex];
      if (!currentMovie) return;

      setLoadingDetails(true);
      setMovieDetails(prevDetails => prevDetails?.id === currentMovie.id ? prevDetails : null);

      const fetchMovieDetails = async () => {
        try {
          const response = await axios.get(`${BASE_URL}/movie/${currentMovie.id}`, {
            params: {
              api_key: API_KEY,
              append_to_response: "credits,genres",
              language: "en-US",
            },
          });
          if (isMounted) {
            if (response.data.id === trendingMovies[currentMovieIndex]?.id) {
                 setMovieDetails(response.data);
            }
          }
        } catch (error) {
          console.error(`Error fetching movie details for ID ${currentMovie.id}:`, error);
           if (isMounted && trendingMovies[currentMovieIndex]?.id === currentMovie.id) {
                setMovieDetails(null);
           }
        } finally {
           if (isMounted && trendingMovies[currentMovieIndex]?.id === currentMovie.id) {
                setLoadingDetails(false);
           }
        }
      };

      const detailFetchTimeout = setTimeout(fetchMovieDetails, 150);
      return () => {
          isMounted = false;
          clearTimeout(detailFetchTimeout);
       };
    } else {
        setMovieDetails(null);
        setLoadingDetails(false);
    }
   }, [trendingMovies, currentMovieIndex]);

  // Auto-rotation
  const startAutoRotate = useCallback(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
          paginate(1);
      }, 7000);
  }, [trendingMovies.length]); // Use length in dependency

  useEffect(() => {
      if (trendingMovies.length > 1) startAutoRotate();
      return () => {
          if (intervalRef.current) clearInterval(intervalRef.current);
      };
  }, [trendingMovies.length, startAutoRotate]); // Add startAutoRotate

  // Navigation Logic
  const paginate = (newDirection) => {
      if (trendingMovies.length <= 1) return;
      let newIndex = currentMovieIndex + newDirection;
      if (newIndex < 0) newIndex = trendingMovies.length - 1;
      else if (newIndex >= trendingMovies.length) newIndex = 0;
      setDirection(newDirection);
      setCurrentMovieIndex(newIndex);
      startAutoRotate(); // Reset timer
  };

   const goToIndex = (index) => {
        if (index === currentMovieIndex || trendingMovies.length <= 1) return;
        setDirection(index > currentMovieIndex ? 1 : -1);
        setCurrentMovieIndex(index);
        startAutoRotate(); // Reset timer
   }

  // Swipe handlers
  const handlers = useSwipeable({
    onSwipedLeft: () => paginate(1),
    onSwipedRight: () => paginate(-1),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  // --- ROUTING CHANGE ---
  const handleWatch = (movieId) => {
    // Navigate directly to the watch page with movie_id query parameter
    router.push(`/watch?movie_id=${movieId}`);
  };
  // --- END ROUTING CHANGE ---

  // Framer Motion Variants
  const variants = {
    enter: (direction) => ({ x: direction > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction) => ({ zIndex: 0, x: direction < 0 ? "100%" : "-100%", opacity: 0 }),
  };

   const textVariants = {
     hidden: { opacity: 0, y: 25 },
     visible: (delay = 0) => ({
       opacity: 1,
       y: 0,
       transition: { duration: 0.6, ease: "easeInOut", delay }
     }),
     exit: {
        opacity: 0,
        y: -15,
        transition: { duration: 0.2, ease: "easeIn" }
     }
   };

  // --- Render ---
  if (loadingList) {
    return (
      // Adjusted height and added margin for loading state
      <div className="h-[60vh] mt-16 flex items-center justify-center bg-gray-900 text-white">
        <Mosaic color="#ff7f50" size="medium" />
      </div>
    );
  }

  if (trendingMovies.length === 0) {
    return (
      // Adjusted height and added margin for empty state
      <div className="h-[60vh] mt-16 flex items-center justify-center bg-gray-900 text-white">
        <p>No trending movies found.</p>
      </div>
    );
  }

  const currentMovie = trendingMovies[currentMovieIndex];
  if (!currentMovie) return null;
  const showDetails = !loadingDetails && movieDetails && movieDetails.id === currentMovie.id;

  return (
    // --- ADDED MARGIN TOP (mt-16) ---
    <div className="relative w-full h-[60vh] overflow-hidden font-poppins bg-black mt-0" {...handlers}>
    {/* --- END MARGIN TOP --- */}

      {/* Background Image Slider */}
      <AnimatePresence initial={false} custom={direction} mode="sync">
        <motion.div
          key={currentMovieIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 250, damping: 30 },
            opacity: { duration: 0.3 }
          }}
          className="absolute inset-0"
        >
           <div className="absolute inset-0 z-0">
             <img
                src={`${IMAGE_BASE_URL}${currentMovie.backdrop_path}`}
                alt={`${currentMovie.title} backdrop`}
                className="w-full h-full object-cover"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
             <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent opacity-80"></div>
           </div>
        </motion.div>
      </AnimatePresence>


      {/* Content Overlay */}
      <div className="relative z-10 h-full flex flex-col justify-end items-start text-white p-6 md:p-10 lg:p-12">
         <AnimatePresence mode="wait">
            {showDetails ? (
              <motion.div
                key={movieDetails.id}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
                className="max-w-lg md:max-w-xl"
               >
                <motion.h1 variants={textVariants} custom={0} className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3 drop-shadow-lg leading-tight">
                  {movieDetails.title}
                </motion.h1>

                 <motion.div variants={textVariants} custom={0.1} className="flex flex-wrap items-center gap-2 mb-3 md:mb-4">
                  {movieDetails.genres.slice(0, 3).map((genre) => (
                    <span key={genre.id} className="bg-white/15 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs md:text-sm font-medium">
                      {genre.name}
                    </span>
                  ))}
                  {movieDetails.vote_average > 0 && (
                    <span className="bg-white/15 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs md:text-sm font-medium flex items-center gap-1">
                       ⭐ {movieDetails.vote_average.toFixed(1)}
                    </span>
                  )}
                 </motion.div>

                <motion.p variants={textVariants} custom={0.2} className="text-sm md:text-base text-gray-200 mb-5 md:mb-6 line-clamp-2 md:line-clamp-3 leading-relaxed">
                  {movieDetails.overview}
                </motion.p>

                 {/* --- BUTTON TEXT CHANGE --- */}
                 <motion.button
                    variants={textVariants}
                    custom={0.3}
                    onClick={() => handleWatch(currentMovie.id)} // Calls updated handleWatch
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-red-500 hover:to-orange-500 text-white font-semibold py-2 px-5 md:py-2.5 md:px-7 rounded-full text-sm md:text-base shadow-lg transition-all duration-300 transform hover:scale-105"
                    whileTap={{ scale: 0.95 }}
                 >
                   Watch Now <span className="ml-1" aria-hidden="true">&rarr;</span>
                 </motion.button>
                 {/* --- END BUTTON TEXT CHANGE --- */}

              </motion.div>
            ) : (
                 // Loading Placeholder
                 <motion.div
                    key={currentMovie.id + "-loading"}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                    className="max-w-lg md:max-w-xl"
                 >
                    <div className="h-8 md:h-10 bg-gray-700/50 rounded w-3/4 mb-3 animate-pulse"></div>
                    <div className="flex gap-2 mb-4">
                        <div className="h-5 md:h-6 bg-gray-700/50 rounded-full w-16 md:w-20 animate-pulse"></div>
                        <div className="h-5 md:h-6 bg-gray-700/50 rounded-full w-16 md:w-20 animate-pulse"></div>
                    </div>
                    <div className="h-4 bg-gray-700/50 rounded w-full mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-700/50 rounded w-5/6 mb-6 animate-pulse"></div>
                    <div className="h-10 md:h-11 bg-gray-700/50 rounded-full w-36 md:w-40 animate-pulse"></div>
                 </motion.div>
             )}
         </AnimatePresence>
      </div>

      {/* Navigation Arrows (Desktop) */}
      <button onClick={() => paginate(-1)} className="absolute left-2 md:left-4 top-1/2 z-20 transform -translate-y-1/2 p-2 bg-black/40 rounded-full text-white hover:bg-black/60 transition-opacity duration-200 hidden md:block opacity-70 hover:opacity-100" aria-label="Previous Movie">
        <FiChevronLeft size={24} />
      </button>
      <button onClick={() => paginate(1)} className="absolute right-2 md:right-4 top-1/2 z-20 transform -translate-y-1/2 p-2 bg-black/40 rounded-full text-white hover:bg-black/60 transition-opacity duration-200 hidden md:block opacity-70 hover:opacity-100" aria-label="Next Movie">
        <FiChevronRight size={24} />
      </button>

      {/* Navigation Dots */}
      <div className="absolute bottom-4 md:bottom-5 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2.5">
        {trendingMovies.map((_, index) => (
          <button
            key={index}
            onClick={() => goToIndex(index)}
            className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all duration-300 ease-in-out cursor-pointer
                        ${currentMovieIndex === index ? 'bg-white scale-125 ring-2 ring-white/50 ring-offset-2 ring-offset-black/30' : 'bg-white/40 hover:bg-white/70'}`}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={currentMovieIndex === index ? 'step' : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default TrendingMovies;