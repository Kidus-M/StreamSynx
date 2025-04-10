// components/MinimalCard.js (or MovieCard.js)
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { FaPlus, FaCheck, FaStar } from "react-icons/fa"; // Using react-icons
import { auth, db } from "../firebase"; // Adjust path if needed
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import axios from "axios"; // Keep axios for detail fetching if needed
import toast from 'react-hot-toast'; // For user feedback
import { motion } from 'framer-motion'; // For subtle animations

const BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
const IMAGE_BASE_URL_W500 = "https://image.tmdb.org/t/p/w500"; // Defined W500 base

// Genre map (keep as is)
const genreMap = { 28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western", 10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics" };

const MovieCard = ({ movie: initialMovie, onClick }) => { // Accept onClick prop from parent
  const router = useRouter();
  const [isAdded, setIsAdded] = useState(false);
  const userId = auth.currentUser?.uid;
  // Store essential details, fetch full details only if needed for display, not for watchlist actions
  const [displayData, setDisplayData] = useState({
      // Use initial data immediately, overwrite with fetched if necessary
      id: initialMovie.id,
      title: initialMovie.title || initialMovie.name || "Loading...",
      poster_path: initialMovie.poster_path,
      vote_average: initialMovie.vote_average,
      genres: "Loading Genre...",
      media_type: initialMovie.media_type || (initialMovie.first_air_date ? "tv" : "movie") // Determine media type
  });

  // Fetch full details and check watchlist status
  useEffect(() => {
      if (!initialMovie?.id || !API_KEY) return;

      const mediaType = initialMovie.media_type || (initialMovie.first_air_date ? "tv" : "movie");
      setDisplayData(prev => ({ ...prev, media_type: mediaType })); // Ensure mediaType is set early

      let isMounted = true; // Prevent state updates on unmount

      // Fetch details (mainly for genre names)
      const fetchDetails = async () => {
          try {
              const { data } = await axios.get( `${BASE_URL}/${mediaType}/${initialMovie.id}`, {
                      params: { api_key: API_KEY, language: "en-US" },
                  }
              );
              if (isMounted && data) {
                   const fetchedGenres = data.genres?.map(g => g.name).slice(0, 2).join(', ') || // Get first 2 genres
                                        (initialMovie.genre_ids?.map(id => genreMap[id] || '').filter(Boolean).slice(0,2).join(', ')) || // Fallback to IDs from initial data
                                        "N/A";
                   setDisplayData(prev => ({
                        ...prev,
                        // Use fetched data if available, otherwise keep initial
                        title: data.title || data.name || prev.title,
                        vote_average: data.vote_average ?? prev.vote_average,
                        genres: fetchedGenres
                    }));
              }
          } catch (error) {
              console.error("Error fetching details in card:", error);
              // Fallback using initial data if fetch fails
               if (isMounted) {
                    const initialGenres = initialMovie.genre_ids?.map(id => genreMap[id] || '').filter(Boolean).slice(0,2).join(', ') || "N/A";
                    setDisplayData(prev => ({...prev, genres: initialGenres }));
               }
          }
      };

      // Check watchlist status
      const checkWatchlist = async () => {
            if (userId) {
                try {
                    const watchlistRef = doc(db, "watchlists", userId);
                    const watchlistDoc = await getDoc(watchlistRef);
                    if (isMounted && watchlistDoc.exists()) {
                        const items = watchlistDoc.data()?.items || [];
                        setIsAdded(items.some(item => item.id === initialMovie.id && item.media_type === mediaType));
                    } else if (isMounted) {
                        setIsAdded(false);
                    }
                } catch (error) {
                     console.error("Error checking watchlist:", error);
                     if (isMounted) setIsAdded(false); // Assume not added on error
                }
            } else {
                 if (isMounted) setIsAdded(false); // Not added if no user
            }
      };

      fetchDetails();
      checkWatchlist();

      return () => { isMounted = false; }; // Cleanup

  }, [initialMovie, userId, API_KEY]); // Re-run if initial data or user changes

  // --- WATCHLIST TOGGLE FIX ---
  const toggleWatchlist = async (e) => {
    e.stopPropagation(); // Prevent card click navigation
    if (!userId) {
      toast.error("Please log in to manage watchlist.");
      router.push("/login"); // Redirect to login
      return;
    }
    if (!displayData.id || !displayData.media_type) {
        toast.error("Cannot add item: Data missing.");
        return;
    }

    const watchlistRef = doc(db, "watchlists", userId);

    // **CRITICAL:** Use a minimal, consistent object for both add and remove
    const itemDataMinimal = {
      id: displayData.id,
      media_type: displayData.media_type,
      // Include essential data needed for displaying on the watchlist page later
      title: displayData.title, // Or use initialMovie.title/name if displayData isn't ready
      name: displayData.title, // Add name for consistency if needed
      poster_path: displayData.poster_path || initialMovie.poster_path, // Ensure poster path is included
    };

    const wasAdded = isAdded; // Store current state before async operation
    setIsAdded(!wasAdded); // Optimistic UI update

    try {
      const watchlistDoc = await getDoc(watchlistRef); // Check existence before update/set

      if (wasAdded) {
          // Remove the item
          if (watchlistDoc.exists()) {
              await updateDoc(watchlistRef, { items: arrayRemove(itemDataMinimal) });
              toast.success("Removed from Watchlist");
          }
      } else {
          // Add the item
          if (watchlistDoc.exists()) {
              await updateDoc(watchlistRef, { items: arrayUnion(itemDataMinimal) });
          } else {
              // Create watchlist document if it doesn't exist
              await setDoc(watchlistRef, { items: [itemDataMinimal] });
          }
          toast.success("Added to Watchlist");
      }
    } catch (err) {
      console.error("Error updating watchlist:", err);
      toast.error("Failed to update watchlist.");
      setIsAdded(wasAdded); // Revert UI on error
    }
  };
  // --- END WATCHLIST TOGGLE FIX ---

  // Use onClick from props if provided, otherwise use default handleWatch
  const handleClick = onClick ? (e) => {
      e.stopPropagation(); // Prevent nested clicks if necessary
      onClick(displayData); // Pass potentially updated displayData
   } : (e) => {
       e.stopPropagation();
       handleWatch(); // Fallback to default navigation
   };

    // Default navigation if no onClick prop
   const handleWatch = () => {
       if (!displayData.id) return;
       const url = displayData.media_type === "tv"
         ? `/tv/${displayData.id}` // Link to detail page
         : `/movie/${displayData.id}`; // Link to detail page
       router.push(url);
   };


  return (
    <motion.div
      className="relative w-full rounded-lg overflow-hidden group transition-transform duration-300 ease-in-out border border-secondary/50 hover:border-accent/50 shadow-md hover:shadow-accent/10" // Themed border/shadow
      onClick={handleClick} // Use determined click handler
      whileHover={{ y: -5 }} // Subtle lift on hover
      title={`${displayData.title} (${displayData.media_type === 'tv' ? 'TV' : 'Movie'})`} // Tooltip
    >
      {/* Image with Aspect Ratio */}
      <div className="aspect-[2/3] bg-secondary"> {/* Background color for loading/missing */}
        {displayData.poster_path ? (
            <img
                src={`${IMAGE_BASE_URL_W500}${displayData.poster_path}`}
                alt={`${displayData.title} Poster`}
                className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80"
                loading="lazy" // Lazy load images
            />
         ) : (
            // Placeholder for missing image
             <div className="w-full h-full flex items-center justify-center text-textsecondary/50">
                 <FaFilm /> {/* Or FaTv based on type */}
             </div>
         )}
      </div>

      {/* Add/Remove Button (Top Right) */}
      <button
        className={`absolute top-2 right-2 z-10 p-1.5 rounded-full transition-all duration-200 backdrop-blur-sm ${
          isAdded
            ? "bg-accent/80 text-primary hover:bg-accent" // Themed: Added state
            : "bg-black/50 text-textprimary hover:bg-accent hover:text-primary opacity-0 group-hover:opacity-100" // Themed: Add state
        }`}
        onClick={toggleWatchlist}
        title={isAdded ? "Remove from Watchlist" : "Add to Watchlist"}
      >
        {isAdded ? <FaCheck size={12} /> : <FaPlus size={12} />}
      </button>

      {/* Info Overlay (Bottom) - Themed */}
      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-secondary via-secondary/80 to-transparent p-3 pt-6">
        <div className="flex items-end gap-2">
             <div className="flex-1 overflow-hidden">
                 <h3 className="text-sm md:text-base font-semibold text-textprimary truncate">
                    {displayData.title}
                 </h3>
                 <p className="text-xs text-textsecondary truncate">
                    {displayData.vote_average > 0 && (
                         <span className="inline-flex items-center mr-2">
                            <FaStar className="text-accent mr-0.5" size={10}/> {displayData.vote_average?.toFixed(1)}
                         </span>
                    )}
                    {displayData.genres}
                 </p>
             </div>
             {/* Optional: Add a play icon or year here if desired */}
         </div>
      </div>
    </motion.div>
  );
};

export default MovieCard;