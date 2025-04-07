import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { Mosaic } from "react-loading-indicators";
import { useSwipeable } from "react-swipeable";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { FaStar } from 'react-icons/fa';

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
  const [showDetails, setShowDetails] = useState(null);
  const intervalRef = useRef(null);

  // Fetch trending shows list
  useEffect(() => {
    setLoadingList(true);
    const fetchTrending = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/trending/tv/day?language=en-US`, { // Fetch TV
          params: { api_key: API_KEY },
        });
        const validShows = response.data.results.filter( // Use 's' for show
            s => s.backdrop_path && s.overview && s.name && s.id // Check 'name'
        ).slice(0, 10);
        setTrendingShows(validShows); // Set shows
        if (validShows.length > 0) {
            setCurrentShowIndex(0); // Set show index
        }
      } catch (error) {
        console.error("Error fetching trending shows:", error);
         setTrendingShows([]); // Set shows
      } finally {
        setLoadingList(false);
      }
    };
    fetchTrending();
  }, [API_KEY]); // Added API_KEY dependency

   // Fetch details for the current show
   useEffect(() => {
    let isMounted = true;
    if (trendingShows.length > 0) {
      const currentShow = trendingShows[currentShowIndex]; // Use currentShow
      if (!currentShow) return;

      setLoadingDetails(true);
      setShowDetails(prevDetails => prevDetails?.id === currentShow.id ? prevDetails : null); // Use showDetails

      const fetchShowDetails = async () => { // Fetch show details
        try {
          const response = await axios.get(`${BASE_URL}/tv/${currentShow.id}`, { // Use /tv endpoint
            params: {
              api_key: API_KEY,
              append_to_response: "credits,genres,content_ratings",
              language: "en-US",
            },
          });
          if (isMounted) {
            // Check against currentShowIndex again
            if (response.data.id === trendingShows[currentShowIndex]?.id) {
                 setShowDetails(response.data); // Set showDetails
            }
          }
        } catch (error) {
          console.error(`Error fetching show details for ID ${currentShow.id}:`, error);
           if (isMounted && trendingShows[currentShowIndex]?.id === currentShow.id) {
                setShowDetails(null); // Set showDetails
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
        setShowDetails(null); // Set showDetails
        setLoadingDetails(false);
    }
   }, [trendingShows, currentShowIndex, API_KEY]); // Added API_KEY dependency

  // Auto-rotation (logic remains the same)
  const startAutoRotate = useCallback(() => { if (intervalRef.current) clearInterval(intervalRef.current); intervalRef.current = setInterval(() => { paginate(1); }, 7000); }, [trendingShows.length]);
  useEffect(() => { if (trendingShows.length > 1) startAutoRotate(); return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, [trendingShows.length, startAutoRotate]);

  // Navigation Logic (logic remains the same, uses TV state vars)
  const paginate = (newDirection) => { if (trendingShows.length <= 1) return; let newIndex = currentShowIndex + newDirection; if (newIndex < 0) newIndex = trendingShows.length - 1; else if (newIndex >= trendingShows.length) newIndex = 0; setDirection(newDirection); setCurrentShowIndex(newIndex); startAutoRotate(); };
   const goToIndex = (index) => { if (index === currentShowIndex || trendingShows.length <= 1) return; setDirection(index > currentShowIndex ? 1 : -1); setCurrentShowIndex(index); startAutoRotate(); }

  // Swipe handlers (logic remains the same)
  const handlers = useSwipeable({ onSwipedLeft: () => paginate(1), onSwipedRight: () => paginate(-1), preventDefaultTouchmoveEvent: true, trackMouse: true, });

  // Routing - Navigate to TV watch page
  const handleWatch = (showId) => {
    router.push(`/watchTv?tv_id=${showId}`); // Correct route for TV
  };

  // Framer Motion Variants (Identical)
  const variants = { enter: (direction) => ({ x: direction > 0 ? "100%" : "-100%", opacity: 0 }), center: { zIndex: 1, x: 0, opacity: 1 }, exit: (direction) => ({ zIndex: 0, x: direction < 0 ? "100%" : "-100%", opacity: 0 }), };
   const textVariants = { hidden: { opacity: 0, y: 25 }, visible: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeInOut", delay } }), exit: { opacity: 0, y: -15, transition: { duration: 0.2, ease: "easeIn" } } };

  // --- Render ---
  if (loadingList) {
    return (
      // Themed Loader, Added mt-16
      <div className="h-[60vh] mt-16 flex items-center justify-center bg-primary text-textprimary">
        <Mosaic color="#DAA520" size="medium" />
      </div>
    );
  }

  if (trendingShows.length === 0) {
    return (
      // Themed Empty State, Added mt-16
      <div className="h-[60vh] mt-16 flex items-center justify-center bg-primary text-textsecondary">
        <p>No trending shows found.</p> {/* Updated text */}
      </div>
    );
  }

  const currentShow = trendingShows[currentShowIndex]; // Use currentShow
  if (!currentShow) return null;
  const detailsReady = !loadingDetails && showDetails && showDetails.id === currentShow.id; // Use showDetails

  return (
    // --- ADDED MARGIN TOP (mt-16), Themed Background ---
    <div className="relative w-full h-[60vh] overflow-hidden font-poppins bg-primary mt-16" {...handlers}>

      {/* Background Image Slider */}
      <AnimatePresence initial={false} custom={direction} mode="sync">
        <motion.div
          key={currentShowIndex} // Use show index
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ x: { type: "spring", stiffness: 250, damping: 30 }, opacity: { duration: 0.3 } }}
          className="absolute inset-0"
        >
           <div className="absolute inset-0 z-0">
             <img
                src={`${IMAGE_BASE_URL}${currentShow.backdrop_path}`} // Use currentShow
                alt={`${currentShow.name} backdrop`} // Use name
                className="w-full h-full object-cover"
             />
             {/* Themed Gradients */}
             <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/70 to-transparent"></div>
             <div className="absolute inset-0 bg-gradient-to-r from-primary/70 via-transparent to-transparent opacity-80"></div>
           </div>
        </motion.div>
      </AnimatePresence>


      {/* Content Overlay - ADJUSTED PADDING */}
      <div className="relative z-10 h-full flex flex-col justify-end items-start text-textprimary px-6 pt-6 pb-20 md:px-10 md:pt-10 md:pb-24 lg:px-12 lg:pt-12 lg:pb-28">
         <AnimatePresence mode="wait">
            {detailsReady ? ( // Use detailsReady
              <motion.div
                key={showDetails.id} // Use showDetails id
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
                className="max-w-lg md:max-w-xl"
               >
                <motion.h1 variants={textVariants} custom={0} className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3 drop-shadow-lg leading-tight text-textprimary">
                  {showDetails.name} {/* Use showDetails name */}
                </motion.h1>

                 <motion.div variants={textVariants} custom={0.1} className="flex flex-wrap items-center gap-2 mb-3 md:mb-4">
                  {showDetails.genres.slice(0, 3).map((genre) => (
                    <span key={genre.id} className="bg-secondary/70 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs md:text-sm font-medium text-textsecondary border border-secondary-light">
                      {genre.name}
                    </span>
                  ))}
                  {showDetails.vote_average > 0 && (
                    <span className="bg-secondary/70 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs md:text-sm font-medium flex items-center gap-1 text-textprimary">
                       <FaStar className="text-accent" />
                       {showDetails.vote_average.toFixed(1)}
                    </span>
                  )}
                 </motion.div>

                <motion.p variants={textVariants} custom={0.2} className="text-sm md:text-base text-textsecondary mb-5 md:mb-6 line-clamp-2 md:line-clamp-3 leading-relaxed">
                  {showDetails.overview}
                </motion.p>

                 <motion.button
                    variants={textVariants}
                    custom={0.3}
                    onClick={() => handleWatch(currentShow.id)} // Pass show ID
                    className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-5 md:py-2.5 md:px-7 rounded-full text-sm md:text-base shadow-lg transition-all duration-300 transform hover:scale-105" // Themed button
                    whileTap={{ scale: 0.95 }}
                 >
                   Watch Now <span className="ml-1" aria-hidden="true">&rarr;</span>
                 </motion.button>

              </motion.div>
            ) : (
                 // Loading Placeholder (Themed)
                 <motion.div key={currentShow.id + "-loading"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="max-w-lg md:max-w-xl">
                    <div className="h-8 md:h-10 bg-secondary/50 rounded w-3/4 mb-3 animate-pulse"></div>
                    <div className="flex gap-2 mb-4"> <div className="h-5 md:h-6 bg-secondary/50 rounded-full w-16 md:w-20 animate-pulse"></div> <div className="h-5 md:h-6 bg-secondary/50 rounded-full w-16 md:w-20 animate-pulse"></div> </div>
                    <div className="h-4 bg-secondary/50 rounded w-full mb-2 animate-pulse"></div>
                    <div className="h-4 bg-secondary/50 rounded w-5/6 mb-6 animate-pulse"></div>
                    <div className="h-10 md:h-11 bg-secondary/50 rounded-full w-36 md:w-40 animate-pulse"></div>
                 </motion.div>
             )}
         </AnimatePresence>
      </div>

      {/* Navigation Arrows (Themed) */}
      <button onClick={() => paginate(-1)} className="absolute left-2 md:left-4 top-1/2 z-20 transform -translate-y-1/2 p-2 bg-black/50 rounded-full text-textprimary hover:bg-black/70 transition-all duration-200 hidden md:block opacity-70 hover:opacity-100" aria-label="Previous Show"> {/* Updated label */}
        <FiChevronLeft size={24} />
      </button>
      <button onClick={() => paginate(1)} className="absolute right-2 md:right-4 top-1/2 z-20 transform -translate-y-1/2 p-2 bg-black/50 rounded-full text-textprimary hover:bg-black/70 transition-all duration-200 hidden md:block opacity-70 hover:opacity-100" aria-label="Next Show"> {/* Updated label */}
        <FiChevronRight size={24} />
      </button>

      {/* Navigation Dots (Themed) */}
      {/* Adjusted bottom position */}
      <div className="absolute bottom-6 md:bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2.5">
        {trendingShows.map((_, index) => ( // Map over shows
          <button
            key={index}
            onClick={() => goToIndex(index)}
            className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all duration-300 ease-in-out cursor-pointer
                        ${currentShowIndex === index ? 'bg-accent scale-125 ring-2 ring-accent/50 ring-offset-2 ring-offset-primary/50' : 'bg-textsecondary/40 hover:bg-textsecondary/70'}`} // Use show index, themed colors
            aria-label={`Go to slide ${index + 1}`}
            aria-current={currentShowIndex === index ? 'step' : undefined} // Use show index
          />
        ))}
      </div>
    </div>
  );
};

export default TrendingShows; // Update export