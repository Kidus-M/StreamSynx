// pages/tv/[tv_id].jsx (or your watchTv page route)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { motion } from "framer-motion";
import NavBar from "../../components/NavBar"; // Adjust path if needed
import Footer from "../../components/Footer"; // Adjust path if needed
import EpisodeCard from "../../components/EpisodeCard"; // Adjust path if needed
import SearchCard from "../../components/MinimalCard"; // Adjust path if needed (using this for recommendations)
import {
  FaStar,
  FaRegStar,
  FaHeart,
  FaRegHeart,
  FaShareAlt,
} from "react-icons/fa";
import { auth, db } from "../../firebase"; // Adjust path if needed
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
import Head from 'next/head';

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL_W500 = "https://image.tmdb.org/t/p/w500";
const IMAGE_BASE_URL_ORIGINAL = "https://image.tmdb.org/t/p/original";

// --- Custom Hooks (Keep as is) ---
const useTVShow = (id, apiKey) => {
  const [tvShow, setTVShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchTVShow = async () => {
      setLoading(true);
      setTVShow(null);
      setError(null);
      if (!id || !apiKey || id === "0") {
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(`${BASE_URL}/tv/${id}`, {
          params: { api_key: apiKey, language: "en-US" },
        });
        if (response.data) setTVShow(response.data);
        else throw new Error(`TV Show with ID ${id} not found.`);
      } catch (err) {
        console.error("Error in useTVShow:", err);
        setError(err.message || "Failed to fetch TV show data.");
      } finally {
        setLoading(false);
      }
    };
    if (id && id !== "0") fetchTVShow();
    else setLoading(false);
  }, [id, apiKey]);
  return { tvShow, loading, error };
};
const useTVSeasonsEpisodes = (id, seasonNumber, apiKey) => {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const fetchEpisodes = async () => {
      if (!id || !apiKey || !seasonNumber || seasonNumber === 0) {
        setEpisodes([]);
        return;
      }
      setLoading(true);
      try {
        const response = await axios.get(
          `${BASE_URL}/tv/${id}/season/${seasonNumber}`,
          { params: { api_key: apiKey, language: "en-US" } }
        );
        setEpisodes(response.data.episodes || []);
      } catch (error) {
        console.error("Error fetching episodes:", error);
        setEpisodes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEpisodes();
  }, [id, apiKey, seasonNumber]);
  return { episodes, loadingEpisodes: loading };
};
const useRecommendedShows = (id, apiKey) => {
  const [recommendedShows, setRecommendedShows] = useState([]);
  useEffect(() => {
    const fetchRecommendedShows = async () => {
      if (!id || !apiKey || id === "0") {
        setRecommendedShows([]);
        return;
      }
      try {
        const response = await axios.get(
          `${BASE_URL}/tv/${id}/recommendations`,
          { params: { api_key: apiKey, language: "en-US", page: 1 } }
        );
        const filtered = response.data.results
          .filter((s) => s.poster_path)
          .slice(0, 10);
        setRecommendedShows(filtered);
      } catch (error) {
        console.error("Error fetching recommended shows:", error);
        setRecommendedShows([]);
      }
    };
    if (id && id !== "0") fetchRecommendedShows();
    else setRecommendedShows([]);
  }, [id, apiKey]);
  return { recommendedShows };
};
const useTVAdditionalDetails = (tvShow, apiKey) => {
  const [cast, setCast] = useState([]);
  const [trailerKey, setTrailerKey] = useState("");
  const [creator, setCreator] = useState(null);
  useEffect(() => {
    if (!tvShow || !tvShow.id || !apiKey) {
      setCast([]);
      setTrailerKey("");
      setCreator(null);
      return;
    }
    const fetchAdditionalDetails = async () => {
      try {
        const [creditsResponse, videosResponse] = await Promise.all([
          axios.get(`${BASE_URL}/tv/${tvShow.id}/credits`, {
            params: { api_key: apiKey, language: "en-US" },
          }),
          axios.get(`${BASE_URL}/tv/${tvShow.id}/videos`, {
            params: { api_key: apiKey, language: "en-US" },
          }),
        ]);
        setCast(creditsResponse.data.cast.slice(0, 6));
        const creatorData = tvShow.created_by?.[0];
        setCreator(creatorData || null);
        const trailer = videosResponse.data.results.find(
          (vid) => vid.type === "Trailer" && vid.site === "YouTube"
        );
        setTrailerKey(trailer ? trailer.key : "");
      } catch (error) {
        console.error("Error fetching additional TV show data:", error);
        setCast([]);
        setTrailerKey("");
        setCreator(null);
      }
    };
    fetchAdditionalDetails();
  }, [tvShow, apiKey]);
  return { cast, trailerKey, creator };
};

