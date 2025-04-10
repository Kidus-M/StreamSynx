// pages/watchlist.js
import React, { useEffect, useState, useMemo } from "react"; // Added useMemo
import NavBar from "../../components/NavBar";      // Adjust path
import Footer from "../../components/Footer";      // Adjust path
import { auth, db } from "../../firebase";       // Adjust path
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import MovieCard from "../../components/MinimalCard"; // Adjust path
import { Mosaic } from "react-loading-indicators";
import { useRouter } from "next/router";
import { FaListAlt, FaFilm, FaTv } from "react-icons/fa"; // Icons for filters
import toast, { Toaster } from 'react-hot-toast'; // Optional: If using toasts

// Custom hook to fetch watchlist
const useWatchlist = (userId) => {
  const [watchlistItems, setWatchlistItems] = useState(null); // Start as null for loading state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWatchlist = async () => {
      setLoading(true);
      setError(null);
      // Don't fetch if user is not logged in (wait for auth state)
      if (!userId) {
          setWatchlistItems([]); // Set to empty array if no user ID provided yet
          setLoading(false);
          return;
      }

      try {
        const watchlistRef = doc(db, "watchlists", userId);
        const watchlistDoc = await getDoc(watchlistRef);

        if (watchlistDoc.exists()) {
            // Ensure 'items' array exists
          setWatchlistItems(watchlistDoc.data()?.items || []);
        } else {
          // No watchlist document found, treat as empty
          setWatchlistItems([]);
        }
      } catch (err) {
        console.error("Error fetching watchlist:", err);
        setError(err.message || "Failed to load watchlist.");
        setWatchlistItems([]); // Set empty on error
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlist();
  }, [userId]); // Re-fetch if userId changes

  return { watchlistItems, loading, error };
};

// Main WatchlistPage component
const WatchlistPage = () => {
  const [currentUser, setCurrentUser] = useState(null); // Add state for currentUser
  const [authLoading, setAuthLoading] = useState(true); // Add auth loading state
  const userId = currentUser?.uid; // Get userId from currentUser state
  const { watchlistItems, loading: loadingWatchlist, error } = useWatchlist(userId);
  const [filter, setFilter] = useState("all"); // 'all', 'movie', 'tv'
  const router = useRouter();

  // Auth listener
  useEffect(() => {
    setAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);


  // Client-side filtering based on the 'filter' state
  const filteredItems = useMemo(() => {
    if (!watchlistItems) return []; // Return empty if watchlistItems is null
    if (filter === "all") return watchlistItems;
    return watchlistItems.filter((item) => item.media_type === filter);
  }, [watchlistItems, filter]);

  // Navigation handler
  const handleCardClick = (item) => {
    if (!item?.id) return;
    if (item.media_type === "tv") {
      router.push(`/tv/${item.id}`); // Link to detail page
    } else if (item.media_type === "movie") {
      router.push(`/movie/${item.id}`); // Link to detail page
    } else {
        console.warn("Unknown media type in watchlist:", item.media_type);
        // Maybe navigate to a generic search or home?
    }
  };

  // Combine loading states
  const isLoading = authLoading || loadingWatchlist;

  // --- Render Loading ---
  if (isLoading) {
    return (
      <div className="min-h-screen mt-16 bg-primary flex flex-col items-center justify-center">
        <NavBar />
        <div className="flex-grow flex items-center justify-center"><Mosaic color="#DAA520" size="medium" /></div>
        <Footer />
      </div>
    );
  }

  // --- Render No User State ---
   if (!currentUser) {
       return (
         <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4">
             <NavBar />
              <div className="text-center">
                  <h2 className="text-2xl text-accent mb-4">Log In Required</h2>
                  <p className="text-textsecondary mb-6">Please log in to view your watchlist.</p>
                  <button onClick={() => router.push('/login')} className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors">Log In</button>
              </div>
              <Footer />
          </div>
      );
    }

  // --- Render Error State ---
   if (error) {
       return (
         <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4">
             <NavBar />
              <div className="text-center">
                  <h2 className="text-2xl text-red-500 mb-4">Error Loading Watchlist</h2>
                  <p className="text-textsecondary mb-6">{error}</p>
              </div>
              <Footer />
          </div>
      );
    }


  // --- Main Render ---
  return (
    // Added mt-16 for spacing below NavBar
    <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col font-poppins">
      <Toaster position="bottom-center" toastOptions={{ className: 'bg-secondary text-textprimary',}} />
      <NavBar />
       <div className="flex-grow"> {/* Wrapper for flex-grow */}
         <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full"> {/* Use max-width */}
           {/* Page Header */}
           <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
               <h1 className="text-3xl md:text-4xl font-bold text-textprimary">My Watchlist</h1>
               {/* Filter Buttons - Themed */}
               <div className="flex items-center gap-2 bg-secondary p-1 rounded-lg border border-secondary-light">
                 <button
                   className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${filter === "all" ? "bg-accent text-primary shadow" : "text-textsecondary hover:bg-secondary-light hover:text-textprimary"}`}
                   onClick={() => setFilter("all")}
                   title="Show All"
                 > <FaListAlt /> All </button>
                 <button
                   className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${filter === "movie" ? "bg-accent text-primary shadow" : "text-textsecondary hover:bg-secondary-light hover:text-textprimary"}`}
                   onClick={() => setFilter("movie")}
                   title="Show Movies Only"
                 > <FaFilm /> Movies </button>
                 <button
                   className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${filter === "tv" ? "bg-accent text-primary shadow" : "text-textsecondary hover:bg-secondary-light hover:text-textprimary"}`}
                   onClick={() => setFilter("tv")}
                   title="Show TV Shows Only"
                 > <FaTv /> TV Shows </button>
               </div>
           </div>

            {/* Watchlist Grid / Empty State */}
           {filteredItems.length > 0 ? (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
               {filteredItems.map((item) => (
                 // Ensure MovieCard uses theme colors
                 <MovieCard
                      key={`${item.id}-${item.media_type}`} // Add media_type for potential duplicate IDs
                      movie={item}
                      onClick={() => handleCardClick(item)}
                  />
               ))}
             </div>
           ) : (
              // Themed Empty State
              <div className="text-center py-16 text-textsecondary bg-secondary rounded-lg shadow">
                  <FaListAlt className="mx-auto text-4xl text-textsecondary/50 mb-4" />
                  <p className="text-lg mb-2">Your watchlist is empty.</p>
                  <p className="text-sm">Add movies and TV shows to see them here.</p>
                   {/* Optional: Link to browse/search */}
                   {/* <Link href="/home" className="mt-4 inline-block text-accent hover:text-accent-hover font-medium underline">Browse Content</Link> */}
              </div>
           )}

         </main>
       </div>
      <Footer />
    </div>
  );
};

export default WatchlistPage;