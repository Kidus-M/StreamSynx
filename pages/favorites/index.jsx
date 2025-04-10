// pages/favorites.js
import React, { useEffect, useState, useMemo } from "react";
import NavBar from "../../components/NavBar"; // Adjust path
import Footer from "../../components/Footer"; // Adjust path
import { auth, db } from "../../firebase"; // Adjust path
import { doc, getDoc } from "firebase/firestore";
import MovieCard from "../../components/MinimalCard"; // Adjust path
import { Mosaic } from "react-loading-indicators";
import { useRouter } from "next/router";
// Removed unused Framer Motion and Chevron icons for this version
import Link from 'next/link';
import { FaFilm, FaTv } from "react-icons/fa";
import toast, { Toaster } from 'react-hot-toast';

const IMAGE_BASE_URL_W500 = "https://image.tmdb.org/t/p/w500";

// Custom hook (keep as is)
const useFavorites = (userId) => { const [favorites, setFavorites] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(null); useEffect(() => { const fetchFavorites = async () => { setLoading(true); setError(null); const defaultFavs = { movies: [], episodes: [], shows: [] }; if (!userId) { setFavorites(defaultFavs); setLoading(false); return; }; try { const favoritesRef = doc(db, "favorites", userId); const favoritesDoc = await getDoc(favoritesRef); if (favoritesDoc.exists()) { const data = favoritesDoc.data(); setFavorites({ movies: data.movies || [], episodes: data.episodes || [], shows: data.shows || [] }); } else { setFavorites(defaultFavs); } } catch (err) { console.error("Error fetching favorites:", err); setError(err.message); setFavorites(defaultFavs); } finally { setLoading(false); } }; fetchFavorites(); }, [userId]); const memoizedFavorites = React.useMemo(() => favorites, [favorites]); return { favorites: memoizedFavorites, loading, error }; };

// Main FavoritesPage component
const FavoritesPage = () => {
  const currentUser = auth.currentUser;
  const userId = currentUser?.uid;
  const { favorites, loading, error } = useFavorites(userId);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('movies');

  const handleMovieCardClick = (movie) => { router.push(`/watch?movie_id=${movie.id}`); };

  // --- Navigation Handler for Episode Cards ---
  const handleEpisodeCardClick = (episode) => {
      // Ensure necessary data exists before navigating
      if(episode?.tvShowId && typeof episode?.seasonNumber === 'number' && typeof episode?.episodeNumber === 'number') {
            router.push(`/watchTv?tv_id=${episode.tvShowId}`);
      } else {
          console.warn("Missing data to navigate to episode:", episode);
          toast.error("Could not navigate to episode - data missing.");
      }
  };

  // --- Render Loading / Error / No User --- (Keep as is)
  if (loading) { return ( <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center"> <NavBar /> <div className="flex-grow flex items-center justify-center"><Mosaic color="#DAA520" size="medium" /></div> <Footer /> </div> ); }
  if (error) { return ( <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4"> <NavBar /> <div className="text-center"><h2 className="text-2xl text-red-500 mb-4">Error Loading Favorites</h2><p className="text-textsecondary mb-6">{error}</p></div> <Footer /> </div> ); }
  if (!currentUser) { return ( <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4"> <NavBar /> <div className="text-center"><h2 className="text-2xl text-accent mb-4">Log In Required</h2><p className="text-textsecondary mb-6">Please log in to view your favorites.</p><button onClick={() => router.push('/')} className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors">Log In</button></div> <Footer /> </div> ); }

  const favoriteMovies = favorites?.movies || [];
  const favoriteEpisodes = favorites?.episodes || [];

  // --- Main Render ---
  return (
    <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col font-poppins">
      <Toaster position="bottom-center" toastOptions={{ className: 'bg-secondary text-textprimary',}} />
      <NavBar />
      <div className="flex-grow">
         <main className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto w-full">
           <h1 className="text-3xl md:text-4xl font-bold mb-6 text-textprimary">Favorites</h1>

           {/* Tab Navigation */}
           <div className="mb-6 border-b border-secondary-light">
               <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                 <button onClick={() => setActiveTab("movies")} className={`flex items-center gap-2 whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out ${ activeTab === "movies" ? "border-accent text-accent" : "border-transparent text-textsecondary hover:text-textprimary hover:border-secondary-light" }`}>
                     <FaFilm /> Movies ({favoriteMovies.length}) </button>
                 <button onClick={() => setActiveTab("episodes")} className={`flex items-center gap-2 whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out ${ activeTab === "episodes" ? "border-accent text-accent" : "border-transparent text-textsecondary hover:text-textprimary hover:border-secondary-light" }`}>
                     <FaTv /> TV Episodes ({favoriteEpisodes.length}) </button>
               </nav>
           </div>

            {/* Tab Content */}
           <div>
              {activeTab === 'movies' && (
                  <div>
                      <h2 className="text-xl font-semibold mb-4 text-textprimary sr-only">Favorite Movies</h2>
                      {favoriteMovies.length > 0 ? (
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                           {favoriteMovies.map((movie) => (
                             <MovieCard key={movie.id} movie={movie} onClick={() => handleMovieCardClick(movie)} />
                           ))}
                         </div>
                       ) : ( <p className="text-textsecondary text-center py-10 italic">You haven't added any favorite movies yet.</p> )}
                  </div>
              )}

              {/* --- NEW Episodes Tab Display --- */}
              {activeTab === 'episodes' && (
                 <div>
                     <h2 className="text-xl font-semibold mb-4 text-textprimary sr-only">Favorite TV Episodes</h2>
                     {favoriteEpisodes.length > 0 ? (
                        // Display each episode as a card
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                          {favoriteEpisodes.map((episode, index) => {
                              // Create a movie-like object for the Card
                              const cardData = {
                                  id: episode.tvShowId, // Use show ID for potential linking later if needed
                                  title: episode.tvShowName, // Show Name
                                  name: episode.tvShowName, // Fallback for card title
                                  poster_path: episode.poster_path, // Show Poster
                                  media_type: 'tv', // Indicate it's related to TV
                                  // Add episode specific details for display below card
                                  seasonNumber: episode.seasonNumber,
                                  episodeNumber: episode.episodeNumber
                              };
                              // Unique key for mapping
                              const episodeKey = `${episode.tvShowId}-${episode.seasonNumber}-${episode.episodeNumber}-${index}`;

                              return (
                                <div key={episodeKey}>
                                     <MovieCard
                                        movie={cardData}
                                        onClick={() => handleEpisodeCardClick(episode)} // Navigate to specific episode watch page
                                     />
                                     {/* Display S/E number below the card */}
                                     <p className="text-xs mt-1.5 text-textsecondary text-center font-medium" title={`${cardData.title} - S${cardData.seasonNumber} E${cardData.episodeNumber}`}>
                                         S{String(cardData.seasonNumber).padStart(2, '0')} E{String(cardData.episodeNumber).padStart(2, '0')}
                                     </p>
                                 </div>
                               );
                           })}
                         </div>
                       ) : ( <p className="text-textsecondary text-center py-10 italic">You haven't added any favorite TV episodes yet.</p> )}
                  </div>
              )}
              {/* --- END NEW Episodes Tab Display --- */}

           </div>
         </main>
       </div>
      <Footer />
    </div>
  );
};

export default FavoritesPage;