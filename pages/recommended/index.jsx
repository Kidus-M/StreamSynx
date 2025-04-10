// pages/recommended.js
import React, { useEffect, useState, useMemo } from "react";
import NavBar from "../../components/NavBar";      // Adjust path
import Footer from "../../components/Footer";      // Adjust path
import { auth, db } from "../../firebase";       // Adjust path
import { doc, getDoc } from "firebase/firestore";
import MovieCard from "../../components/MinimalCard"; // Adjust path
import { Mosaic } from "react-loading-indicators";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import Link from 'next/link';
import { Toaster } from 'react-hot-toast';
import { FaChevronDown, FaChevronUp, FaFilm, FaTv } from "react-icons/fa"; // Icons

// Constants (Ensure these are defined or imported if used elsewhere)
const IMAGE_BASE_URL_W500 = "https://image.tmdb.org/t/p/w500";

// Custom hook to fetch recommendations and usernames
const useRecommendations = (userId) => {
  const [recommendations, setRecommendations] = useState(null); // Start as null
  const [userUsernames, setUserUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true; // Prevent state updates on unmounted component
    const fetchAll = async () => {
        setLoading(true);
        setError(null);
        setRecommendations(null); // Reset recommendations on new fetch
        setUserUsernames({}); // Reset usernames

        if (!userId) {
             setRecommendations({ movies: [], episodes: [] }); // Default empty if no user
             setLoading(false);
             return;
        }

      try {
        // 1. Fetch Recommendations
        const recommendationsRef = doc(db, "recommendations", userId);
        const recommendationsDoc = await getDoc(recommendationsRef);
        const recData = recommendationsDoc.exists() ? recommendationsDoc.data() : { movies: [], episodes: [] };
        // Ensure arrays exist
        recData.movies = recData.movies || [];
        recData.episodes = recData.episodes || [];

        if (!isMounted) return; // Check before first state update
        setRecommendations(recData);

        // 2. Fetch Usernames for Recommenders
        const recommendedByUserIds = new Set([
          ...(recData.movies.map(movie => movie.recommendedBy) || []),
          ...(recData.episodes.map(episode => episode.recommendedBy) || []),
        ]);

        const usernamePromises = Array.from(recommendedByUserIds)
            .filter(Boolean) // Remove null/undefined IDs
            .map(async (recommendedByUserId) => {
                try {
                    const userRef = doc(db, "users", recommendedByUserId);
                    const userDoc = await getDoc(userRef);
                    if (userDoc.exists()) {
                        return { userId: recommendedByUserId, username: userDoc.data().username };
                    }
                    return { userId: recommendedByUserId, username: 'Unknown User' }; // Fallback
                } catch (userError) {
                    console.error(`Failed to fetch username for ${recommendedByUserId}:`, userError);
                    return { userId: recommendedByUserId, username: 'Error Loading Name' }; // Indicate error fetching name
                }
         });

        const usernamesData = await Promise.all(usernamePromises);
        const usernamesMap = {};
        usernamesData.forEach((user) => {
            if (user) usernamesMap[user.userId] = user.username;
        });

        if (isMounted) {
            setUserUsernames(usernamesMap);
        }

      } catch (err) {
        console.error("Error fetching recommendations/usernames:", err);
        if (isMounted) setError(err.message || "Failed to load recommendations.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAll();

    // Cleanup function
    return () => { isMounted = false; };
  }, [userId]);

  // Memoize results
  const memoizedRecs = React.useMemo(() => recommendations, [recommendations]);
  const memoizedUsernames = React.useMemo(() => userUsernames, [userUsernames]);

  return { recommendations: memoizedRecs, userUsernames: memoizedUsernames, loading, error };
};


// Main RecommendedPage component
const RecommendedPage = () => {
  const currentUser = auth.currentUser;
  const userId = currentUser?.uid;
  const { recommendations, userUsernames, loading, error } = useRecommendations(userId);
  const router = useRouter();
  const [expandedShows, setExpandedShows] = useState({});
  const [activeTab, setActiveTab] = useState('movies'); // 'movies' or 'episodes'

  const handleNavigate = (type, id, season = null, episode = null) => {
    if (type === "movie") {
      router.push(`/movie/${id}`); // Navigate to movie detail page
    } else if (type === "tv" && season && episode) {
       router.push(`/watchTv?tv_id=${id}&season=${season}&episode=${episode}`); // Navigate to specific episode
    } else if (type === "tv") {
         router.push(`/tv/${id}`); // Navigate to TV show detail page
     }
  };

  const toggleShowEpisodes = (showId) => {
    setExpandedShows((prev) => ({ ...prev, [showId]: !prev[showId] }));
  };

  // Group episodes by show ID
  const groupedEpisodes = useMemo(() => {
    if (!recommendations?.episodes) return {};
    return recommendations.episodes.reduce((acc, episode) => {
      if (!episode.tvShowId || !episode.tvShowName) return acc;
      if (!acc[episode.tvShowId]) {
        acc[episode.tvShowId] = {
            id: episode.tvShowId,
            title: episode.tvShowName,
            episodes: [],
            poster_path: episode.poster_path,
            // Take recommender from the first episode encountered for this show
            recommendedBy: episode.recommendedBy,
        };
      }
      // Sort episodes within the group (optional, based on recommendation time maybe?)
      // For now, just add them. They might already be sorted if recommendations are added chronologically.
      acc[episode.tvShowId].episodes.push(episode);
       acc[episode.tvShowId].episodes.sort((a, b) => {
           if(a.seasonNumber === b.seasonNumber) return a.episodeNumber - b.episodeNumber;
           return a.seasonNumber - b.seasonNumber;
       });
      return acc;
    }, {});
  }, [recommendations]);

  // Framer motion variants
  const episodeListVariants = { hidden: { opacity: 0, height: 0, marginTop: 0 }, visible: { opacity: 1, height: 'auto', marginTop: '0.75rem', transition: { duration: 0.3, ease: "easeInOut" } }, exit: { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2, ease: "easeIn" } } };

  // --- Render Loading ---
  if (loading) {
    return ( <div className="min-h-screen mt-16 bg-primary flex flex-col items-center justify-center"> <NavBar /> <div className="flex-grow flex items-center justify-center"><Mosaic color="#DAA520" size="medium" /></div> <Footer /> </div> );
  }

  // --- Render Error ---
   if (error) {
       return ( <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4"> <NavBar /> <div className="text-center"> <h2 className="text-2xl text-red-500 mb-4">Error Loading Recommendations</h2> <p className="text-textsecondary mb-6">{error}</p> </div> <Footer /> </div> );
    }

    // --- Render No User ---
    if (!currentUser) {
        return ( <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4"> <NavBar /> <div className="text-center"> <h2 className="text-2xl text-accent mb-4">Log In Required</h2> <p className="text-textsecondary mb-6">Please log in to view recommendations.</p> <button onClick={() => router.push('/')} className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors"> Log In </button> </div> <Footer /> </div> );
     }

    // Ensure recommendations object exists before accessing its properties
    const recMovies = recommendations?.movies || [];
    const recEpisodes = recommendations?.episodes || [];

  // --- Main Render ---
  return (
    <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col font-poppins"> {/* Added mt-16 */}
      <Toaster position="bottom-center" toastOptions={{ className: 'bg-secondary text-textprimary',}} />
      <NavBar />
      <div className="flex-grow"> {/* pt-16 removed as margin added to outer div */}
         <main className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto w-full">
           <h1 className="text-3xl md:text-4xl font-bold mb-6 text-textprimary">Recommended For You</h1>

            {/* Tab Navigation */}
           <div className="mb-6 border-b border-secondary-light">
               <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                 <button onClick={() => setActiveTab("movies")} className={`flex items-center gap-2 whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out ${ activeTab === "movies" ? "border-accent text-accent" : "border-transparent text-textsecondary hover:text-textprimary hover:border-secondary-light" }`}>
                     <FaFilm /> Movies ({recMovies.length}) </button>
                 <button onClick={() => setActiveTab("episodes")} className={`flex items-center gap-2 whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out ${ activeTab === "episodes" ? "border-accent text-accent" : "border-transparent text-textsecondary hover:text-textprimary hover:border-secondary-light" }`}>
                     <FaTv /> TV Episodes ({recEpisodes.length}) </button>
               </nav>
           </div>

            {/* Tab Content */}
           <div>
              {activeTab === 'movies' && (
                  <div>
                      <h2 className="text-xl font-semibold mb-4 text-textprimary sr-only">Recommended Movies</h2> {/* Sr-only for accessibility */}
                      {recMovies.length > 0 ? (
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                           {recMovies.map((movie) => (
                             <div key={`${movie.id}-${movie.recommendedBy}`}> {/* Key might need more uniqueness if same movie recommended twice */}
                               <MovieCard
                                    movie={movie}
                                    onClick={() => handleNavigate("movie", movie.id)}
                                />
                               <p className="text-xs mt-1.5 text-textsecondary text-center truncate px-1" title={`Recommended by: ${userUsernames[movie.recommendedBy] || movie.recommendedBy}`}>
                                 Rec by: {userUsernames[movie.recommendedBy] || '...'} {/* Use username map */}
                               </p>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <p className="text-textsecondary text-center py-10 italic">No recommended movies found.</p>
                       )}
                  </div>
              )}

              {activeTab === 'episodes' && (
                 <div>
                     <h2 className="text-xl font-semibold mb-4 text-textprimary sr-only">Recommended TV Episodes</h2> {/* Sr-only */}
                     {Object.keys(groupedEpisodes).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {Object.entries(groupedEpisodes).map(([showId, showData]) => (
                            <div key={showId} className="bg-secondary rounded-lg p-4 shadow-md">
                              {/* Show Info Header */}
                               <div className="flex items-start gap-4 mb-3">
                                   {showData.poster_path && ( <img src={`${IMAGE_BASE_URL_W500}${showData.poster_path}`} alt={`${showData.title} Poster`} className="w-16 h-24 object-cover rounded flex-shrink-0" /> )}
                                   <div className="flex-grow">
                                     <h3 className="text-lg font-semibold text-textprimary mb-1 line-clamp-2">{showData.title}</h3>
                                     {/* Display Recommender Here */}
                                     <p className="text-xs text-textsecondary mb-1 truncate" title={`Recommended by: ${userUsernames[showData.recommendedBy] || showData.recommendedBy}`}>
                                         Rec by: {userUsernames[showData.recommendedBy] || '...'}
                                     </p>
                                     <button className="flex items-center gap-1 text-sm text-accent hover:text-accent-hover font-medium" onClick={() => toggleShowEpisodes(showId)} aria-expanded={!!expandedShows[showId]}>
                                        {expandedShows[showId] ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                                        {expandedShows[showId] ? "Hide" : "Show"} {showData.episodes.length} Rec Episode{showData.episodes.length !== 1 ? 's' : ''}
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
                                            {/* Link to specific episode */}
                                           <Link href={`/watchTv?tv_id=${episode.tvShowId}&season=${episode.seasonNumber}&episode=${episode.episodeNumber}`} className="block text-sm text-textsecondary hover:text-textprimary hover:bg-secondary-light p-1.5 rounded transition-colors duration-150">
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
                        <p className="text-textsecondary text-center py-10 italic">No recommended TV episodes found.</p>
                      )}
                 </div>
              )}
           </div>
         </main>
       </div>
      <Footer />
    </div>
  );
};

export default RecommendedPage;