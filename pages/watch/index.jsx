import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion"; // Added AnimatePresence
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import MovieCard from "../../components/MinimalCard";
import SearchCard from "../../components/MinimalCard";
import {
  FaStar,
  FaRegStar,
  FaHeart,
  FaRegHeart,
  FaShareAlt,
  FaFilm, // Icon for Details
  FaThumbsUp, // Icon for Recommendations
} from "react-icons/fa";
import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { Mosaic } from "react-loading-indicators";
import toast, { Toaster } from "react-hot-toast";
import { IoClose } from "react-icons/io5";
import Head from "next/head"; // <-- IMPORTED Head

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL_W500 = "https://image.tmdb.org/t/p/w500";
const IMAGE_BASE_URL_ORIGINAL = "https://image.tmdb.org/t/p/original";
const IMAGE_BASE_URL_W185 = "https://image.tmdb.org/t/p/w185"; // For cast

// --- MODAL VARIANT DEFINITIONS ---
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
};

const modalVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: "easeInOut" } },
  exit: { opacity: 0, y: 50, scale: 0.95, transition: { duration: 0.3, ease: "easeInOut" } },
};

// --- NEW COMPONENT: DetailsModal ---
const DetailsModal = ({ onClose, movie, cast, director, trailerKey }) => {
  // Stop background scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
      <motion.div
          key="details-modal-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/80 backdrop-blur-md p-4"
          onClick={onClose}
      >
        <motion.div
            key="details-modal-content"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-3xl max-h-[90vh] bg-secondary rounded-lg shadow-xl border border-secondary-light flex flex-col"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-secondary-light flex-shrink-0">
            <h2 className="text-xl font-semibold text-textprimary">
              Details for {movie.title}
            </h2>
            <button
                onClick={onClose}
                className="text-textsecondary hover:text-textprimary transition-colors"
                aria-label="Close"
            >
              <IoClose size={24} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-secondary-light scrollbar-track-secondary">
            {/* Overview */}
            <div>
              <h3 className="text-lg font-semibold text-textprimary mb-2">
                Overview
              </h3>
              <p className="text-sm text-textsecondary leading-relaxed">
                {movie.overview}
              </p>
            </div>

            {/* Director */}
            {director && (
                <div>
                  <h3 className="text-lg font-semibold text-textprimary mb-2">
                    Director
                  </h3>
                  <p className="text-sm text-textsecondary">{director.name}</p>
                </div>
            )}

            {/* Cast Section */}
            {cast.length > 0 && (
                <div className="pt-4 border-t border-secondary-light">
                  <h3 className="text-lg font-semibold text-textprimary mb-3">
                    Top Cast
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {cast.map((actor) => (
                        <div key={actor.cast_id} className="text-center">
                          <img
                              src={
                                actor.profile_path
                                    ? `${IMAGE_BASE_URL_W185}${actor.profile_path}`
                                    : "/placeholder.jpg" // You should have a placeholder image in your /public folder
                              }
                              alt={actor.name}
                              onError={(e) => (e.currentTarget.src = "/placeholder.jpg")} // Fallback
                              className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover mx-auto mb-1 shadow-md border-2 border-secondary-light"
                          />
                          <p className="text-xs md:text-sm text-textprimary font-medium line-clamp-1">
                            {actor.name}
                          </p>
                          <p className="text-xs text-textsecondary line-clamp-1">
                            {actor.character}
                          </p>
                        </div>
                    ))}
                  </div>
                </div>
            )}

            {/* Trailer Section */}
            {trailerKey && (
                <div className="pt-4 border-t border-secondary-light">
                  <h3 className="text-lg font-semibold text-textprimary mb-3">
                    Trailer
                  </h3>
                  <div className="relative aspect-video rounded-lg overflow-hidden shadow-md border border-secondary-light">
                    <iframe
                        src={`https://www.youtube.com/embed/${trailerKey}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                        title={`${movie.title} Trailer`}
                    ></iframe>
                  </div>
                </div>
            )}
          </div>
        </motion.div>
      </motion.div>
  );
};
// --- END DetailsModal ---


// --- NEW COMPONENT: RecommendationsModal ---
const RecommendationsModal = ({ onClose, recommendedMovies, router }) => {
  // Stop background scroll
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleRecClick = (recMovieId) => {
    onClose(); // Close the modal first
    router.push(`/movie/${recMovieId}`); // Then navigate
  };

  return (
      <motion.div
          key="recs-modal-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/80 backdrop-blur-md p-4"
          onClick={onClose}
      >
        <motion.div
            key="recs-modal-content"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-4xl max-h-[90vh] bg-secondary rounded-lg shadow-xl border border-secondary-light flex flex-col"
            onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-secondary-light">
            <h2 className="text-xl font-semibold text-textprimary">
              Recommended for You
            </h2>
            <button
                onClick={onClose}
                className="text-textsecondary hover:text-textprimary transition-colors"
                aria-label="Close"
            >
              <IoClose size={24} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-secondary-light scrollbar-track-secondary">
            {recommendedMovies.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                  {recommendedMovies.map((recMovie) => (
                      <MovieCard
                          key={recMovie.id}
                          movie={recMovie}
                          onClick={() => handleRecClick(recMovie.id)}
                      />
                  ))}
                </div>
            ) : (
                <p className="text-textsecondary text-center py-10 italic">
                  No recommendations found for this movie.
                </p>
            )}
          </div>
        </motion.div>
      </motion.div>
  );
};
// --- END RecommendationsModal ---


// --- Main Component ---
const MovieDetailPage = () => {
  const router = useRouter();
  const { movie_id: id } = router.query;
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;

  const isRouterReady = router.isReady;
  const validId = isRouterReady ? id || null : null;

  const { movie, loading: loadingMovie, error } = useMovie(validId, apiKey);
  const { recommendedMovies } = useRecommendedMovies(validId, apiKey);
  const { cast, trailerKey, director } = useAdditionalDetails(movie, apiKey);

  const [rating, setRating] = useState(0);
  const [savedRating, setSavedRating] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState("");
  const [showRecommend, setShowRecommend] = useState(false);

  // --- NEW: Modal State ---
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isRecsModalOpen, setIsRecsModalOpen] = useState(false);

  const currentUser = auth.currentUser;
  const isMovieReleased = useMemo(() => {
    if (!movie?.release_date) return true;
    return new Date(movie.release_date).getTime() <= Date.now();
  }, [movie]);

  // --- Data Fetching & Actions (No Changes) ---
  useEffect(() => { if (!currentUser || !validId) { setIsFavorite(false); setSavedRating(null); setFriends([]); return; } const fetchData = async () => { const favoritesRef = doc(db, "favorites", currentUser.uid); const favoritesDoc = await getDoc(favoritesRef); if (favoritesDoc.exists()) setIsFavorite((favoritesDoc.data().movies || []).some((m) => m.id === parseInt(validId))); else setIsFavorite(false); const ratingsRef = doc(db, "ratings", currentUser.uid); const ratingsDoc = await getDoc(ratingsRef); let foundRating = null; if (ratingsDoc.exists()) { const movieRating = (ratingsDoc.data().ratings || []).find((r) => r.movieId === parseInt(validId)); if (movieRating) foundRating = movieRating.rating; } setSavedRating(foundRating); setRating(foundRating || 0); const friendsRef = doc(db, "friends", currentUser.uid); const friendsDoc = await getDoc(friendsRef); if (friendsDoc.exists()) { const friendIds = friendsDoc.data().friends || []; const friendsData = await Promise.all( friendIds.map(async (friendId) => { const userRef = doc(db, "users", friendId); const userDoc = await getDoc(userRef); return userDoc.exists() ? { uid: friendId, username: userDoc.data().username } : null; }) ); setFriends(friendsData.filter(Boolean)); } else { setFriends([]); } }; fetchData(); }, [currentUser, validId]);
  const toggleFavorite = async () => { if (!currentUser || !movie) return toast.error("Please log in."); const favoritesRef = doc(db, "favorites", currentUser.uid); const movieData = { id: movie.id, title: movie.title, poster_path: movie.poster_path, }; try { if (isFavorite) { await updateDoc(favoritesRef, { movies: arrayRemove(movieData) }); toast.success(`Removed "${movie.title}" from favorites`); } else { await setDoc( favoritesRef, { movies: arrayUnion(movieData) }, { merge: true } ); toast.success(`Added "${movie.title}" to favorites`); } setIsFavorite((prev) => !prev); } catch (err) { console.error("Error toggling favorite:", err); toast.error("Failed to update favorites."); } };
  const handleRating = (newRating) => { setRating(newRating); saveRating(movie.id, newRating); };
  const saveRating = async (movieId, newRating) => { if (!currentUser || newRating === 0) return; const ratingsRef = doc(db, "ratings", currentUser.uid); const ratingData = { movieId: parseInt(movieId), rating: newRating }; try { const ratingsDoc = await getDoc(ratingsRef); if (ratingsDoc.exists()) { const currentRatings = ratingsDoc.data().ratings || []; const filteredRatings = currentRatings.filter( (r) => r.movieId !== parseInt(movieId) ); await updateDoc(ratingsRef, { ratings: [...filteredRatings, ratingData], }); } else { await setDoc(ratingsRef, { ratings: [ratingData] }); } setSavedRating(newRating); toast.success(`Rated "${movie.title}" ${newRating}/10`); } catch (err) { console.error("Error saving rating:", err); toast.error("Failed to save rating."); setRating(savedRating || 0); } };
  const recommendMovie = async () => { if (!currentUser) { toast.error("Please log in to recommend movies."); return; } if (!selectedFriend) { toast.error("Please select a friend."); return; } if (!movie) { toast.error("Movie data not loaded."); return; } const recommendationRef = doc(db, "recommendations", selectedFriend); const movieData = { id: movie.id, title: movie.title, poster_path: movie.poster_path, recommendedBy: currentUser.uid, recommendedByUsername: currentUser.displayName || "Anonymous", recommendedAt: new Date().toISOString(), type: "movie", }; try { const recommendationDoc = await getDoc(recommendationRef); if (recommendationDoc.exists()) { await updateDoc(recommendationRef, { movies: arrayUnion(movieData), }); } else { await setDoc(recommendationRef, { movies: [movieData], }); } const friend = friends.find((f) => f.uid === selectedFriend); toast.success( `Recommended "${movie.title}" to ${friend?.username || "friend"}` ); setSelectedFriend(""); setShowRecommend(false); } catch (error) { console.error("Error recommending movie:", error); toast.error("Failed to send recommendation."); } };
  useEffect(() => { const saveToHistory = async () => { if (!currentUser || !movie || !movie.id || !movie.title || !isMovieReleased) return; const historyRef = doc(db, "history", currentUser.uid); const movieData = { id: movie.id, title: movie.title, poster_path: movie.poster_path, watchedAt: new Date().toISOString(), type: "movie", }; try { const historyDoc = await getDoc(historyRef); if (historyDoc.exists()) { const recentMovies = (historyDoc.data().movies || []).slice(-5); if (!recentMovies.some((m) => m.id === movie.id)) await updateDoc(historyRef, { movies: arrayUnion(movieData) }); } else { await setDoc(historyRef, { movies: [movieData], episodes: [] }); } } catch (err) { console.error("Error saving to history:", err); } }; if (movie?.id) saveToHistory(); }, [movie, currentUser, isMovieReleased]);

  // --- Render States (No Changes) ---
  if (!isRouterReady || loadingMovie) { return ( <div className="min-h-screen bg-primary flex items-center justify-center"> <NavBar /> <Mosaic color="#DAA520" size="medium" /> </div> ); }
  if (error) { return ( <div className="min-h-screen bg-primary text-textprimary flex flex-col items-center justify-center px-4"> <NavBar /> <div className="text-center mt-20"> <h2 className="text-2xl text-red-500 mb-4">Error Loading Movie</h2> <p className="text-textsecondary mb-6">{error}</p> <button onClick={() => router.push("/home")} className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors"> Go to Home </button> </div> <Footer /> </div> ); }
  if (!movie) { return ( <div className="min-h-screen bg-primary text-textprimary flex flex-col items-center justify-center px-4"> <NavBar /> <div className="text-center mt-20"> <h2 className="text-2xl text-yellow-500 mb-4">Movie Not Found</h2> <p className="text-textsecondary mb-6">The requested movie could not be found.</p> <button onClick={() => router.push("/home")} className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors"> Go to Home </button> </div> <Footer /> </div> ); }

  // --- Main Render (UPDATED) ---
  return (
      <div className="min-h-screen bg-primary text-textprimary flex flex-col font-poppins selection:bg-accent/30">
        <Head>
          <title>{movie ? `${movie.title} (${movie.release_date?.substring(0,4)}) - StreamSynx` : "Movie Details - StreamSynx"}</title>
          <meta name="description" content={movie?.overview ? movie.overview.substring(0, 160) + "..." : "Discover details about movies on StreamSynx."} />
        </Head>
        <Toaster position="bottom-center" toastOptions={{ className: "bg-secondary/90 text-textprimary backdrop-blur-md border border-white/10" }} />
        <NavBar />

        {/* Cinematic Backdrop */}
        {movie.backdrop_path && (
            <div className="absolute top-0 left-0 w-full h-[80vh] -z-10 overflow-hidden" aria-hidden="true">
              <div className="absolute inset-0 bg-primary/40 mix-blend-multiply z-10" />
              <img src={`${IMAGE_BASE_URL_ORIGINAL}${movie.backdrop_path}`} alt="" className="w-full h-full object-cover opacity-30 blur-2xl scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-transparent z-20"></div>
            </div>
        )}

        <main className="flex-1 w-full pt-20 md:pt-24 pb-12 flex flex-col">
          {/* Contained Player Section */}
          <section className="w-full max-w-[1800px] mx-auto px-4 md:px-32 relative z-30">
            <div className="tv-focusable tv-player-frame w-full aspect-video relative group rounded-2xl overflow-hidden shadow-2xl shadow-black/50 bg-black border border-white/10 focus:border-accent"
              role="region"
              tabIndex={0}
              aria-label="Movie player">
              {isMovieReleased ? (
                  <iframe
                      src={`https://vidsrc-embed.ru/embed/movie?tmdb=${movie.id}&autoplay=1`}
                      frameBorder="0"
                      allowFullScreen
                      className="tv-player-iframe w-full h-full absolute inset-0"
                      title={`${movie.title} Movie Player`}
                      tabIndex={0}
                  ></iframe>
              ) : (
                  <div className="w-full h-full absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary/80 to-primary/80 backdrop-blur-md px-6 text-center">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] font-bold text-accent mb-2">Coming Soon</p>
                      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3">Not Released Yet</h2>
                      <p className="text-sm md:text-base text-textsecondary">
                        Releases on {new Date(movie.release_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
              )}
            </div>
          </section>

          {/* Content Container below player */}
          <div className="max-w-7xl mx-auto w-full px-4 md:px-8 mt-6 md:mt-8 space-y-8 md:space-y-12">
            
            {/* Now Playing & Action Bar */}
            <section className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
              <div className="flex-1">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1.5">
                  <span className="section-label text-accent">Feature Presentation</span>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white">{movie.title}</h1>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${isMovieReleased ? "bg-accent/20 text-accent border border-accent/20" : "bg-white/10 text-textsecondary border border-white/20"}`}>
                      {isMovieReleased ? "Available" : "Upcoming"}
                    </span>
                  </div>
                  <p className="text-sm md:text-base text-textsecondary font-medium">
                    {movie.release_date?.substring(0, 4) || "Unknown"} 
                    {movie.runtime ? <span className="text-textprimary"> • {movie.runtime} min</span> : ""}
                  </p>
                </motion.div>
              </div>

              {/* Action Buttons */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-secondary/40 backdrop-blur-md p-1 rounded-2xl border border-white/[0.06]">
                  <button onClick={toggleFavorite} className={`action-btn ${isFavorite ? "text-accent bg-accent/10 border border-accent/20" : ""}`} title="Favorite">
                    {isFavorite ? <FaHeart className="w-4 h-4" /> : <FaRegHeart className="w-4 h-4" />}
                    <span className="hidden sm:inline ml-1 font-semibold">{isFavorite ? "Favorited" : "Favorite"}</span>
                  </button>
                  <div className="w-px h-5 bg-white/10"></div>
                  <button onClick={() => setShowRecommend(!showRecommend)} className="action-btn" title="Share">
                    <FaShareAlt className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1 font-semibold">Share</span>
                  </button>
                </div>
              </motion.div>
            </section>

            {/* Quick Recommend Dropdown */}
            <AnimatePresence>
              {showRecommend && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-card p-4 flex gap-3 max-w-md ml-auto relative z-40">
                    <select value={selectedFriend} onChange={(e) => setSelectedFriend(e.target.value)} className="flex-1 bg-primary/50 text-sm rounded-lg border-none focus:ring-1 focus:ring-accent p-2.5">
                      <option value="">Select buddy to recommend...</option>
                      {friends.map((friend) => ( <option key={friend.uid} value={friend.uid}>{friend.username}</option> ))}
                    </select>
                    <button onClick={recommendMovie} disabled={!selectedFriend} className="action-btn-primary px-5 disabled:opacity-50">Send</button>
                  </motion.div>
              )}
            </AnimatePresence>

            {/* Inline Details Section */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-white/[0.06]">
              {/* Poster & Rating */}
              <div className="col-span-1 flex gap-6 lg:flex-col lg:gap-4">
                <img src={movie.poster_path ? `${IMAGE_BASE_URL_W500}${movie.poster_path}` : "/placeholder.jpg"} alt={movie.title} className="w-32 lg:w-full rounded-xl shadow-xl aspect-[2/3] object-cover border border-white/10" />
                <div className="flex-1 glass-card p-4 flex flex-col justify-center items-center gap-2">
                  <span className="text-xs text-textsecondary font-medium">Your Rating</span>
                  <div className="flex items-center gap-1.5">
                    {[...Array(5)].map((_, i) => (
                        <button key={i} onClick={() => handleRating((i + 1) * 2)} className="text-xl transition-transform hover:scale-110 active:scale-95">
                          {(i + 1) * 2 <= rating ? <FaStar className="text-accent drop-shadow-[0_0_8px_rgba(218,165,32,0.5)]" /> : <FaRegStar className="text-textsecondary/50 hover:text-textsecondary" />}
                        </button>
                    ))}
                  </div>
                  {savedRating && <span className="text-[10px] uppercase font-bold text-accent tracking-wider mt-1">{savedRating} / 10</span>}
                </div>
              </div>

              {/* Info & Cast */}
              <div className="col-span-1 lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-white">Overview</h3>
                  <p className="text-textsecondary leading-relaxed text-sm md:text-base">{movie.overview}</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(movie.genres || []).map((genre) => (
                      <span key={genre.id} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-textsecondary border border-white/10">
                        {genre.name}
                      </span>
                  ))}
                </div>

                {director && (
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-2 uppercase tracking-wider">Director</h3>
                        <div className="inline-flex items-center gap-3 bg-secondary/30 pr-4 rounded-full border border-white/[0.03]">
                            <img src={director.profile_path ? `${IMAGE_BASE_URL_W185}${director.profile_path}` : "/placeholder.jpg"} alt={director.name} className="w-10 h-10 rounded-full object-cover shadow-inner" />
                            <p className="text-sm font-medium text-white">{director.name}</p>
                        </div>
                    </div>
                )}
                
                {cast.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-white">Top Cast</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {cast.slice(0, 6).map(actor => (
                            <div key={actor.cast_id} className="flex items-center gap-3 bg-secondary/30 p-2 rounded-xl border border-white/[0.03]">
                              <img src={actor.profile_path ? `${IMAGE_BASE_URL_W185}${actor.profile_path}` : "/placeholder.jpg"} alt={actor.name} className="w-12 h-12 rounded-full object-cover shadow-inner" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate">{actor.name}</p>
                                <p className="text-[11px] text-textsecondary truncate">{actor.character}</p>
                              </div>
                            </div>
                        ))}
                      </div>
                    </div>
                )}

                {trailerKey && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-white">Trailer</h3>
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10">
                            <iframe src={`https://www.youtube.com/embed/${trailerKey}`} frameBorder="0" allowFullScreen className="w-full h-full"></iframe>
                        </div>
                    </div>
                )}
              </div>
            </section>

            {/* Recommendations */}
            {recommendedMovies.length > 0 && (
                <section className="pt-8 border-t border-white/[0.06]">
                  <h2 className="text-xl font-semibold mb-4 text-white">More Like This</h2>
                  <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar">
                    {recommendedMovies.map((recMovie) => (
                        <div key={recMovie.id} className="flex-shrink-0 w-40 md:w-48">
                          <SearchCard movie={{ ...recMovie, media_type: "movie", poster_path: `${IMAGE_BASE_URL_W500}${recMovie.poster_path}` }} onClick={() => router.push(`/watch?movie_id=${recMovie.id}`)} />
                        </div>
                    ))}
                  </div>
                </section>
            )}
          </div>
        </main>
        
        {/* Note: Modals intentionally removed as content is now inline */}
        
        <Footer />
      </div>
  );
};

