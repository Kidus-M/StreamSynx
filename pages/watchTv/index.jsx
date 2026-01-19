import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
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
  FaFilm, // Icon for Details
  FaListOl, // Icon for Episodes
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
const IMAGE_BASE_URL_W185 = "https://image.tmdb.org/t/p/w185"; // For cast
const IMAGE_BASE_URL_ORIGINAL = "https://image.tmdb.org/t/p/original";

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

// --- NEW COMPONENT: TVDetailsModal ---
const TVDetailsModal = ({ onClose, tvShow, cast, creator, trailerKey }) => {
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);

// --- Custom Hooks (Copied from your file) ---
// (Paste your 4 custom hooks here: useTVShow, useTVSeasonsEpisodes, useRecommendedShows, useTVAdditionalDetails)
// ... (omitted for brevity, they are identical to your provided code) ...
  const useTVShow = (id, apiKey) => {
    const [tvShow, setTVShow] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => { const fetchTVShow = async () => { setLoading(true); setTVShow(null); setError(null); if (!id || !apiKey || id === "0") { setLoading(false); return; } try { const response = await axios.get(`${BASE_URL}/tv/${id}`, { params: { api_key: apiKey, language: "en-US" }, }); if (response.data) setTVShow(response.data); else throw new Error(`TV Show with ID ${id} not found.`); } catch (err) { console.error("Error in useTVShow:", err); setError(err.message || "Failed to fetch TV show data."); } finally { setLoading(false); } }; if (id && id !== "0") fetchTVShow(); else setLoading(false); }, [id, apiKey]);
    return { tvShow, loading, error };
  };
  const useTVSeasonsEpisodes = (id, seasonNumber, apiKey) => {
    const [episodes, setEpisodes] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => { const fetchEpisodes = async () => { if (!id || !apiKey || !seasonNumber || seasonNumber === 0) { setEpisodes([]); return; } setLoading(true); try { const response = await axios.get( `${BASE_URL}/tv/${id}/season/${seasonNumber}`, { params: { api_key: apiKey, language: "en-US" } } ); setEpisodes(response.data.episodes || []); } catch (error) { console.error("Error fetching episodes:", error); setEpisodes([]); } finally { setLoading(false); } }; fetchEpisodes(); }, [id, apiKey, seasonNumber]);
    return { episodes, loadingEpisodes: loading };
  };
  const useRecommendedShows = (id, apiKey) => {
    const [recommendedShows, setRecommendedShows] = useState([]);
    useEffect(() => { const fetchRecommendedShows = async () => { if (!id || !apiKey || id === "0") { setRecommendedShows([]); return; } try { const response = await axios.get( `${BASE_URL}/tv/${id}/recommendations`, { params: { api_key: apiKey, language: "en-US", page: 1 } } ); const filtered = response.data.results .filter((s) => s.poster_path) .slice(0, 10); setRecommendedShows(filtered); } catch (error) { console.error("Error fetching recommended shows:", error); setRecommendedShows([]); } }; if (id && id !== "0") fetchRecommendedShows(); else setRecommendedShows([]); }, [id, apiKey]);
    return { recommendedShows };
  };
  const useTVAdditionalDetails = (tvShow, apiKey) => {
    const [cast, setCast] = useState([]);
    const [trailerKey, setTrailerKey] = useState("");
    const [creator, setCreator] = useState(null);
    useEffect(() => { if (!tvShow || !tvShow.id || !apiKey) { setCast([]); setTrailerKey(""); setCreator(null); return; } const fetchAdditionalDetails = async () => { try { const [creditsResponse, videosResponse] = await Promise.all([ axios.get(`${BASE_URL}/tv/${tvShow.id}/credits`, { params: { api_key: apiKey, language: "en-US" }, }), axios.get(`${BASE_URL}/tv/${tvShow.id}/videos`, { params: { api_key: apiKey, language: "en-US" }, }), ]); setCast(creditsResponse.data.cast.slice(0, 6)); const creatorData = tvShow.created_by?.[0]; setCreator(creatorData || null); const trailer = videosResponse.data.results.find( (vid) => vid.type === "Trailer" && vid.site === "YouTube" ); setTrailerKey(trailer ? trailer.key : ""); } catch (error) { console.error("Error fetching additional TV show data:", error); setCast([]); setTrailerKey(""); setCreator(null); } }; fetchAdditionalDetails(); }, [tvShow, apiKey]);
    return { cast, trailerKey, creator };
  };

  return (
      <motion.div
          key="details-modal-backdrop"
          variants={backdropVariants} initial="hidden" animate="visible" exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/80 backdrop-blur-md p-4"
          onClick={onClose}
      >
        <motion.div
            key="details-modal-content"
            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
            className="relative w-full max-w-3xl max-h-[90vh] bg-secondary rounded-lg shadow-xl border border-secondary-light flex flex-col"
            onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-secondary-light flex-shrink-0">
            <h2 className="text-xl font-semibold text-textprimary">
              Details for {tvShow.name}
            </h2>
            <button onClick={onClose} className="text-textsecondary hover:text-textprimary transition-colors" aria-label="Close">
              <IoClose size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-secondary-light scrollbar-track-secondary">
            <div>
              <h3 className="text-lg font-semibold text-textprimary mb-2">Overview</h3>
              <p className="text-sm text-textsecondary leading-relaxed">{tvShow.overview}</p>
            </div>
            {creator && (
                <div>
                  <h3 className="text-lg font-semibold text-textprimary mb-2">Created By</h3>
                  <p className="text-sm text-textsecondary">{creator.name}</p>
                </div>
            )}
            {cast.length > 0 && (
                <div className="pt-4 border-t border-secondary-light">
                  <h3 className="text-lg font-semibold text-textprimary mb-3">Top Cast</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {cast.map((actor) => (
                        <div key={actor.cast_id} className="text-center">
                          <img
                              src={actor.profile_path ? `${IMAGE_BASE_URL_W185}${actor.profile_path}` : "/placeholder.jpg"}
                              alt={actor.name}
                              onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
                              className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover mx-auto mb-1 shadow-md border-2 border-secondary-light"
                          />
                          <p className="text-xs md:text-sm text-textprimary font-medium line-clamp-1">{actor.name}</p>
                          <p className="text-xs text-textsecondary line-clamp-1">{actor.character}</p>
                        </div>
                    ))}
                  </div>
                </div>
            )}
            {trailerKey && (
                <div className="pt-4 border-t border-secondary-light">
                  <h3 className="text-lg font-semibold text-textprimary mb-3">Trailer</h3>
                  <div className="relative aspect-video rounded-lg overflow-hidden shadow-md border border-secondary-light">
                    <iframe
                        src={`https://www.youtube.com/embed/${trailerKey}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                        title={`${tvShow.name} Trailer`}
                    ></iframe>
                  </div>
                </div>
            )}
          </div>
        </motion.div>
      </motion.div>
  );
};
// --- END TVDetailsModal ---


// --- NEW COMPONENT: TVEpisodesModal ---
const TVEpisodesModal = ({ onClose, tvShow, seasons, selectedSeason, handleSeasonChange, episodes, loadingEpisodes, selectedEpisode, handleEpisodeClick }) => {
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  return (
      <motion.div
          key="episodes-modal-backdrop"
          variants={backdropVariants} initial="hidden" animate="visible" exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/80 backdrop-blur-md p-4"
          onClick={onClose}
      >
        <motion.div
            key="episodes-modal-content"
            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
            className="relative w-full max-w-4xl max-h-[90vh] bg-secondary rounded-lg shadow-xl border border-secondary-light flex flex-col"
            onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-secondary-light flex-shrink-0">
            <h2 className="text-xl font-semibold text-textprimary">
              Episodes for {tvShow.name}
            </h2>
            <button onClick={onClose} className="text-textsecondary hover:text-textprimary transition-colors" aria-label="Close">
              <IoClose size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-secondary-light scrollbar-track-secondary">
            {/* Season Selector */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-textprimary">
                Seasons
              </h3>
              <div className="flex flex-wrap gap-2">
                {(seasons || [])
                    .filter((season) => season.season_number !== 0 && season.episode_count > 0)
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
                          Season {season.season_number}
                        </button>
                    ))}
              </div>
            </div>
            {/* Episode List */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-textprimary">
                Episodes {selectedSeason ? `(Season ${selectedSeason})` : ""}
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
                            // Pass the wrapper click handler to the card
                            onWatchClick={() => {
                              handleEpisodeClick(episode.episode_number);
                              onClose(); // Close modal on episode click
                            }}
                        />
                    ))}
                  </div>
              ) : (
                  <p className="text-textsecondary italic text-center py-10">
                    {selectedSeason ? "No episodes found for this season." : "Please select a season."}
                  </p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
  );
};
// --- END TVEpisodesModal ---


// --- Custom Hooks (Copied from your file) ---
const useTVShow = (id, apiKey) => {
  const [tvShow, setTVShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => { const fetchTVShow = async () => { setLoading(true); setTVShow(null); setError(null); if (!id || !apiKey || id === "0") { setLoading(false); return; } try { const response = await axios.get(`${BASE_URL}/tv/${id}`, { params: { api_key: apiKey, language: "en-US" }, }); if (response.data) setTVShow(response.data); else throw new Error(`TV Show with ID ${id} not found.`); } catch (err) { console.error("Error in useTVShow:", err); setError(err.message || "Failed to fetch TV show data."); } finally { setLoading(false); } }; if (id && id !== "0") fetchTVShow(); else setLoading(false); }, [id, apiKey]);
  return { tvShow, loading, error };
};
const useTVSeasonsEpisodes = (id, seasonNumber, apiKey) => {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => { const fetchEpisodes = async () => { if (!id || !apiKey || !seasonNumber || seasonNumber === 0) { setEpisodes([]); return; } setLoading(true); try { const response = await axios.get( `${BASE_URL}/tv/${id}/season/${seasonNumber}`, { params: { api_key: apiKey, language: "en-US" } } ); setEpisodes(response.data.episodes || []); } catch (error) { console.error("Error fetching episodes:", error); setEpisodes([]); } finally { setLoading(false); } }; fetchEpisodes(); }, [id, apiKey, seasonNumber]);
  return { episodes, loadingEpisodes: loading };
};
const useRecommendedShows = (id, apiKey) => {
  const [recommendedShows, setRecommendedShows] = useState([]);
  useEffect(() => { const fetchRecommendedShows = async () => { if (!id || !apiKey || id === "0") { setRecommendedShows([]); return; } try { const response = await axios.get( `${BASE_URL}/tv/${id}/recommendations`, { params: { api_key: apiKey, language: "en-US", page: 1 } } ); const filtered = response.data.results .filter((s) => s.poster_path) .slice(0, 10); setRecommendedShows(filtered); } catch (error) { console.error("Error fetching recommended shows:", error); setRecommendedShows([]); } }; if (id && id !== "0") fetchRecommendedShows(); else setRecommendedShows([]); }, [id, apiKey]);
  return { recommendedShows };
};
const useTVAdditionalDetails = (tvShow, apiKey) => {
  const [cast, setCast] = useState([]);
  const [trailerKey, setTrailerKey] = useState("");
  const [creator, setCreator] = useState(null);
  useEffect(() => { if (!tvShow || !tvShow.id || !apiKey) { setCast([]); setTrailerKey(""); setCreator(null); return; } const fetchAdditionalDetails = async () => { try { const [creditsResponse, videosResponse] = await Promise.all([ axios.get(`${BASE_URL}/tv/${tvShow.id}/credits`, { params: { api_key: apiKey, language: "en-US" }, }), axios.get(`${BASE_URL}/tv/${tvShow.id}/videos`, { params: { api_key: apiKey, language: "en-US" }, }), ]); setCast(creditsResponse.data.cast.slice(0, 6)); const creatorData = tvShow.created_by?.[0]; setCreator(creatorData || null); const trailer = videosResponse.data.results.find( (vid) => vid.type === "Trailer" && vid.site === "YouTube" ); setTrailerKey(trailer ? trailer.key : ""); } catch (error) { console.error("Error fetching additional TV show data:", error); setCast([]); setTrailerKey(""); setCreator(null); } }; fetchAdditionalDetails(); }, [tvShow, apiKey]);
  return { cast, trailerKey, creator };
};

// --- Main Component ---
const TVShowPlayerPage = () => {
  const router = useRouter();
  const { tv_id: id, season, episode } = router.query; // Get S/E from URL
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;

  const isRouterReady = router.isReady;
  const validId = isRouterReady ? id || null : null;

  const { tvShow, loading: loadingShow, error } = useTVShow(validId, apiKey);
  const { recommendedShows } = useRecommendedShows(validId, apiKey);
  const { cast, trailerKey, creator } = useTVAdditionalDetails(tvShow, apiKey);

  // State for selected S/E (player state)
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  // Use a separate state for the modal's viewed season
  const [modalViewSeason, setModalViewSeason] = useState(1);
  const { episodes, loadingEpisodes } = useTVSeasonsEpisodes(
      validId,
      modalViewSeason, // Fetch episodes based on what modal is viewing
      apiKey
  );

  const [rating, setRating] = useState(0);
  const [savedRating, setSavedRating] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState("");
  const [showRecommend, setShowRecommend] = useState(false);

  // --- NEW: Modal State ---
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEpisodesModalOpen, setIsEpisodesModalOpen] = useState(false);

  const currentUser = auth.currentUser;

  // Set initial S/E from URL query params
  useEffect(() => {
    if (isRouterReady) {
      setSelectedSeason(season ? parseInt(season) : 1);
      setSelectedEpisode(episode ? parseInt(episode) : 1);
      setModalViewSeason(season ? parseInt(season) : 1); // Sync modal view
    }
  }, [isRouterReady, season, episode]);

  // Fetch User-Specific Data (Your logic, slightly adapted)
  useEffect(() => {
    if (!currentUser || !validId) { setIsFavorite(false); setSavedRating(null); setFriends([]); return; }
    const fetchUserData = async () => {
      try {
        const favoritesRef = doc(db, "favorites", currentUser.uid);
        const favoritesDoc = await getDoc(favoritesRef);
        // Your logic checks for the *show* in the episodes array
        setIsFavorite( favoritesDoc.exists() && (favoritesDoc.data().episodes || []).some((ep) => ep.tvShowId === parseInt(validId)) );

        const ratingsRef = doc(db, "ratings", currentUser.uid);
        const ratingsDoc = await getDoc(ratingsRef);
        if (ratingsDoc.exists()) {
          // Your logic rates the *show* but stores it in the episodes array
          const showRating = (ratingsDoc.data().episodes || []).find((ep) => ep.tvShowId === parseInt(validId));
          setSavedRating(showRating?.rating || null); setRating(showRating?.rating || 0);
        }

        const friendsRef = doc(db, "friends", currentUser.uid);
        const friendsDoc = await getDoc(friendsRef);
        if (friendsDoc.exists()) {
          const friendIds = friendsDoc.data().friends || [];
          const friendsData = await Promise.all( friendIds.map(async (friendId) => { const userRef = doc(db, "users", friendId); const userDoc = await getDoc(userRef); return userDoc.exists() ? { uid: friendId, username: userDoc.data().username } : null; }) );
          setFriends(friendsData.filter(Boolean));
        }
      } catch (error) { console.error("Error fetching user data:", error); }
    };
    fetchUserData();
  }, [currentUser, validId]);

  // Actions (Your logic)
  const toggleFavoriteShow = async () => {
    if (!currentUser || !tvShow) return toast.error("Please log in or wait for show to load.");
    const favoritesRef = doc(db, "favorites", currentUser.uid);
    // Your logic stores show data in the 'episodes' array
    const showData = { tvShowId: tvShow.id, tvShowName: tvShow.name, poster_path: tvShow.poster_path, type: "tv", favoritedAt: new Date().toISOString() };
    try {
      const favoritesDoc = await getDoc(favoritesRef);
      if (favoritesDoc.exists()) {
        const currentEpisodes = favoritesDoc.data().episodes || [];
        const isCurrentlyFavorite = currentEpisodes.some(ep => ep.tvShowId === tvShow.id);
        if (isCurrentlyFavorite) {
          await updateDoc(favoritesRef, { episodes: currentEpisodes.filter(ep => ep.tvShowId !== tvShow.id) });
          toast.success(`Removed "${tvShow.name}" from favorites`); setIsFavorite(false);
        } else {
          await updateDoc(favoritesRef, { episodes: arrayUnion(showData) });
          toast.success(`Added "${tvShow.name}" to favorites`); setIsFavorite(true);
        }
      } else {
        await setDoc(favoritesRef, { episodes: [showData] });
        toast.success(`Added "${tvShow.name}" to favorites`); setIsFavorite(true);
      }
    } catch (err) { console.error("Error toggling favorite:", err); toast.error("Failed to update favorites."); }
  };
  const handleShowRating = (newRating) => { if (!currentUser) { toast.error("Please log in to rate."); return; } setRating(newRating); saveShowRating(newRating); };
  const saveShowRating = async (newRating) => {
    if (!currentUser || !tvShow) return;
    const ratingsRef = doc(db, "ratings", currentUser.uid);
    // Your logic stores show rating in the 'episodes' array
    const ratingData = { tvShowId: tvShow.id, tvShowName: tvShow.name, rating: newRating, type: "tv", poster_path: tvShow.poster_path, ratedAt: new Date().toISOString() };
    try {
      const ratingsDoc = await getDoc(ratingsRef);
      if (ratingsDoc.exists()) {
        const currentEpisodes = ratingsDoc.data().episodes || [];
        const existingIndex = currentEpisodes.findIndex(ep => ep.tvShowId === tvShow.id);
        if (existingIndex >= 0) { const updatedEpisodes = [...currentEpisodes]; updatedEpisodes[existingIndex] = ratingData; await updateDoc(ratingsRef, { episodes: updatedEpisodes });
        } else { await updateDoc(ratingsRef, { episodes: arrayUnion(ratingData) }); }
      } else { await setDoc(ratingsRef, { episodes: [ratingData] }); }
      setSavedRating(newRating); toast.success(`Rated "${tvShow.name}" ${newRating}/10`);
    } catch (err) { console.error("Error saving rating:", err); toast.error("Failed to save rating."); setRating(savedRating || 0); }
  };
  const recommendShow = async () => {
    if (!currentUser) { toast.error("Please log in."); return; } if (!selectedFriend) { toast.error("Please select a friend."); return; } if (!tvShow) { toast.error("Show data not loaded."); return; }
    const recommendationRef = doc(db, "recommendations", selectedFriend);
    // Your logic stores show recommendation in the 'episodes' array
    const episodeData = { tvShowId: tvShow.id, tvShowName: tvShow.name, poster_path: tvShow.poster_path, recommendedBy: currentUser.uid, recommendedByUsername: currentUser.displayName || "Anonymous", recommendedAt: new Date().toISOString(), type: "tv" };
    try {
      // Use set with merge:true to create doc if it doesn't exist
      await setDoc(recommendationRef, { episodes: arrayUnion(episodeData) }, { merge: true });
      const friend = friends.find((f) => f.uid === selectedFriend);
      toast.success( `Recommended "${tvShow.name}" to ${friend?.username || "friend"}` );
      setSelectedFriend(""); setShowRecommend(false);
    } catch (error) { console.error("Error recommending show:", error); toast.error("Failed to send recommendation."); }
  };

  // Save to History (Your logic)
  useEffect(() => {
    const saveToHistory = async () => {
      if (!currentUser || !tvShow || !selectedSeason || !selectedEpisode || selectedEpisode === 0) return;
      const historyRef = doc(db, "history", currentUser.uid);
      const episodeData = { tvShowId: tvShow.id, tvShowName: tvShow.name, seasonNumber: selectedSeason, episodeNumber: selectedEpisode, watchedAt: new Date().toISOString(), poster_path: tvShow.poster_path };
      try {
        const historyDoc = await getDoc(historyRef);
        if (historyDoc.exists()) {
          const recentEpisodes = (historyDoc.data().episodes || []).slice(-10);
          const alreadyExists = recentEpisodes.some((e) => e.tvShowId === tvShow.id && e.seasonNumber === selectedSeason && e.episodeNumber === selectedEpisode);
          if (!alreadyExists) await updateDoc(historyRef, { episodes: arrayUnion(episodeData) });
        } else { await setDoc(historyRef, { movies: [], episodes: [episodeData] }); }
      } catch (err) { console.error("Error saving episode to history:", err); }
    };
    if (selectedEpisode && selectedEpisode > 0) saveToHistory();
  }, [tvShow, selectedSeason, selectedEpisode, currentUser]);

  // --- Episode Click Handler (UPDATED) ---
  const handleEpisodeClick = (episodeNumber) => {
    setSelectedEpisode(episodeNumber); // Update player state
    // Update URL without reloading page
    router.push(`/tv/${id}?season=${selectedSeason}&episode=${episodeNumber}`, undefined, { shallow: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- Season Change Handler (UPDATED) ---
  const handleSeasonChange = (seasonNum) => {
    setModalViewSeason(seasonNum); // Change season *viewed in modal*
    // We don't update the main player's season until an episode is clicked
  };

  // --- Render States (Themed) ---
  if (!isRouterReady || loadingShow) { return ( <div className="min-h-screen mt-16 bg-primary flex items-center justify-center"> <NavBar /> <Mosaic color="#DAA520" size="medium" /> </div> ); }
  if (error) { return ( <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4"> <NavBar /> <div className="text-center"> <h2 className="text-2xl text-red-500 mb-4">Error Loading Show</h2> <p className="text-textsecondary mb-6">{error}</p> <button onClick={() => router.push("/home")} className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors"> Go to Home </button> </div> <Footer /> </div> ); }
  if (!tvShow) { return ( <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4"> <NavBar /> <div className="text-center"> <h2 className="text-2xl text-yellow-500 mb-4">TV Show Not Found</h2> <p className="text-textsecondary mb-6">The requested TV show could not be found.</p> <button onClick={() => router.push("/home")} className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors"> Go to Home </button> </div> <Footer /> </div> ); }

  // --- Main Render (UPDATED) ---
  return (
      <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col font-poppins">
        <Head>
          <title>{tvShow ? `${tvShow.name} (S${selectedSeason} E${selectedEpisode}) - StreamSynx` : 'TV Show Details - StreamSynx'}</title>
          <meta name="description" content={tvShow?.overview ? tvShow.overview.substring(0, 160) + '...' : 'Discover details about TV shows on StreamSynx.'} />
          <link rel="canonical" href={`https://streamsynx.vercel.app/${router.asPath}`} />
          <meta property="og:type" content="video.tv_show" />
          <meta property="og:title" content={tvShow ? `${tvShow.name} (S${selectedSeason} E${selectedEpisode}) - StreamSynx` : 'TV Show Details - StreamSynx'} />
          <meta property="og:description" content={tvShow?.overview ? tvShow.overview.substring(0, 160) + '...' : 'Discover details about TV shows on StreamSynx.'} />
          {tvShow?.poster_path && <meta property="og:image" content={`https://image.tmdb.org/t/p/w500${tvShow.poster_path}`} />}
          <meta property="og:url" content={`https://streamsynx.vercel.app/${router.asPath}`} />
          <meta property="og:site_name" content="StreamSynx" />
        </Head>
        <Toaster position="bottom-center" toastOptions={{ className: "bg-secondary text-textprimary" }} />
        <NavBar />

        {/* Blurred Backdrop */}
        {tvShow.backdrop_path && (
            <div className="absolute top-0 left-0 w-full h-[50vh] md:h-[60vh] -z-10 overflow-hidden" aria-hidden="true">
              <img src={`${IMAGE_BASE_URL_ORIGINAL}${tvShow.backdrop_path}`} alt="" className="w-full h-full object-cover opacity-20 blur-md scale-110"/>
              <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-primary/50"></div>
            </div>
        )}

        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 max-w-6xl mx-auto w-full">

          {/* --- IFRAME PLAYER SECTION --- */}
          <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="w-full rounded-lg overflow-hidden shadow-lg bg-black aspect-video border border-secondary-light"
          >
            <iframe
                key={`${tvShow.id}-${selectedSeason}-${selectedEpisode}`} // Force re-render on S/E change
                src={`https://vidsrc-embed.ru/embed/tv?tmdb=${tvShow.id}&season=${selectedSeason}&episode=${selectedEpisode}&autoplay=1`}
                frameBorder="0"
                allowFullScreen
                className="w-full h-full"
                title={`${tvShow.name} Player - S${selectedSeason} E${selectedEpisode}`}
            ></iframe>
          </motion.div>

          {/* --- NEW: BUTTON BAR SECTION --- */}
          <motion.section
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-secondary rounded-lg shadow-lg p-3 md:p-4"
          >
            {/* Main row of buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3">
              {/* Favorite Button (Show-level) */}
              <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleFavoriteShow}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all duration-200 ${
                      isFavorite
                          ? "bg-accent/20 text-accent border border-accent"
                          : "bg-secondary-light/50 text-textsecondary hover:text-textprimary hover:bg-secondary-light border border-transparent hover:border-secondary-light"
                  }`}
                  title={isFavorite ? "Remove Show from Favorites" : "Add Show to Favorites"}
              >
                {isFavorite ? <FaHeart /> : <FaRegHeart />}
                <span>Favorite Show</span>
              </motion.button>

              {/* Rating Section (Show-level) */}
              <div className="flex items-center gap-1 bg-secondary-light/50 px-3 py-1.5 rounded-md border border-transparent group">
                <span className="text-sm text-textsecondary mr-1">Rate Show:</span>
                {[...Array(5)].map((_, index) => {
                  const ratingValue = index + 1;
                  return (
                      <motion.button
                          key={ratingValue}
                          whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.2, y: -2 }}
                          onClick={() => handleShowRating(ratingValue * 2)}
                          className="text-lg transition-colors duration-150"
                          title={`Rate ${ratingValue * 2}/10`}
                      >
                        {ratingValue * 2 <= rating ? (<FaStar className="text-accent" />) : (<FaRegStar className="text-textsecondary group-hover:text-accent/70" />)}
                      </motion.button>
                  );
                })}
                {savedRating && (<span className="ml-2 text-xs text-accent">({savedRating}/10)</span>)}
              </div>

              {/* Recommend/Share Button (Show-level) */}
              <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowRecommend(!showRecommend)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-secondary-light/50 text-textsecondary hover:text-textprimary hover:bg-secondary-light border border-transparent hover:border-secondary-light transition-all duration-200"
                  title="Recommend Show"
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

              {/* Episodes Modal Button */}
              <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsEpisodesModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-secondary-light/50 text-textsecondary hover:text-textprimary hover:bg-secondary-light border border-transparent hover:border-secondary-light transition-all duration-200"
                  title="Show Episodes"
              >
                <FaListOl />
                <span>Episodes</span>
              </motion.button>
            </div>

            {/* Recommend Friend Section (Conditional) */}
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
                          onClick={recommendShow}
                          disabled={!selectedFriend}
                          className="flex-shrink-0 bg-accent hover:bg-accent-hover text-primary font-semibold px-4 py-2 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >Send</button>
                    </div>
                  </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          {/* --- TV SHOW INFO SECTION (Simplified) --- */}
          {/*<motion.section*/}
          {/*    initial={{ opacity: 0 }}*/}
          {/*    animate={{ opacity: 1 }}*/}
          {/*    transition={{ duration: 0.5, delay: 0.2 }}*/}
          {/*    className="bg-secondary rounded-lg shadow-lg p-4 md:p-6"*/}
          {/*>*/}
          {/*  <div className="flex flex-col md:flex-row gap-4 md:gap-6">*/}
          {/*    <div className="flex-shrink-0 w-full md:w-48 lg:w-64 mx-auto md:mx-0">*/}
          {/*      <img*/}
          {/*          src={`${IMAGE_BASE_URL_W500}${tvShow.poster_path}`}*/}
          {/*          alt={`${tvShow.name} Poster`}*/}
          {/*          className="w-full h-auto object-cover rounded-md shadow-md"*/}
          {/*      />*/}
          {/*    </div>*/}
          {/*    <div className="flex-1">*/}
          {/*      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-textprimary mb-1">*/}
          {/*        {tvShow.name}*/}
          {/*      </h1>*/}
          {/*      {tvShow.tagline && (*/}
          {/*          <p className="text-sm md:text-md italic text-textsecondary mb-3">*/}
          {/*            {tvShow.tagline}*/}
          {/*          </p>*/}
          {/*      )}*/}
          {/*      /!* Metadata *!/*/}
          {/*      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">*/}
          {/*        {tvShow.genres?.map((genre) => (*/}
          {/*            <span key={genre.id} className="text-xs uppercase font-medium text-textsecondary border border-secondary-light px-2 py-0.5 rounded">*/}
          {/*          {genre.name}*/}
          {/*        </span>*/}
          {/*        ))}*/}
          {/*        <span className="text-textsecondary">•</span>*/}
          {/*        <div className="flex items-center gap-1 text-accent">*/}
          {/*          <FaStar />*/}
          {/*          <span className="font-semibold text-textprimary">{tvShow.vote_average?.toFixed(1)}</span>*/}
          {/*          <span className="text-xs text-textsecondary">({tvShow.vote_count?.toLocaleString()} votes)</span>*/}
          {/*        </div>*/}
          {/*        <span className="text-textsecondary">•</span>*/}
          {/*        <span className="text-textsecondary">{tvShow.first_air_date?.substring(0, 4)}</span>*/}
          {/*        <span className="text-textsecondary">•</span>*/}
          {/*        <span className="text-textsecondary">{tvShow.number_of_seasons} Season{tvShow.number_of_seasons !== 1 ? "s" : ""}</span>*/}
          {/*      </div>*/}

          {/*      /!* Short Overview *!/*/}
          {/*      <div className="mt-4 border-t border-secondary-light pt-4">*/}
          {/*        <h3 className="text-base font-semibold text-textprimary mb-1">Overview</h3>*/}
          {/*        <p className="text-sm text-textsecondary leading-relaxed line-clamp-3">*/}
          {/*          {tvShow.overview || "No overview available."}*/}
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

          {/*/!* --- Recommended Shows Section (Kept) --- *!/*/}
          {/*{recommendedShows.length > 0 && (*/}
          {/*    <section className="mt-6 md:mt-8">*/}
          {/*      <h2 className="text-xl md:text-2xl font-bold mb-4 text-textprimary">*/}
          {/*        Recommended Shows*/}
          {/*      </h2>*/}
          {/*      <div className="flex overflow-x-auto scrollbar-hide space-x-4 pb-4 scrollbar-thin scrollbar-thumb-secondary-light scrollbar-track-transparent">*/}
          {/*        {recommendedShows.map((recShow) => (*/}
          {/*            <div key={recShow.id} className="flex-shrink-0 w-36 md:w-44">*/}
          {/*              <SearchCard*/}
          {/*                  movie={{*/}
          {/*                    ...recShow,*/}
          {/*                    media_type: "tv",*/}
          {/*                    poster_path: `${IMAGE_BASE_URL_W500}${recShow.poster_path}`,*/}
          {/*                  }}*/}
          {/*                  onClick={() => router.push(`/tv/${recShow.id}`)} // <-- FIXED onClick*/}
          {/*              />*/}
          {/*            </div>*/}
          {/*        ))}*/}
          {/*      </div>*/}
          {/*    </section>*/}
          {/*)}*/}
        </main>

        {/* --- RENDER MODALS --- */}
        <AnimatePresence>
          {isDetailsModalOpen && (
              <TVDetailsModal
                  onClose={() => setIsDetailsModalOpen(false)}
                  tvShow={tvShow}
                  cast={cast}
                  creator={creator}
                  trailerKey={trailerKey}
              />
          )}

          {isEpisodesModalOpen && (
              <TVEpisodesModal
                  onClose={() => setIsEpisodesModalOpen(false)}
                  tvShow={tvShow}
                  seasons={tvShow.seasons} // Pass seasons list from tvShow
                  selectedSeason={modalViewSeason} // Pass the modal's view state
                  handleSeasonChange={setModalViewSeason} // Let modal update its view state
                  episodes={episodes} // Pass episodes fetched based on modalViewSeason
                  loadingEpisodes={loadingEpisodes}
                  selectedEpisode={selectedEpisode} // Pass the *player's* current episode for highlighting
                  handleEpisodeClick={(episodeNumber) => {
                    // This is the action when an episode is clicked
                    handleEpisodeClick(episodeNumber); // Update player state & URL
                    setIsEpisodesModalOpen(false); // Close modal
                  }}
              />
          )}
        </AnimatePresence>

        <Footer />
      </div>
  );
};

export default TVShowPlayerPage;