import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion"; // Added AnimatePresence
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import MovieCard from "../../components/MinimalCard";
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
    const { id: id } = router.query;
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

    // --- Data Fetching & Actions (No Changes) ---
    useEffect(() => { if (!currentUser || !validId) { setIsFavorite(false); setSavedRating(null); setFriends([]); return; } const fetchData = async () => { const favoritesRef = doc(db, "favorites", currentUser.uid); const favoritesDoc = await getDoc(favoritesRef); if (favoritesDoc.exists()) setIsFavorite((favoritesDoc.data().movies || []).some((m) => m.id === parseInt(validId))); else setIsFavorite(false); const ratingsRef = doc(db, "ratings", currentUser.uid); const ratingsDoc = await getDoc(ratingsRef); let foundRating = null; if (ratingsDoc.exists()) { const movieRating = (ratingsDoc.data().ratings || []).find((r) => r.movieId === parseInt(validId)); if (movieRating) foundRating = movieRating.rating; } setSavedRating(foundRating); setRating(foundRating || 0); const friendsRef = doc(db, "friends", currentUser.uid); const friendsDoc = await getDoc(friendsRef); if (friendsDoc.exists()) { const friendIds = friendsDoc.data().friends || []; const friendsData = await Promise.all( friendIds.map(async (friendId) => { const userRef = doc(db, "users", friendId); const userDoc = await getDoc(userRef); return userDoc.exists() ? { uid: friendId, username: userDoc.data().username } : null; }) ); setFriends(friendsData.filter(Boolean)); } else { setFriends([]); } }; fetchData(); }, [currentUser, validId]);
    const toggleFavorite = async () => { if (!currentUser || !movie) return toast.error("Please log in."); const favoritesRef = doc(db, "favorites", currentUser.uid); const movieData = { id: movie.id, title: movie.title, poster_path: movie.poster_path, }; try { if (isFavorite) { await updateDoc(favoritesRef, { movies: arrayRemove(movieData) }); toast.success(`Removed "${movie.title}" from favorites`); } else { await setDoc( favoritesRef, { movies: arrayUnion(movieData) }, { merge: true } ); toast.success(`Added "${movie.title}" to favorites`); } setIsFavorite((prev) => !prev); } catch (err) { console.error("Error toggling favorite:", err); toast.error("Failed to update favorites."); } };
    const handleRating = (newRating) => { setRating(newRating); saveRating(movie.id, newRating); };
    const saveRating = async (movieId, newRating) => { if (!currentUser || newRating === 0) return; const ratingsRef = doc(db, "ratings", currentUser.uid); const ratingData = { movieId: parseInt(movieId), rating: newRating }; try { const ratingsDoc = await getDoc(ratingsRef); if (ratingsDoc.exists()) { const currentRatings = ratingsDoc.data().ratings || []; const filteredRatings = currentRatings.filter( (r) => r.movieId !== parseInt(movieId) ); await updateDoc(ratingsRef, { ratings: [...filteredRatings, ratingData], }); } else { await setDoc(ratingsRef, { ratings: [ratingData] }); } setSavedRating(newRating); toast.success(`Rated "${movie.title}" ${newRating}/10`); } catch (err) { console.error("Error saving rating:", err); toast.error("Failed to save rating."); setRating(savedRating || 0); } };
    const recommendMovie = async () => { if (!currentUser) { toast.error("Please log in to recommend movies."); return; } if (!selectedFriend) { toast.error("Please select a friend."); return; } if (!movie) { toast.error("Movie data not loaded."); return; } const recommendationRef = doc(db, "recommendations", selectedFriend); const movieData = { id: movie.id, title: movie.title, poster_path: movie.poster_path, recommendedBy: currentUser.uid, recommendedByUsername: currentUser.displayName || "Anonymous", recommendedAt: new Date().toISOString(), type: "movie", }; try { const recommendationDoc = await getDoc(recommendationRef); if (recommendationDoc.exists()) { await updateDoc(recommendationRef, { movies: arrayUnion(movieData), }); } else { await setDoc(recommendationRef, { movies: [movieData], }); } const friend = friends.find((f) => f.uid === selectedFriend); toast.success( `Recommended "${movie.title}" to ${friend?.username || "friend"}` ); setSelectedFriend(""); setShowRecommend(false); } catch (error) { console.error("Error recommending movie:", error); toast.error("Failed to send recommendation."); } };
    useEffect(() => { const saveToHistory = async () => { if (!currentUser || !movie || !movie.id || !movie.title) return; const historyRef = doc(db, "history", currentUser.uid); const movieData = { id: movie.id, title: movie.title, poster_path: movie.poster_path, watchedAt: new Date().toISOString(), type: "movie", }; try { const historyDoc = await getDoc(historyRef); if (historyDoc.exists()) { const recentMovies = (historyDoc.data().movies || []).slice(-5); if (!recentMovies.some((m) => m.id === movie.id)) await updateDoc(historyRef, { movies: arrayUnion(movieData) }); } else { await setDoc(historyRef, { movies: [movieData], episodes: [] }); } } catch (err) { console.error("Error saving to history:", err); } }; if (movie?.id) saveToHistory(); }, [movie, currentUser]);

    // --- Render States (No Changes) ---
    if (!isRouterReady || loadingMovie) { return ( <div className="min-h-screen bg-primary flex items-center justify-center"> <NavBar /> <Mosaic color="#DAA520" size="medium" /> </div> ); }
    if (error) { return ( <div className="min-h-screen bg-primary text-textprimary flex flex-col items-center justify-center px-4"> <NavBar /> <div className="text-center mt-20"> <h2 className="text-2xl text-red-500 mb-4">Error Loading Movie</h2> <p className="text-textsecondary mb-6">{error}</p> <button onClick={() => router.push("/home")} className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors"> Go to Home </button> </div> <Footer /> </div> ); }
    if (!movie) { return ( <div className="min-h-screen bg-primary text-textprimary flex flex-col items-center justify-center px-4"> <NavBar /> <div className="text-center mt-20"> <h2 className="text-2xl text-yellow-500 mb-4">Movie Not Found</h2> <p className="text-textsecondary mb-6">The requested movie could not be found.</p> <button onClick={() => router.push("/home")} className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors"> Go to Home </button> </div> <Footer /> </div> ); }

    // --- Main Render (UPDATED) ---
    return (
        <div className="min-h-screen bg-primary text-textprimary flex flex-col font-poppins">
            <Head>
                <title>{movie ? `${movie.title} (${movie.release_date?.substring(0,4)}) - StreamSynx` : "Movie Details - StreamSynx"}</title>
                <meta name="description" content={movie?.overview ? movie.overview.substring(0, 160) + "..." : "Discover details about movies on StreamSynx."} />
                <link rel="canonical" href={`httpsg://streamsynx.vercel.app/${router.asPath}`} /> {/* Use your site URL */}
                <meta property="og:type" content="video.movie" />
                <meta property="og:title" content={movie ? `${movie.title} (${movie.release_date?.substring(0,4)}) - StreamSynx` : "Movie Details - StreamSynx"} />
                <meta property="og:description" content={movie?.overview ? movie.overview.substring(0, 160) + "..." : "Discover details about movies on StreamSynx."} />
                {movie?.poster_path && ( <meta property="og:image" content={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} /> )}
                <meta property="og:url" content={`https://streamsynx.vercel.app/${router.asPath}`} /> {/* Use your site URL */}
                <meta property="og:site_name" content="StreamSynx" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={movie ? `${movie.title} (${movie.release_date?.substring(0,4)}) - StreamSynx` : "Movie Details - StreamSynx"} />
                <meta name="twitter:description" content={movie?.overview ? movie.overview.substring(0, 160) + "..." : "Discover details about movies on StreamSynx."} />
                {movie?.poster_path && ( <meta name="twitter:image" content={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} /> )}
            </Head>
            <Toaster position="bottom-center" toastOptions={{ className: "bg-secondary text-textprimary" }} />
            <NavBar />

            {/* Blurred Backdrop */}
            {movie.backdrop_path && (
                <div className="absolute top-0 left-0 w-full h-[50vh] md:h-[60vh] -z-10 overflow-hidden" aria-hidden="true">
                    <img src={`${IMAGE_BASE_URL_ORIGINAL}${movie.backdrop_path}`} alt="" className="w-full h-full object-cover opacity-20 blur-md scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-primary/50"></div>
                </div>
            )}

            {/* Main content starts below NavBar */}
            <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 max-w-6xl mx-auto pt-20 mt-16 md:pt-24 w-full">

                {/* --- IFRAME PLAYER SECTION --- */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                    className="w-full rounded-lg overflow-hidden shadow-lg bg-black aspect-video border border-secondary-light"
                >
                    <iframe
                        src={`https://vidlink.pro/movie/${movie.id}?primaryColor=DAA520&secondaryColor=A0A0A0&iconColor=EAEAEA&icons=default&player=default&title=true&poster=true&autoplay=true&nextbutton=true`}
                        frameBorder="0"
                        allowFullScreen
                        className="w-full h-full"
                        title={`${movie.title} Movie Player`}
                    ></iframe>
                </motion.div>

                {/* --- NEW: BUTTON BAR SECTION --- */}
                <motion.section
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-secondary rounded-lg shadow-lg p-3 md:p-4"
                >
                    {/* Main row of buttons */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3">
                        {/* Favorite Button */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={toggleFavorite}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all duration-200 ${
                                isFavorite
                                    ? "bg-accent/20 text-accent border border-accent"
                                    : "bg-secondary-light/50 text-textsecondary hover:text-textprimary hover:bg-secondary-light border border-transparent hover:border-secondary-light"
                            }`}
                            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                        >
                            {isFavorite ? <FaHeart /> : <FaRegHeart />}
                            <span>Favorite</span>
                        </motion.button>

                        {/* Rating Section */}
                        <div className="flex items-center gap-1 bg-secondary-light/50 px-3 py-1.5 rounded-md border border-transparent group">
                            <span className="text-sm text-textsecondary mr-1">Rate:</span>
                            {[...Array(5)].map((_, index) => {
                                const ratingValue = index + 1;
                                return (
                                    <motion.button
                                        key={ratingValue}
                                        whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.2, y: -2 }}
                                        onClick={() => handleRating(ratingValue * 2)}
                                        className="text-lg transition-colors duration-150"
                                        title={`Rate ${ratingValue * 2}/10`}
                                    >
                                        {ratingValue * 2 <= rating ? (
                                            <FaStar className="text-accent" />
                                        ) : (
                                            <FaRegStar className="text-textsecondary group-hover:text-accent/70" />
                                        )}
                                    </motion.button>
                                );
                            })}
                            {savedRating && ( <span className="ml-2 text-xs text-accent">({savedRating}/10)</span> )}
                        </div>

                        {/* Recommend/Share Button */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowRecommend(!showRecommend)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-secondary-light/50 text-textsecondary hover:text-textprimary hover:bg-secondary-light border border-transparent hover:border-secondary-light transition-all duration-200"
                            title="Recommend to a friend"
                        >
                            <FaShareAlt />
                            <span>Recommend</span>
                        </motion.button>

                        {/* Details Modal Button */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsDetailsModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-secondary-light/50 text-textsecondary hover:text-textprimary hover:bg-secondary-light border border-transparent hover:border-secondary-light transition-all duration-200"
                            title="Show Details"
                        >
                            <FaFilm />
                            <span>Details</span>
                        </motion.button>

                        {/* Recommendations Modal Button */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsRecsModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-secondary-light/50 text-textsecondary hover:text-textprimary hover:bg-secondary-light border border-transparent hover:border-secondary-light transition-all duration-200"
                            title="Show Recommendations"
                        >
                            <FaThumbsUp />
                            <span>Recommendations</span>
                        </motion.button>
                    </div>

                    {/* Recommend Friend Section (Conditional) - Stays here */}
                    <AnimatePresence>
                        {showRecommend && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: "auto", marginTop: "1rem" }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                transition={{ duration: 0.3 }}
                                className="bg-secondary-light p-3 rounded-md overflow-hidden"
                            >
                                <label htmlFor="friendSelect" className="block text-xs text-textsecondary mb-1">Select friend:</label>
                                <div className="flex items-center gap-2">
                                    <select
                                        id="friendSelect"
                                        value={selectedFriend}
                                        onChange={(e) => setSelectedFriend(e.target.value)}
                                        className="flex-grow p-2 border-none rounded bg-secondary text-textprimary text-sm focus:outline-none focus:ring-1 focus:ring-accent appearance-none"
                                        style={{ WebkitAppearance: "none", MozAppearance: "none", appearance: "none" }}
                                    >
                                        <option value="">-- Select --</option>
                                        {friends.map((friend) => ( <option key={friend.uid} value={friend.uid}>{friend.username}</option> ))}
                                    </select>
                                    <button
                                        onClick={recommendMovie}
                                        disabled={!selectedFriend}
                                        className="flex-shrink-0 bg-accent hover:bg-accent-hover text-primary font-semibold px-4 py-2 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >Send</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.section>

                {/* --- MOVIE INFO SECTION (Simplified) --- */}
                {/*<motion.section*/}
                {/*    initial={{ opacity: 0 }}*/}
                {/*    animate={{ opacity: 1 }}*/}
                {/*    transition={{ duration: 0.5, delay: 0.2 }}*/}
                {/*    className="bg-secondary rounded-lg shadow-lg p-4 md:p-6"*/}
                {/*>*/}
                {/*  <div className="flex flex-col md:flex-row gap-4 md:gap-6">*/}
                {/*    /!* Left Side: Poster *!/*/}
                {/*    <div className="flex-shrink-0 w-full md:w-48 lg:w-64 mx-auto md:mx-0">*/}
                {/*      <img*/}
                {/*          src={`${IMAGE_BASE_URL_W500}${movie.poster_path}`}*/}
                {/*          alt={`${movie.title} Poster`}*/}
                {/*          className="w-full h-auto object-cover rounded-md shadow-md"*/}
                {/*      />*/}
                {/*    </div>*/}

                {/*    /!* Right Side: Basic Info *!/*/}
                {/*    <div className="flex-1">*/}
                {/*      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-textprimary mb-1">*/}
                {/*        {movie.title}*/}
                {/*      </h1>*/}
                {/*      {movie.tagline && (*/}
                {/*          <p className="text-sm md:text-md italic text-textsecondary mb-3">*/}
                {/*            {movie.tagline}*/}
                {/*          </p>*/}
                {/*      )}*/}
                {/*      /!* Metadata *!/*/}
                {/*      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">*/}
                {/*        {movie.genres?.map((genre) => (*/}
                {/*            <span key={genre.id} className="text-xs uppercase font-medium text-textsecondary border border-secondary-light px-2 py-0.5 rounded">*/}
                {/*          {genre.name}*/}
                {/*        </span>*/}
                {/*        ))}*/}
                {/*        <span className="text-textsecondary">•</span>*/}
                {/*        <div className="flex items-center gap-1 text-accent">*/}
                {/*          <FaStar />*/}
                {/*          <span className="font-semibold text-textprimary">{movie.vote_average?.toFixed(1)}</span>*/}
                {/*          <span className="text-xs text-textsecondary">({movie.vote_count?.toLocaleString()} votes)</span>*/}
                {/*        </div>*/}
                {/*        <span className="text-textsecondary">•</span>*/}
                {/*        <span className="text-textsecondary">{movie.release_date?.substring(0, 4)}</span>*/}
                {/*        <span className="text-textsecondary">•</span>*/}
                {/*        <span className="text-textsecondary">{movie.runtime} min</span>*/}
                {/*      </div>*/}

                {/*      /!* Short Overview (Optional) *!/*/}
                {/*      <div className="mt-4 border-t border-secondary-light pt-4">*/}
                {/*        <h3 className="text-base font-semibold text-textprimary mb-1">Overview</h3>*/}
                {/*        <p className="text-sm text-textsecondary leading-relaxed line-clamp-3">*/}
                {/*          {movie.overview || "No overview available."}*/}
                {/*        </p>*/}
                {/*        <button*/}
                {/*            onClick={() => setIsDetailsModalOpen(true)}*/}
                {/*            className="text-sm text-accent hover:text-accent-hover font-medium mt-1"*/}
                {/*        >*/}
                {/*          Read More...*/}
                {/*        </button>*/}
                {/*      </div>*/}
                {/*    </div>*/}
                {/*  </div>*/}
                {/*</motion.section>*/}

                {/* --- All other sections (Cast, Full Overview, Trailer, Recs) are REMOVED from the main page --- */}

            </main>

            {/* --- RENDER MODALS --- */}
            <AnimatePresence>
                {isDetailsModalOpen && (
                    <DetailsModal
                        onClose={() => setIsDetailsModalOpen(false)}
                        movie={movie}
                        cast={cast}
                        director={director}
                        trailerKey={trailerKey}
                    />
                )}

                {isRecsModalOpen && (
                    <RecommendationsModal
                        onClose={() => setIsRecsModalOpen(false)}
                        recommendedMovies={recommendedMovies}
                        router={router} // Pass router for navigation
                    />
                )}
            </AnimatePresence>

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