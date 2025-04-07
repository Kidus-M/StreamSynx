import React, { useEffect, useState } from "react";
import NavBar from "../../components/NavBar"; // Adjusted path
import Footer from "../../components/Footer"; // Adjusted path
import { auth, db } from "../../firebase"; // Adjusted path
import { doc, getDoc } from "firebase/firestore";
import MovieCard from "../../components/MinimalCard"; // Adjusted path
import { Mosaic } from "react-loading-indicators";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion"; // For animations
import Link from 'next/link'; // For episode links
import { FaChevronDown, FaChevronUp, FaFilm, FaTv } from "react-icons/fa"; // Icons for tabs and toggle
const IMAGE_BASE_URL_W500 = "https://image.tmdb.org/t/p/w500";
// Custom hook to fetch favorites (Refined initial state)
const useFavorites = (userId) => {
  const [favorites, setFavorites] = useState(null); // Start as null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFavorites = async () => {
        setLoading(true); // Set loading true on each fetch attempt
        setError(null); // Reset error
        if (!userId) {
            setFavorites({ movies: [], episodes: [], shows: [] }); // Set empty default if not logged in
            setLoading(false);
            return;
        };

      try {
        const favoritesRef = doc(db, "favorites", userId);
        const favoritesDoc = await getDoc(favoritesRef);

        if (favoritesDoc.exists()) {
            // Ensure arrays exist even if empty in Firestore
          const data = favoritesDoc.data();
          setFavorites({
              movies: data.movies || [],
              episodes: data.episodes || [],
              shows: data.shows || [] // Assuming you might add show-level favorites later
          });
        } else {
          // Document doesn't exist, treat as empty favorites
          setFavorites({ movies: [], episodes: [], shows: [] });
        }
      } catch (err) {
        console.error("Error fetching favorites:", err);
        setError(err.message);
        setFavorites({ movies: [], episodes: [], shows: [] }); // Set empty on error
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [userId]);

  // Memoize favorites to prevent unnecessary recalculations
  const memoizedFavorites = React.useMemo(() => favorites, [favorites]);

  return { favorites: memoizedFavorites, loading, error };
};

