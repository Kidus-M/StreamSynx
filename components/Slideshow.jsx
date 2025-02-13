import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TMDB_API_KEY = process.env.NEXT_PUBLIC_API_KEY;
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";

export default function Slideshow() {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    async function fetchTopRated() {
      try {
        const [moviesRes, showsRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}`),
          fetch(`https://api.themoviedb.org/3/tv/top_rated?api_key=${TMDB_API_KEY}`),
        ]);
        const [moviesData, showsData] = await Promise.all([
          moviesRes.json(),
          showsRes.json(),
        ]);
        
        const movieImages = moviesData.results.map(movie => movie.backdrop_path);
        const showImages = showsData.results.map(show => show.backdrop_path);
        const combinedImages = [...movieImages, ...showImages].filter(Boolean);
        
        setImages(combinedImages);
      } catch (error) {
        console.error("Error fetching TMDB data:", error);
      }
    }
    
    fetchTopRated();
  }, []);

  useEffect(() => {
    if (images.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images]);

  return (
    <div className="hidden md:flex relative w-full h-[500px] overflow-hidden bg-transparent  flex-col items-center justify-center p-6">
      <div className="relative w-full h-96 max-md:h-64 flex items-center justify-center overflow-hidden">
        <AnimatePresence>
          {images.length > 0 && (
            <motion.div
              key={currentIndex}
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: "0%", opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="relative w-full h-full flex items-center justify-center cursor-pointer hover:scale-105 transition-transform duration-500  hover:opacity-100" 
            >
              <motion.img
                src={`${IMAGE_BASE_URL}${images[currentIndex]}`}
                alt="Movie Backdrop"
                className="absolute w-full h-full object-cover opacity-60 hover:opacity-1 transition-opacity duration-500 rounded-lg "
                whileHover={{ scale: 1.05 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
