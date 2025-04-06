// components/TrendingShows.js
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

const TrendingShows = () => {
  const [trendingShows, setTrendingShows] = useState([]);
  const [currentShowIndex, setCurrentShowIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const router = useRouter();
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetails, setShowDetails] = useState(null); // Renamed state
  const intervalRef = useRef(null);

  // Fetch trending shows list
  useEffect(() => {
    setLoadingList(true);
    const fetchTrending = async () => {
      try {
        // Fetch TV shows
        const response = await axios.get(`${BASE_URL}/trending/tv/day?language=en-US`, {
          params: { api_key: API_KEY },
        });
        // Filter shows that have necessary details
        const validShows = response.data.results.filter(
            s => s.backdrop_path && s.overview && s.name && s.id // Use 'name' for TV shows
        ).slice(0, 10); // Limit to e.g., 10 shows
        setTrendingShows(validShows); // Update state
        if (validShows.length > 0) {
            setCurrentShowIndex(0); // Reset index
        }
      } catch (error) {
        console.error("Error fetching trending shows:", error);
         setTrendingShows([]); // Update state
      } finally {
        setLoadingList(false);
      }
    };
    fetchTrending();
  }, []);

   // Fetch details for the current show
   useEffect(() => {
    let isMounted = true;
    if (trendingShows.length > 0) {
      const currentShow = trendingShows[currentShowIndex];
      if (!currentShow) return;

      setLoadingDetails(true);
      // Clear details ONLY if the ID actually changed
      setShowDetails(prevDetails => prevDetails?.id === currentShow.id ? prevDetails : null);

      const fetchShowDetails = async () => {
        try {
           // Use /tv/{id} endpoint
          const response = await axios.get(`${BASE_URL}/tv/${currentShow.id}`, {
            params: {
              api_key: API_KEY,
              append_to_response: "credits,genres,content_ratings", // Append ratings if needed
              language: "en-US",
            },
          });
          if (isMounted) {
            if (response.data.id === trendingShows[currentShowIndex]?.id) {
                 setShowDetails(response.data); // Update state
            }
          }
        } catch (error) {
          console.error(`Error fetching show details for ID ${currentShow.id}:`, error);
           if (isMounted && trendingShows[currentShowIndex]?.id === currentShow.id) {
                setShowDetails(null); // Update state
           }
        } finally {
           if (isMounted && trendingShows[currentShowIndex]?.id === currentShow.id) {
                setLoadingDetails(false);
           }
        }
      };

      const detailFetchTimeout = setTimeout(fetchShowDetails, 150);
      return () => {
          isMounted = false;
          clearTimeout(detailFetchTimeout);
       };
    } else {
        setShowDetails(null);
        setLoadingDetails(false);
    }
   }, [trendingShows, currentShowIndex]); // Re-fetch when index changes

  // Auto-rotation
  const startAutoRotate = useCallback(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
          paginate(1);
      }, 7000);
  }, [trendingShows.length]); // Dependency based on length

  useEffect(() => {
      if (trendingShows.length > 1) startAutoRotate();
      return () => {
          if (intervalRef.current) clearInterval(intervalRef.current);
      };
  }, [trendingShows.length, startAutoRotate]);

  // Navigation Logic
  const paginate = (newDirection) => {
      if (trendingShows.length <= 1) return;
      let newIndex = currentShowIndex + newDirection; // Use currentShowIndex
      if (newIndex < 0) newIndex = trendingShows.length - 1;
      else if (newIndex >= trendingShows.length) newIndex = 0;
      setDirection(newDirection);
      setCurrentShowIndex(newIndex); // Use setCurrentShowIndex
      startAutoRotate();
  };

   const goToIndex = (index) => {
        if (index === currentShowIndex || trendingShows.length <= 1) return;
        setDirection(index > currentShowIndex ? 1 : -1);
        setCurrentShowIndex(index); // Use setCurrentShowIndex
        startAutoRotate();
   }

  // Swipe handlers
  const handlers = useSwipeable({
    onSwipedLeft: () => paginate(1),
    onSwipedRight: () => paginate(-1),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  // Routing action for the button
  const handleWatch = (showId) => {
     // Route to TV watch page with tv_id query parameter
    router.push(`/watchTv?tv_id=${showId}`);
  };

  // Framer Motion Variants (Identical to TrendingMovies)
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
      <div className="h-[60vh] mt-16 flex items-center justify-center bg-gray-900 text-white"> {/* Added mt-16 */}
        <Mosaic color="#ff7f50" size="medium" />
      </div>
    );
  }

  if (trendingShows.length === 0) {
    return (
      <div className="h-[60vh] flex items-center justify-center bg-gray-900 text-white"> {/* Added mt-16 */}
        <p>No trending shows found.</p> {/* Updated text */}
      </div>
    );
  }

  // Get the current show after ensuring list is not empty
  const currentShow = trendingShows[currentShowIndex];
  if (!currentShow) return null;

  // Check if details are ready and match the current show
  const detailsReady = !loadingDetails && showDetails && showDetails.id === currentShow.id;

  return (
    // Added mt-16 for spacing below NavBar
    <div className="relative w-full h-[60vh] overflow-hidden font-poppins bg-black" {...handlers}>

      {/* Background Image Slider */}
      <AnimatePresence initial={false} custom={direction} mode="sync">
        <motion.div
          key={currentShowIndex} // Use index as key
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
                src={`${IMAGE_BASE_URL}${currentShow.backdrop_path}`}
                alt={`${currentShow.name} backdrop`} // Use name
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
            {detailsReady ? ( // Use detailsReady flag
              <motion.div
                key={showDetails.id} // Key needs to be unique to the content
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
                className="max-w-lg md:max-w-xl"
               >
                <motion.h1 variants={textVariants} custom={0} className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3 drop-shadow-lg leading-tight">
                  {showDetails.name} {/* Use name */}
                </motion.h1>

                 <motion.div variants={textVariants} custom={0.1} className="flex flex-wrap items-center gap-2 mb-3 md:mb-4">
                  {showDetails.genres.slice(0, 3).map((genre) => (
                    <span key={genre.id} className="bg-white/15 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs md:text-sm font-medium">
                      {genre.name}
                    </span>
                  ))}
                  {showDetails.vote_average > 0 && (
                    <span className="bg-white/15 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs md:text-sm font-medium flex items-center gap-1">
                       ⭐ {showDetails.vote_average.toFixed(1)}
                    </span>
                  )}
                 </motion.div>

                <motion.p variants={textVariants} custom={0.2} className="text-sm md:text-base text-gray-200 mb-5 md:mb-6 line-clamp-2 md:line-clamp-3 leading-relaxed">
                  {showDetails.overview}
                </motion.p>

                 {/* Updated Button Text and Action */}
                 <motion.button
                    variants={textVariants}
                    custom={0.3}
                    onClick={() => handleWatch(currentShow.id)} // Pass show ID
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-red-500 hover:to-orange-500 text-white font-semibold py-2 px-5 md:py-2.5 md:px-7 rounded-full text-sm md:text-base shadow-lg transition-all duration-300 transform hover:scale-105"
                    whileTap={{ scale: 0.95 }}
                 >
                   Watch Now <span className="ml-1" aria-hidden="true">&rarr;</span>
                 </motion.button>
                 {/* End Updated Button */}

              </motion.div>
            ) : (
                 // Loading Placeholder
                 <motion.div
                    key={currentShow.id + "-loading"}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                    className="max-w-lg md:max-w-xl"
                 >
                    {/* Skeleton remains the same visually */}
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
      <button onClick={() => paginate(-1)} className="absolute left-2 md:left-4 top-1/2 z-20 transform -translate-y-1/2 p-2 bg-black/40 rounded-full text-white hover:bg-black/60 transition-opacity duration-200 hidden md:block opacity-70 hover:opacity-100" aria-label="Previous Show"> {/* Updated aria-label */}
        <FiChevronLeft size={24} />
      </button>
      <button onClick={() => paginate(1)} className="absolute right-2 md:right-4 top-1/2 z-20 transform -translate-y-1/2 p-2 bg-black/40 rounded-full text-white hover:bg-black/60 transition-opacity duration-200 hidden md:block opacity-70 hover:opacity-100" aria-label="Next Show"> {/* Updated aria-label */}
        <FiChevronRight size={24} />
      </button>

      {/* Navigation Dots */}
      <div className="absolute bottom-4 md:bottom-5 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2.5">
        {trendingShows.map((_, index) => ( // Map over trendingShows
          <button
            key={index}
            onClick={() => goToIndex(index)}
            className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all duration-300 ease-in-out cursor-pointer
                        ${currentShowIndex === index ? 'bg-white scale-125 ring-2 ring-white/50 ring-offset-2 ring-offset-black/30' : 'bg-white/40 hover:bg-white/70'}`} // Use currentShowIndex
            aria-label={`Go to slide ${index + 1}`}
            aria-current={currentShowIndex === index ? 'step' : undefined} // Use currentShowIndex
          />
        ))}
      </div>
    </div>
  );
};

export default TrendingShows; // Update export