// --- Custom Hooks (Paste your existing hook code here) ---
const useMovie = (id, apiKey) => {
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchMovie = async () => {
      setLoading(true); setMovie(null); setError(null);
      if (!id || !apiKey || id === '0') { setLoading(false); return; }
      try {
        const response = await axios.get(`${BASE_URL}/movie/${id}`, { params: { api_key: apiKey, language: 'en-US' } });
        if (response.data) setMovie(response.data);
        else throw new Error(`Movie with ID ${id} not found.`);
      } catch (err) { console.error("Error in useMovie:", err); setError(err.message || "Failed to fetch movie data.");
      } finally { setLoading(false); }
    };
    if (id && id !== '0') fetchMovie();
    else setLoading(false);
  }, [id, apiKey]);
  return { movie, loading, error };
};

const useRecommendedMovies = (id, apiKey) => {
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  useEffect(() => {
    const fetchRecommendedMovies = async () => {
      if (!id || !apiKey || id === '0') { setRecommendedMovies([]); return; }
      try {
        const response = await axios.get(`${BASE_URL}/movie/${id}/recommendations`, { params: { api_key: apiKey, language: 'en-US', page: 1 } });
        const filtered = response.data.results.filter(m => m.poster_path).slice(0, 10); // Sliced to 10
        setRecommendedMovies(filtered);
      } catch (error) { console.error("Error fetching recommended movies:", error); setRecommendedMovies([]); }
    };
    if (id && id !== '0') fetchRecommendedMovies();
    else setRecommendedMovies([]);
  }, [id, apiKey]);
  return { recommendedMovies };
};

