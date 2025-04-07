// pages/history.js
import React, { useEffect, useState, useMemo } from "react"; // Added useMemo
import NavBar from "../../components/NavBar";      // Adjusted path
import Footer from "../../components/Footer";      // Adjusted path
import { auth, db } from "../../firebase";       // Adjusted path
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore"; // Added setDoc
import MovieCard from "../../components/MinimalCard"; // Adjusted path
import { Mosaic } from "react-loading-indicators";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import Link from 'next/link';
import { FaChevronDown, FaChevronUp, FaFilm, FaTv, FaTrashAlt } from "react-icons/fa"; // Icons
import toast, { Toaster } from 'react-hot-toast'; // For feedback
const IMAGE_BASE_URL_W500 = "https://image.tmdb.org/t/p/w500";
// Helper function to format date
const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
        // More readable format, e.g., "Apr 7, 2025, 5:30 PM"
        return new Date(isoString).toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
         });
        // Or just the date: return new Date(isoString).toLocaleDateString();
    } catch (e) {
        return 'Invalid Date';
    }
};


// Main HistoryPage component
const HistoryPage = () => {
  const [history, setHistory] = useState({ movies: [], episodes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Add error state
  const [expandedShows, setExpandedShows] = useState({});
  const [activeTab, setActiveTab] = useState('movies'); // 'movies' or 'episodes'

  const currentUser = auth.currentUser;
  const userId = currentUser?.uid;
  const router = useRouter();


  // Fetch and process history
  useEffect(() => {
    const fetchHistory = async () => {
        setLoading(true);
        setError(null);
        if (!userId) {
            setHistory({ movies: [], episodes: [] }); // Set empty if not logged in
            setLoading(false);
            return;
        };

      try {
        const historyRef = doc(db, "history", userId);
        const historyDoc = await getDoc(historyRef);

        let latestMovies = [];
        let latestEpisodes = [];

        if (historyDoc.exists()) {
          const data = historyDoc.data();

          // Process movies: Keep only the latest watch record per movie ID
          const uniqueMovies = {};
          (data.movies || []).forEach((movie) => {
              if (!movie.id || !movie.watchedAt) return; // Skip invalid entries
            if (!uniqueMovies[movie.id] || new Date(movie.watchedAt) > new Date(uniqueMovies[movie.id].watchedAt)) {
              uniqueMovies[movie.id] = movie;
            }
          });
          latestMovies = Object.values(uniqueMovies).sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));

          // Process episodes: Keep only the latest watch record per unique episode
          const uniqueEpisodes = {};
          (data.episodes || []).forEach((episode) => {
              if (!episode.tvShowId || !episode.seasonNumber || !episode.episodeNumber || !episode.watchedAt) return; // Skip invalid entries
            const episodeKey = `${episode.tvShowId}-${episode.seasonNumber}-${episode.episodeNumber}`;
            if (!uniqueEpisodes[episodeKey] || new Date(episode.watchedAt) > new Date(uniqueEpisodes[episodeKey].watchedAt)) {
              uniqueEpisodes[episodeKey] = episode;
            }
          });
          latestEpisodes = Object.values(uniqueEpisodes).sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));
        }
        // Set state even if doc doesn't exist (empty arrays)
        setHistory({ movies: latestMovies, episodes: latestEpisodes });

      } catch (err) {
         console.error("Error fetching history:", err);
         setError(err.message || "Failed to load history.");
         setHistory({ movies: [], episodes: [] }); // Reset on error
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [userId]);

  // Clear History Function
  const clearHistory = async () => {
    if (!userId) return;

    // Confirmation Dialog
    if (!window.confirm("Are you sure you want to clear your entire watch history? This cannot be undone.")) {
        return;
    }

    const historyRef = doc(db, "history", userId);
    try {
        // Reset arrays in Firestore (or set doc with empty arrays)
        await setDoc(historyRef, { movies: [], episodes: [] }); // Use setDoc to overwrite potentially missing doc too
        setHistory({ movies: [], episodes: [] }); // Update local state
        toast.success("Watch history cleared.");
    } catch (err) {
        console.error("Error clearing history:", err);
        toast.error("Failed to clear history. Please try again.");
    }
  };

  // Toggle Episode List
  const toggleShowEpisodes = (showId) => {
    setExpandedShows((prev) => ({
      ...prev,
      [showId]: !prev[showId],
    }));
  };

  // Group processed episodes by show ID
  const groupedEpisodes = useMemo(() => {
    return history.episodes.reduce((acc, episode) => {
        if (!episode.tvShowId || !episode.tvShowName) return acc;
      if (!acc[episode.tvShowId]) {
        acc[episode.tvShowId] = {
            id: episode.tvShowId,
            title: episode.tvShowName, // Use tvShowName from history record
            episodes: [],
            poster_path: episode.poster_path, // Use poster from history record
        };
      }
      acc[episode.tvShowId].episodes.push(episode);
      // Episodes are already sorted by watchedAt descending from the fetch logic
      return acc;
    }, {});
  }, [history.episodes]);

   // Framer motion variants (same as Favorites)
   const episodeListVariants = { hidden: { opacity: 0, height: 0, marginTop: 0 }, visible: { opacity: 1, height: 'auto', marginTop: '0.75rem', transition: { duration: 0.3, ease: "easeInOut" } }, exit: { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2, ease: "easeIn" } } };

  // --- Render Loading State ---
  if (loading) {
    return ( <div className="min-h-screen mt-16 bg-primary flex flex-col items-center justify-center"> <NavBar /> <div className="flex-grow flex items-center justify-center"><Mosaic color="#DAA520" size="medium" /></div> <Footer /> </div> );
  }

  // --- Render Error State ---
   if (error) {
       return ( <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4"> <NavBar /> <div className="text-center"> <h2 className="text-2xl text-red-500 mb-4">Error Loading History</h2> <p className="text-textsecondary mb-6">{error}</p> </div> <Footer /> </div> );
    }

    // --- Render No User State ---
    if (!currentUser) {
        return ( <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4"> <NavBar /> <div className="text-center"> <h2 className="text-2xl text-accent mb-4">Log In Required</h2> <p className="text-textsecondary mb-6">Please log in to view your watch history.</p> <button onClick={() => router.push('/login')} className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors"> Log In </button> </div> <Footer /> </div> );
     }


  // --- Main Render ---
  return (
    // Use mt-16 on outer div for spacing
    <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col font-poppins">
      <Toaster position="bottom-center" toastOptions={{ className: 'bg-secondary text-textprimary',}} />
      <NavBar />
       {/* Remove top padding from main, margin is on outer div */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto w-full">
         {/* Header Row */}
         <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-textprimary">Watch History</h1>
            {/* Themed Clear Button */}
            {(history.movies.length > 0 || history.episodes.length > 0) && ( // Only show if history exists
                 <button
                     onClick={clearHistory}
                     className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-red-600/50 text-red-300 hover:bg-red-700/20 hover:text-red-200 transition-colors duration-200"
                     title="Clear all watch history"
                 >
                     <FaTrashAlt />
                     <span>Clear History</span>
                 </button>
            )}
         </div>

         {/* Tab Navigation */}
         <div className="mb-6 border-b border-secondary-light">
               <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                 <button onClick={() => setActiveTab("movies")} className={`flex items-center gap-2 whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out ${ activeTab === "movies" ? "border-accent text-accent" : "border-transparent text-textsecondary hover:text-textprimary hover:border-secondary-light" }`}>
                     <FaFilm /> Movies ({history?.movies?.length || 0}) </button>
                 <button onClick={() => setActiveTab("episodes")} className={`flex items-center gap-2 whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out ${ activeTab === "episodes" ? "border-accent text-accent" : "border-transparent text-textsecondary hover:text-textprimary hover:border-secondary-light" }`}>
                     <FaTv /> TV Episodes ({history?.episodes?.length || 0}) </button>
               </nav>
           </div>

            {/* Tab Content */}
           <div>
              {activeTab === 'movies' && (
                  <div>
                      {/* <h2 className="text-xl font-semibold mb-4 text-textprimary">Watched Movies</h2> */}
                      {history?.movies?.length > 0 ? (
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                           {history.movies.map((movie) => (
                             <div key={`${movie.id}-${movie.watchedAt}`}> {/* Include watchedAt in key if duplicates might temporarily exist */}
                                 {/* Ensure MovieCard uses themed colors */}
                               <MovieCard
                                    movie={movie}
                                    onClick={() => router.push(`/movie/${movie.id}`)} // Link to detail page
                                />
                               <p className="text-xs mt-1.5 text-textsecondary text-center">
                                 Watched: {formatDate(movie.watchedAt)}
                               </p>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <p className="text-textsecondary text-center py-10 italic">You haven't watched any movies yet.</p>
                       )}
                  </div>
              )}

              {activeTab === 'episodes' && (
                 <div>
                     {/* <h2 className="text-xl font-semibold mb-4 text-textprimary">Watched TV Episodes</h2> */}
                     {Object.keys(groupedEpisodes).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {Object.entries(groupedEpisodes).map(([showId, showData]) => (
                            <div key={showId} className="bg-secondary rounded-lg p-4 shadow-md">
                              {/* Show Info Header */}
                               <div className="flex items-start gap-4 mb-3">
                                   {showData.poster_path && ( <img src={`${IMAGE_BASE_URL_W500}${showData.poster_path}`} alt={`${showData.title} Poster`} className="w-16 h-24 object-cover rounded flex-shrink-0" /> )}
                                   <div className="flex-grow">
                                     <h3 className="text-lg font-semibold text-textprimary mb-1 line-clamp-2">{showData.title}</h3>
                                     <button className="flex items-center gap-1 text-sm text-accent hover:text-accent-hover font-medium mt-1" onClick={() => toggleShowEpisodes(showId)} aria-expanded={!!expandedShows[showId]}>
                                        {expandedShows[showId] ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                                        {expandedShows[showId] ? "Hide" : "Show"} {showData.episodes.length} Watched Episode{showData.episodes.length !== 1 ? 's' : ''}
                                     </button>
                                   </div>
                               </div>
                              {/* Expandable Episode List */}
                              <AnimatePresence>
                                {expandedShows[showId] && (
                                  <motion.div key="episode-list" variants={episodeListVariants} initial="hidden" animate="visible" exit="exit" className="overflow-hidden border-t border-secondary-light pt-3">
                                     <ul className="space-y-1 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-secondary-light scrollbar-track-secondary">
                                       {showData.episodes.map((episode) => (
                                         <li key={`${episode.tvShowId}-${episode.seasonNumber}-${episode.episodeNumber}`}>
                                           <Link href={`/watchTv?tv_id=${episode.tvShowId}&season=${episode.seasonNumber}&episode=${episode.episodeNumber}`} className="flex justify-between items-center text-sm text-textsecondary hover:text-textprimary hover:bg-secondary-light p-1.5 rounded transition-colors duration-150">
                                             <span>S{String(episode.seasonNumber).padStart(2, '0')} E{String(episode.episodeNumber).padStart(2, '0')}</span>
                                             <span className="text-xs opacity-80">{formatDate(episode.watchedAt)}</span>
                                           </Link>
                                         </li>
                                       ))}
                                     </ul>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-textsecondary text-center py-10 italic">You haven't watched any TV episodes yet.</p>
                      )}
                 </div>
              )}
           </div>
      </main>
      <Footer />
    </div>
  );
};

export default HistoryPage;