// Main FavoritesPage component
const FavoritesPage = () => {
  const currentUser = auth.currentUser;
  const userId = currentUser?.uid;
  const { favorites, loading, error } = useFavorites(userId);
  const router = useRouter();
  const [expandedShows, setExpandedShows] = useState({});
  const [activeTab, setActiveTab] = useState('movies'); // 'movies' or 'episodes'

  const handleMovieCardClick = (movie) => {
    router.push(`/movie/${movie.id}`); // Navigate to movie detail page
  };

  const toggleShowEpisodes = (showId) => {
    setExpandedShows((prev) => ({
      ...prev,
      [showId]: !prev[showId],
    }));
  };

  // Group episodes by show ID using useMemo for performance
  const groupedEpisodes = React.useMemo(() => {
      if (!favorites?.episodes) return {};
      return favorites.episodes.reduce((acc, episode) => {
          // Ensure episode has necessary data
          if (!episode.tvShowId || !episode.tvShowName) return acc;

          if (!acc[episode.tvShowId]) {
            acc[episode.tvShowId] = {
                id: episode.tvShowId, // Add id for routing
                title: episode.tvShowName,
                episodes: [],
                poster_path: episode.poster_path, // Use poster from episode data
            };
          }
          // Sort episodes within the group
          acc[episode.tvShowId].episodes.push(episode);
          acc[episode.tvShowId].episodes.sort((a, b) => {
               if(a.seasonNumber === b.seasonNumber) {
                   return a.episodeNumber - b.episodeNumber;
               }
               return a.seasonNumber - b.seasonNumber;
           });
          return acc;
      }, {});
  }, [favorites]);

  // Framer motion variants
  const episodeListVariants = {
    hidden: { opacity: 0, height: 0, marginTop: 0 },
    visible: { opacity: 1, height: 'auto', marginTop: '0.75rem', transition: { duration: 0.3, ease: "easeInOut" } }, // Added margin-top
    exit: { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2, ease: "easeIn" } }
  };

  // --- Render Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center">
        <NavBar />
        <div className="flex-grow flex items-center justify-center">
             <Mosaic color="#DAA520" size="medium" /> {/* Accent color */}
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
                 <h2 className="text-2xl text-red-500 mb-4">Error Loading Favorites</h2>
                 <p className="text-textsecondary mb-6">{error}</p>
                 {/* Optional: Button to retry or go home */}
             </div>
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
                  <p className="text-textsecondary mb-6">Please log in to view your favorites.</p>
                  <button
                      onClick={() => router.push('/')} // Adjust login route if needed
                      className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors"
                  >
                      Log In
                  </button>
              </div>
              <Footer />
          </div>
      );
    }

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-primary text-textprimary flex flex-col font-poppins">
      <NavBar />
       {/* Added pt-16 wrapper */}
      <div className="flex-grow pt-16">
         <main className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto w-full"> {/* Increased max-width */}
           <h1 className="text-3xl md:text-4xl font-bold mb-6 text-textprimary">Favorites</h1>

            {/* Tab Navigation */}
           <div className="mb-6 border-b border-secondary-light">
               <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                 <button
                   onClick={() => setActiveTab("movies")}
                   className={`flex items-center gap-2 whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out ${
                     activeTab === "movies"
                       ? "border-accent text-accent"
                       : "border-transparent text-textsecondary hover:text-textprimary hover:border-secondary-light"
                   }`}
                 > <FaFilm /> Movies ({favorites?.movies?.length || 0}) </button>
                 <button
                   onClick={() => setActiveTab("episodes")}
                   className={`flex items-center gap-2 whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out ${
                     activeTab === "episodes"
                       ? "border-accent text-accent"
                       : "border-transparent text-textsecondary hover:text-textprimary hover:border-secondary-light"
                   }`}
                 > <FaTv /> TV Episodes ({favorites?.episodes?.length || 0}) </button>
               </nav>
           </div>

            {/* Tab Content */}
           <div>
              {activeTab === 'movies' && (
                  <div>
                      <h2 className="text-xl font-semibold mb-4 text-textprimary">Favorite Movies</h2>
                      {favorites?.movies?.length > 0 ? (
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                           {favorites.movies.map((movie) => (
                             // Ensure MovieCard uses themed colors
                             <MovieCard key={movie.id} movie={movie} onClick={() => handleMovieCardClick(movie)} />
                           ))}
                         </div>
                       ) : (
                         <p className="text-textsecondary text-center py-10 italic">You haven't added any favorite movies yet.</p>
                       )}
                  </div>
              )}

              {activeTab === 'episodes' && (
                 <div>
                     <h2 className="text-xl font-semibold mb-4 text-textprimary">Favorite TV Episodes</h2>
                     {Object.keys(groupedEpisodes).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {Object.entries(groupedEpisodes).map(([showId, showData]) => (
                            <div key={showId} className="bg-secondary rounded-lg p-4 shadow-md">
                              {/* Show Info Header */}
                               <div className="flex items-start gap-4 mb-3">
                                   {showData.poster_path && (
                                       <img
                                            src={`${IMAGE_BASE_URL_W500}${showData.poster_path}`}
                                            alt={`${showData.title} Poster`}
                                            className="w-16 h-24 object-cover rounded flex-shrink-0"
                                        />
                                   )}
                                   <div className="flex-grow">
                                     <h3 className="text-lg font-semibold text-textprimary mb-1 line-clamp-2">{showData.title}</h3>
                                     <button
                                       className="flex items-center gap-1 text-sm text-accent hover:text-accent-hover font-medium mt-1"
                                       onClick={() => toggleShowEpisodes(showId)}
                                       aria-expanded={!!expandedShows[showId]}
                                     >
                                        {expandedShows[showId] ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                                        {expandedShows[showId] ? "Hide" : "Show"} {showData.episodes.length} Episode{showData.episodes.length !== 1 ? 's' : ''}
                                     </button>
                                   </div>
                               </div>

                              {/* Expandable Episode List */}
                              <AnimatePresence>
                                {expandedShows[showId] && (
                                  <motion.div
                                     key="episode-list"
                                     variants={episodeListVariants}
                                     initial="hidden"
                                     animate="visible"
                                     exit="exit"
                                     className="overflow-hidden border-t border-secondary-light pt-3" // Add padding top
                                  >
                                     <ul className="space-y-1 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-secondary-light scrollbar-track-secondary"> {/* Scrollable list */}
                                       {showData.episodes.map((episode) => (
                                         <li key={`${episode.tvShowId}-${episode.seasonNumber}-${episode.episodeNumber}`}>
                                           <Link
                                             href={`/watchTv?tv_id=${episode.tvShowId}&season=${episode.seasonNumber}&episode=${episode.episodeNumber}`}
                                             className="block text-sm text-textsecondary hover:text-textprimary hover:bg-secondary-light p-1.5 rounded transition-colors duration-150"
                                           >
                                             {/* TODO: Fetch episode name/thumbnail later if desired */}
                                             Season {episode.seasonNumber}, Episode {episode.episodeNumber}
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
                        <p className="text-textsecondary text-center py-10 italic">You haven't added any favorite TV episodes yet.</p>
                      )}
                 </div>
              )}
           </div>
         </main>
       </div> {/* End pt-16 wrapper */}
      <Footer />
    </div>
  );
};

export default FavoritesPage;