// --- Main Component ---
const TVShowPlayerPage = () => {
  const router = useRouter();
  const { tv_id: id } = router.query;
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;

  const isRouterReady = router.isReady;
  const validId = isRouterReady ? id || null : null;

  const { tvShow, loading: loadingShow, error } = useTVShow(validId, apiKey);
  const { recommendedShows } = useRecommendedShows(validId, apiKey);
  const { cast, trailerKey, creator } = useTVAdditionalDetails(tvShow, apiKey);

  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const { episodes, loadingEpisodes } = useTVSeasonsEpisodes(
    validId,
    selectedSeason,
    apiKey
  );

  const [rating, setRating] = useState(0);
  const [savedRating, setSavedRating] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState("");
  const [showRecommend, setShowRecommend] = useState(false);

  const currentUser = auth.currentUser;
  const seasonSectionRef = useRef(null);

  // Fetch User-Specific Data (keep as is)
  useEffect(() => {
    if (!currentUser || !validId) {
      setIsFavorite(false);
      setSavedRating(null);
      setFriends([]);
      return;
    }
  
    const fetchUserData = async () => {
      try {
        // Fetch favorites
        const favoritesRef = doc(db, "favorites", currentUser.uid);
        const favoritesDoc = await getDoc(favoritesRef);
        setIsFavorite(
          favoritesDoc.exists() && 
          (favoritesDoc.data().episodes || []).some(
            (ep) => ep.tvShowId === parseInt(validId)
          )
        );
  
        // Fetch ratings
        const ratingsRef = doc(db, "ratings", currentUser.uid);
        const ratingsDoc = await getDoc(ratingsRef);
        if (ratingsDoc.exists()) {
          const showRating = (ratingsDoc.data().episodes || []).find(
            (ep) => ep.tvShowId === parseInt(validId)
          );
          setSavedRating(showRating?.rating || null);
          setRating(showRating?.rating || 0);
        }
  
        // Fetch friends
        const friendsRef = doc(db, "friends", currentUser.uid);
        const friendsDoc = await getDoc(friendsRef);
        if (friendsDoc.exists()) {
          const friendIds = friendsDoc.data().friends || [];
          const friendsData = await Promise.all(
            friendIds.map(async (friendId) => {
              const userRef = doc(db, "users", friendId);
              const userDoc = await getDoc(userRef);
              return userDoc.exists()
                ? { uid: friendId, username: userDoc.data().username }
                : null;
            })
          );
          setFriends(friendsData.filter(Boolean));
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
  
    fetchUserData();
  }, [currentUser, validId]);

  // Actions (toggleFavoriteShow, handleShowRating, saveShowRating, recommendShow - keep as is)
  const toggleFavoriteShow = async () => {
    if (!currentUser) return toast.error("Please log in.");
    if (!tvShow) return toast.error("Show data not loaded.");
    
    const favoritesRef = doc(db, "favorites", currentUser.uid);
    const episodeData = {
      tvShowId: tvShow.id,
      tvShowName: tvShow.name,
      poster_path: tvShow.poster_path,
      type: "tv",
      favoritedAt: new Date().toISOString()
    };
  
    try {
      const favoritesDoc = await getDoc(favoritesRef);
      
      if (favoritesDoc.exists()) {
        const currentEpisodes = favoritesDoc.data().episodes || [];
        const isFavorite = currentEpisodes.some(ep => ep.tvShowId === tvShow.id);
        
        if (isFavorite) {
          await updateDoc(favoritesRef, {
            episodes: currentEpisodes.filter(ep => ep.tvShowId !== tvShow.id)
          });
          toast.success(`Removed "${tvShow.name}" from favorites`);
          setIsFavorite(false);
        } else {
          await updateDoc(favoritesRef, {
            episodes: arrayUnion(episodeData)
          });
          toast.success(`Added "${tvShow.name}" to favorites`);
          setIsFavorite(true);
        }
      } else {
        await setDoc(favoritesRef, { episodes: [episodeData] });
        toast.success(`Added "${tvShow.name}" to favorites`);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
      toast.error("Failed to update favorites.");
    }
  };
  const handleShowRating = (newRating) => {
    if (!currentUser) {
      toast.error("Please log in to rate shows.");
      return;
    }
    setRating(newRating);
    saveShowRating(newRating);
  };
  
  const saveShowRating = async (newRating) => {
    if (!currentUser || !tvShow) return;
    
    const ratingsRef = doc(db, "ratings", currentUser.uid);
    const ratingData = {
      tvShowId: tvShow.id,
      tvShowName: tvShow.name,
      rating: newRating,
      type: "tv",
      poster_path: tvShow.poster_path,
      ratedAt: new Date().toISOString()
    };
  
    try {
      const ratingsDoc = await getDoc(ratingsRef);
      
      if (ratingsDoc.exists()) {
        const currentEpisodes = ratingsDoc.data().episodes || [];
        const existingIndex = currentEpisodes.findIndex(ep => ep.tvShowId === tvShow.id);
        
        if (existingIndex >= 0) {
          // Create new array with updated rating
          const updatedEpisodes = [...currentEpisodes];
          updatedEpisodes[existingIndex] = ratingData;
          
          await updateDoc(ratingsRef, {
            episodes: updatedEpisodes
          });
        } else {
          await updateDoc(ratingsRef, {
            episodes: arrayUnion(ratingData)
          });
        }
      } else {
        await setDoc(ratingsRef, { episodes: [ratingData] });
      }
      
      setSavedRating(newRating);
      toast.success(`Rated "${tvShow.name}" ${newRating}/10`);
    } catch (err) {
      console.error("Error saving rating:", err);
      toast.error("Failed to save rating.");
      setRating(savedRating || 0);
    }
  };
  const recommendShow = async () => {
    if (!currentUser) {
      toast.error("Please log in to recommend shows.");
      return;
    }
    if (!selectedFriend) {
      toast.error("Please select a friend.");
      return;
    }
    if (!tvShow) {
      toast.error("Show data not loaded.");
      return;
    }
  
    const recommendationRef = doc(db, "recommendations", selectedFriend);
    const episodeData = {
      tvShowId: tvShow.id,
      tvShowName: tvShow.name,
      poster_path: tvShow.poster_path,
      recommendedBy: currentUser.uid,
      recommendedByUsername: currentUser.displayName || "Anonymous",
      recommendedAt: new Date().toISOString(),
      type: "tv"
    };
  
    try {
      await updateDoc(recommendationRef, {
        episodes: arrayUnion(episodeData)
      }, { merge: true });
  
      const friend = friends.find((f) => f.uid === selectedFriend);
      toast.success(
        `Recommended "${tvShow.name}" to ${friend?.username || "friend"}`
      );
      setSelectedFriend("");
      setShowRecommend(false);
    } catch (error) {
      console.error("Error recommending show:", error);
      toast.error("Failed to send recommendation.");
    }
  };

  // Save to History (keep as is)
  useEffect(() => {
    const saveToHistory = async () => {
      if (
        !currentUser ||
        !tvShow ||
        !selectedSeason ||
        !selectedEpisode ||
        selectedEpisode === 0
      )
        return;
      const historyRef = doc(db, "history", currentUser.uid);
      const episodeData = {
        tvShowId: tvShow.id,
        tvShowName: tvShow.name,
        seasonNumber: selectedSeason,
        episodeNumber: selectedEpisode,
        watchedAt: new Date().toISOString(),
        poster_path: tvShow.poster_path,
      };
      try {
        const historyDoc = await getDoc(historyRef);
        if (historyDoc.exists()) {
          const recentEpisodes = (historyDoc.data().episodes || []).slice(-10);
          const alreadyExists = recentEpisodes.some(
            (e) =>
              e.tvShowId === tvShow.id &&
              e.seasonNumber === selectedSeason &&
              e.episodeNumber === selectedEpisode
          );
          if (!alreadyExists)
            await updateDoc(historyRef, { episodes: arrayUnion(episodeData) });
        } else {
          await setDoc(historyRef, { movies: [], episodes: [episodeData] });
        }
      } catch (err) {
        console.error("Error saving episode to history:", err);
      }
    };
    if (selectedEpisode && selectedEpisode > 0) saveToHistory();
  }, [tvShow, selectedSeason, selectedEpisode, currentUser]);

  // --- Episode Click Handler (with Scroll to Top) ---
  const handleEpisodeClick = (episodeNumber) => {
    setSelectedEpisode(episodeNumber);
    // Scroll window to top smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- Season Change Handler (keep as is) ---
  const handleSeasonChange = (seasonNum) => {
    setSelectedSeason(seasonNum);
    setSelectedEpisode(1); // Reset episode selection
  };

  // --- Render States ---
  if (!isRouterReady || loadingShow) {
    return (
      <div className="min-h-screen mt-16 bg-primary flex items-center justify-center">
        {" "}
        <NavBar /> <Mosaic color="#DAA520" size="medium" />{" "}
      </div>
    );
  } // Added mt-16
  if (error) {
    return (
      <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4">
        {" "}
        <NavBar />{" "}
        <div className="text-center">
          {" "}
          <h2 className="text-2xl text-red-500 mb-4">
            Error Loading Show
          </h2>{" "}
          <p className="text-textsecondary mb-6">{error}</p>{" "}
          <button
            onClick={() => router.push("/home")}
            className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            {" "}
            Go to Home{" "}
          </button>{" "}
        </div>{" "}
        <Footer />{" "}
      </div>
    );
  } // Added mt-16
  if (!tvShow) {
    return (
      <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4">
        {" "}
        <NavBar />{" "}
        <div className="text-center">
          {" "}
          <h2 className="text-2xl text-yellow-500 mb-4">
            TV Show Not Found
          </h2>{" "}
          <p className="text-textsecondary mb-6">
            The requested TV show could not be found.
          </p>{" "}
          <button
            onClick={() => router.push("/home")}
            className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            {" "}
            Go to Home{" "}
          </button>{" "}
        </div>{" "}
        <Footer />{" "}
      </div>
    );
  } // Added mt-16

  // --- Main Render ---
  return (
    // --- ADDED MARGIN TOP (mt-16) ---
    <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col font-poppins">
      <Head>
  {/* Basic SEO Meta Tags */}
  <title>{tvShow ? `${tvShow.name} (${tvShow.first_air_date?.substring(0,4)}) - StreamSynx` : 'TV Show Details - StreamSynx'}</title>
  <meta name="description" content={tvShow?.overview ? tvShow.overview.substring(0, 160) + '...' : 'Discover details about TV shows on StreamSynx.'} />
  <link rel="canonical" href={`streamsynx.vercel.app/${router.asPath}`} />

  {/* Open Graph / Facebook Meta Tags */}
  <meta property="og:type" content="video.tv_show" />
  <meta property="og:title" content={tvShow ? `${tvShow.name} (${tvShow.first_air_date?.substring(0,4)}) - StreamSynx` : 'TV Show Details - StreamSynx'} />
  <meta property="og:description" content={tvShow?.overview ? tvShow.overview.substring(0, 160) + '...' : 'Discover details about TV shows on StreamSynx.'} />
  {tvShow?.poster_path && <meta property="og:image" content={`https://image.tmdb.org/t/p/w500${tvShow.poster_path}`} />}
  <meta property="og:url" content={`streamsynx.vercel.app/${router.asPath}`} />
  <meta property="og:site_name" content="StreamSynx" />

  {/* Twitter Card Meta Tags */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={tvShow ? `${tvShow.name} (${tvShow.first_air_date?.substring(0,4)}) - StreamSynx` : 'TV Show Details - StreamSynx'} />
  <meta name="twitter:description" content={tvShow?.overview ? tvShow.overview.substring(0, 160) + '...' : 'Discover details about TV shows on StreamSynx.'} />
  {tvShow?.poster_path && <meta name="twitter:image" content={`https://image.tmdb.org/t/p/w500${tvShow.poster_path}`} />}
</Head>
      <Toaster
        position="bottom-center"
        toastOptions={{ className: "bg-secondary text-textprimary" }}
      />
      <NavBar />
      {/* Optional: Blurred backdrop */}
      {tvShow.backdrop_path && (
        <div
          className="absolute top-0 left-0 w-full h-[50vh] md:h-[60vh] -z-10 overflow-hidden"
          aria-hidden="true"
        >
          {" "}
          <img
            src={`${IMAGE_BASE_URL_ORIGINAL}${tvShow.backdrop_path}`}
            alt=""
            className="w-full h-full object-cover opacity-20 blur-md scale-110"
          />{" "}
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-primary/50"></div>{" "}
        </div>
      )}

      {/* Reverted main padding, outer div has margin */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 max-w-6xl mx-auto w-full">
        {/* --- IFRAME PLAYER SECTION --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full rounded-lg overflow-hidden shadow-lg bg-black aspect-video border border-secondary-light"
        >
          {/* WARNING: Using vidlink.pro can be unreliable/insecure/infringing. */}
          <iframe
            // Use TV show link with updated theme colors
            src={`https://vidlink.pro/tv/${tvShow.id}/${selectedSeason}/${selectedEpisode}?primaryColor=DAA520&secondaryColor=A0A0A0&iconColor=EAEAEA&autoplay=true&nextbutton=true`}
            frameBorder="0"
            allowFullScreen
            // sandbox="allow-scripts allow-same-origin"
            className="w-full h-full"
            title={`${tvShow.name} Player - S${selectedSeason} E${selectedEpisode}`} // More specific title
          ></iframe>
        </motion.div>
        {/* --- END IFRAME PLAYER SECTION --- */}

        {/* TV Show Details & Actions Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-secondary rounded-lg shadow-lg p-4 md:p-6"
        >
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            {/* Left Side: Poster */}
            <div className="flex-shrink-0 w-full md:w-48 lg:w-64 mx-auto md:mx-0">
              <img
                src={`${IMAGE_BASE_URL_W500}${tvShow.poster_path}`}
                alt={`${tvShow.name} Poster`}
                className="w-full h-auto object-cover rounded-md shadow-md"
              />
            </div>
            {/* Right Side: Info & Actions */}
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-textprimary mb-1">
                {tvShow.name}
              </h1>
              {tvShow.tagline && (
                <p className="text-sm md:text-md italic text-textsecondary mb-3">
                  {tvShow.tagline}
                </p>
              )}
              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4 text-sm">
                {tvShow.genres?.map((genre) => (
                  <span
                    key={genre.id}
                    className="text-xs uppercase font-medium text-textsecondary border border-secondary-light px-2 py-0.5 rounded"
                  >
                    {genre.name}
                  </span>
                ))}
                <span className="text-textsecondary">•</span>
                <div className="flex items-center gap-1 text-accent">
                  <FaStar />{" "}
                  <span className="font-semibold text-textprimary">
                    {tvShow.vote_average?.toFixed(1)}
                  </span>{" "}
                  <span className="text-xs text-textsecondary">
                    ({tvShow.vote_count?.toLocaleString()})
                  </span>{" "}
                </div>
                <span className="text-textsecondary">•</span>
                <span className="text-textsecondary">
                  {tvShow.first_air_date?.substring(0, 4)}
                </span>
                <span className="text-textsecondary">•</span>
                <span className="text-textsecondary">
                  {tvShow.number_of_seasons} Season
                  {tvShow.number_of_seasons !== 1 ? "s" : ""}
                </span>
              </div>
              {/* Action Buttons (Operating on SHOW level) */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleFavoriteShow}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all duration-200 ${
                    isFavorite
                      ? "bg-accent/20 text-accent border border-accent"
                      : "bg-secondary-light/50 text-textsecondary hover:text-textprimary hover:bg-secondary-light border border-transparent hover:border-secondary-light"
                  }`}
                  title={
                    isFavorite ? "Remove from Favorites" : "Add to Favorites"
                  }
                >
                  {" "}
                  {isFavorite ? <FaHeart /> : <FaRegHeart />}{" "}
                  <span>Favorite</span>{" "}
                </motion.button>
                <div className="flex items-center gap-1 bg-secondary-light/50 px-3 py-1.5 rounded-md border border-transparent group">
                  {" "}
                  <span className="text-sm text-textsecondary mr-1">
                    Rate:
                  </span>{" "}
                  {[...Array(5)].map((_, index) => {
                    const ratingValue = index + 1;
                    return (
                      <motion.button
                        key={ratingValue}
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.2, y: -2 }}
                        onClick={() => handleShowRating(ratingValue * 2)}
                        className="text-lg transition-colors duration-150"
                        title={`Rate ${ratingValue * 2}/10`}
                      >
                        {" "}
                        {ratingValue * 2 <= rating ? (
                          <FaStar className="text-accent" />
                        ) : (
                          <FaRegStar className="text-textsecondary group-hover:text-accent/70" />
                        )}{" "}
                      </motion.button>
                    );
                  })}{" "}
                  {savedRating && (
                    <span className="ml-2 text-xs text-accent">
                      ({savedRating}/10 saved)
                    </span>
                  )}{" "}
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowRecommend(!showRecommend)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-secondary-light/50 text-textsecondary hover:text-textprimary hover:bg-secondary-light border border-transparent hover:border-secondary-light transition-all duration-200"
                  title="Recommend to a friend"
                >
                  {" "}
                  <FaShareAlt /> <span>Recommend</span>{" "}
                </motion.button>
              </div>
              {/* Recommend Friend Section (Conditional) */}
              {showRecommend && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-secondary-light p-3 rounded-md mt-3 mb-5 overflow-hidden"
                >
                  {" "}
                  <label
                    htmlFor="friendSelect"
                    className="block text-xs text-textsecondary mb-1"
                  >
                    Select friend:
                  </label>{" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    <select
                      id="friendSelect"
                      value={selectedFriend}
                      onChange={(e) => setSelectedFriend(e.target.value)}
                      className="flex-grow p-2 border-none rounded bg-secondary text-textprimary text-sm focus:outline-none focus:ring-1 focus:ring-accent appearance-none"
                      style={{
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                        appearance: "none",
                      }}
                    >
                      {" "}
                      <option value="">-- Select --</option>{" "}
                      {friends.map((friend) => (
                        <option key={friend.uid} value={friend.uid}>
                          {friend.username}
                        </option>
                      ))}{" "}
                    </select>{" "}
                    <button
                      onClick={recommendShow}
                      disabled={!selectedFriend}
                      className="flex-shrink-0 bg-accent hover:bg-accent-hover text-primary font-semibold px-4 py-2 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>{" "}
                  </div>{" "}
                </motion.div>
              )}
              {/* Overview */}
              <div>
                <h2 className="text-lg font-semibold text-textprimary mb-2">
                  Overview
                </h2>
                <p className="text-sm text-textsecondary leading-relaxed">
                  {tvShow.overview}
                </p>
              </div>
              {/* Creator */}
              {creator && (
                <div className="mt-4">
                  {" "}
                  <h3 className="text-base font-semibold text-textprimary">
                    Created by
                  </h3>{" "}
                  <p className="text-sm text-textsecondary">{creator.name}</p>{" "}
                </div>
              )}
            </div>
          </div>

          {/* Cast Section */}
          {cast.length > 0 && (
            <div className="mt-6 pt-6 border-t border-secondary-light">
              {" "}
              <h3 className="text-lg font-semibold text-textprimary mb-3">
                Top Cast
              </h3>{" "}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {" "}
                {cast.map((actor) => (
                  <div key={actor.cast_id} className="text-center">
                    {" "}
                    <img
                      src={
                        actor.profile_path
                          ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                          : "/placeholder.jpg"
                      }
                      alt={actor.name}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover mx-auto mb-1 shadow-md border-2 border-secondary-light"
                    />{" "}
                    <p className="text-xs md:text-sm text-textprimary font-medium line-clamp-1">
                      {actor.name}
                    </p>{" "}
                    <p className="text-xs text-textsecondary line-clamp-1">
                      {actor.character}
                    </p>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </div>
          )}

          {/* Relocated & Resized Trailer Section */}
          {trailerKey && (
            <div className="mt-6 pt-6 border-t border-secondary-light">
              {" "}
              <h3 className="text-lg font-semibold text-textprimary mb-3">
                Trailer
              </h3>{" "}
              <div className="relative max-w-xl mx-auto aspect-video rounded-lg overflow-hidden shadow-md border border-secondary-light">
                {" "}
                <iframe
                  src={`https://www.youtube.com/embed/${trailerKey}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                  title={`${tvShow.name} Trailer`}
                ></iframe>{" "}
              </div>{" "}
            </div>
          )}
        </motion.section>

        {/* Season and Episodes Selection */}
        <section
          ref={seasonSectionRef}
          className="bg-secondary rounded-lg shadow-lg p-4 md:p-6"
        >
          <div className="mb-6">
            <h3 className="text-xl md:text-2xl font-bold mb-4 text-textprimary">
              Seasons
            </h3>
            <div className="flex flex-wrap gap-2">
              {(tvShow.seasons || [])
                .filter(
                  (season) =>
                    season.season_number !== 0 && season.episode_count > 0
                )
                .map((season) => (
                  <button
                    key={season.id}
                    onClick={() => handleSeasonChange(season.season_number)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                      selectedSeason === season.season_number
                        ? "bg-accent text-primary shadow-md"
                        : "bg-secondary-light text-textsecondary hover:bg-secondary-light/70 hover:text-textprimary"
                    }`}
                  >
                    {" "}
                    Season {season.season_number}{" "}
                  </button>
                ))}
            </div>
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold mb-4 text-textprimary">
              {" "}
              Episodes {selectedSeason ? `(Season ${selectedSeason})` : ""}{" "}
            </h3>
            {loadingEpisodes ? (
              <div className="flex justify-center items-center h-40">
                <Mosaic color="#DAA520" size="small" />
              </div>
            ) : episodes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {episodes.map((episode) => (
                  <EpisodeCard
                    key={episode.id}
                    episode={episode}
                    showId={tvShow.id}
                    seasonNumber={selectedSeason}
                    isSelected={selectedEpisode === episode.episode_number}
                    onWatchClick={() =>
                      handleEpisodeClick(episode.episode_number)
                    }
                    // Pass theme colors if needed by EpisodeCard
                    theme={{
                      accent: "accent",
                      secondary: "secondary-light",
                      textPrimary: "text-textprimary",
                      textSecondary: "text-textsecondary",
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-textsecondary italic">
                No episodes found for this season.
              </p>
            )}
          </div>
        </section>

        {/* Recommended Shows Section */}
        {recommendedShows.length > 0 && (
          <section className="mt-6 md:mt-8">
            <h2 className="text-xl md:text-2xl font-bold mb-4 text-textprimary">
              Recommended Shows
            </h2>
            {/* Added scrollbar-hide */}
            <div className="flex overflow-x-auto hide-scrollbar space-x-4 pb-4 scrollbar-thin scrollbar-thumb-secondary-light scrollbar-track-transparent scrollbar-hide">
              {recommendedShows.map((recShow) => (
                <div key={recShow.id} className="flex-shrink-0 w-36 md:w-44 ">
                  <SearchCard
                    movie={{
                      ...recShow,
                      media_type: "tv",
                      poster_path: `${IMAGE_BASE_URL_W500}${recShow.poster_path}`,
                    }}
                    // onClick={() => router.push(`/tv/${recShow.id}`)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default TVShowPlayerPage;