const useAdditionalDetails = (movie, apiKey) => {
  const [cast, setCast] = useState([]);
  const [trailerKey, setTrailerKey] = useState("");
  const [director, setDirector] = useState(null);
  useEffect(() => {
    if (!movie || !movie.id || !apiKey) { setCast([]); setTrailerKey(""); setDirector(null); return; };
    const fetchAdditionalDetails = async () => {
      try {
        const [creditsResponse, videosResponse] = await Promise.all([
          axios.get(`${BASE_URL}/movie/${movie.id}/credits`, { params: { api_key: apiKey, language: 'en-US' }, }),
          axios.get(`${BASE_URL}/movie/${movie.id}/videos`, { params: { api_key: apiKey, language: 'en-US' }, }),
        ]);
        setCast(creditsResponse.data.cast.slice(0, 6)); // Sliced to 6
        const directorData = creditsResponse.data.crew.find((member) => member.job === "Director");
        setDirector(directorData || null);
        const trailer = videosResponse.data.results.find((vid) => vid.type === "Trailer" && vid.site === "YouTube");
        setTrailerKey(trailer ? trailer.key : "");
      } catch (error) { console.error("Error fetching additional movie data:", error); setCast([]); setTrailerKey(""); setDirector(null); }
    };
    fetchAdditionalDetails();
  }, [movie, apiKey]);
  return { cast, trailerKey, director };
};
// --- End Custom Hooks ---

export default MovieDetailPage;