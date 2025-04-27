// components/SlideShow.js

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { Mosaic } from "react-loading-indicators";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
const IMAGE_BASE_URL_W500 = 'https://image.tmdb.org/t/p/w500';

const SlideShow = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isHovering, setIsHovering] = useState(false); // State to control animation pause
  const router = useRouter();

  useEffect(() => {
    const fetchMoviesAndShows = async () => {
      setLoading(true);
      if (!API_KEY) { console.error("TMDB API Key missing"); setLoading(false); return; }
      try {
        const [moviesRes, showsRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=en-US&page=1`),
          fetch(`https://api.themoviedb.org/3/tv/top_rated?api_key=${API_KEY}&language=en-US&page=2`) // Fetch page 2 TV for variety
        ]);
        if (!moviesRes.ok || !showsRes.ok) throw new Error('Failed to fetch slideshow data');
        const moviesData = await moviesRes.json();
        const showsData = await showsRes.json();
        const combined = [
            ...(moviesData.results || []).map(m => ({...m, media_type: 'movie'})),
            ...(showsData.results || []).map(s => ({...s, media_type: 'tv'}))
        ].filter(item => item.poster_path);
        setItems(combined.sort(() => 0.5 - Math.random())); // Shuffle once
      } catch (error) { console.error('Error fetching slideshow data:', error); toast.error("Could not load slideshow items."); }
      finally { setLoading(false); }
    };
    fetchMoviesAndShows();
  }, []); // API_KEY dependency removed as it's read at build time

  const handleItemClick = (item) => {
      if (!item?.id) return;
      router.push(`/${item.media_type}/${item.id}`);
  };

  // Variants for the main scrolling container
  const scrollVariants = {
    animate: {
      y: ['0%', '-50%'], // Adjust '-50%' based on item height and duplication
      transition: {
        y: {
          repeat: Infinity,
          repeatType: "loop",
          duration: 60, // Adjust duration for scroll speed (longer is slower)
          ease: "linear",
        }
      }
    },
    paused: { // Define a paused state
        y: undefined // Let Framer handle stopping at current position
        // Or explicitly: y: currentYPosition (more complex state needed)
    }
  };

  // Variants for individual items
   const itemVariants = {
       hover: { scale: 1.08, zIndex: 10, transition: { duration: 0.2 } }
   };

  // Duplicate items for seamless vertical loop
  const duplicatedItems = items.length > 0 ? [...items, ...items] : [];

  if (loading) {
    return <div className="w-full h-full bg-secondary animate-pulse"></div>; // Simple loading placeholder
  }

  return (
    // Container that detects hover to pause animation
    <div
        className="w-full h-full overflow-hidden"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
    >
      {/* Inner container that animates vertically */}
      <motion.div
        className="w-full" // Let height be determined by content
        variants={scrollVariants}
        initial="animate" // Start animating immediately
        animate={isHovering ? "paused" : "animate"} // Control animation state
      >
        {/* CSS Multi-column Layout */}
        {/* Adjust column count and gap based on responsiveness */}
        <div className="columns-2 md:columns-3 gap-4 md:gap-6 space-y-4 md:space-y-6 py-3">
          {duplicatedItems.map((item, index) => (
            <motion.div
              key={`${item.id}-${item.media_type}-${index}`} // Unique key including index for duplicates
              className="break-inside-avoid-column cursor-pointer block relative rounded-md overflow-hidden shadow-lg border border-secondary hover:border-accent/50 transition-colors" // Added block and break-inside-avoid
              variants={itemVariants}
              whileHover="hover"
              onClick={() => handleItemClick(item)}
              title={item.title || item.name}
            >
              <div className="aspect-[2/3] w-full relative bg-secondary"> {/* Aspect ratio */}
                 {item.poster_path ? (
                     <Image
                        src={`${IMAGE_BASE_URL_W500}${item.poster_path}`}
                        alt={`${item.title || item.name} Poster`}
                        layout="fill"
                        objectFit="cover"
                        sizes="(max-width: 768px) 50vw, 33vw" // Adjust sizes based on columns
                        priority={index < 6} // Prioritize loading initial images
                     />
                 ) : (
                     <div className="w-full h-full flex items-center justify-center text-textsecondary/50">?</div>
                 )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default SlideShow;