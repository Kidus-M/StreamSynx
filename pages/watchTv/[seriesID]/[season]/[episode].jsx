import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "../../../../components/NavBar"; // Adjust path
import Footer from "../../../../components/Footer"; // Adjust path
import EpisodeCard from "../../../../components/EpisodeCard"; // Adjust path
import SearchCard from "../../../../components/MinimalCard"; // Adjust path
import {
    FaStar,
    FaRegStar,
    FaHeart,
    FaRegHeart,
    FaShareAlt,
    FaFilm, // Icon for Details
    FaListOl, // Icon for Episodes
    FaChevronLeft,
    FaChevronRight,
} from "react-icons/fa";
import { auth, db } from "../../../../firebase"; // Adjust path
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
        useEffect(() => {
            const controller = new AbortController();
            let isLatestRequest = true;

            const fetchEpisodes = async () => {
                if (!id || !apiKey || !seasonNumber || seasonNumber === 0) {
                    setEpisodes([]);
                    setLoading(false);
                    return;
                }

                setLoading(true);
                setEpisodes([]);

                try {
                    const response = await axios.get(`${BASE_URL}/tv/${id}/season/${seasonNumber}`, {
                        params: { api_key: apiKey, language: "en-US" },
                        signal: controller.signal,
                    });

                    if (!isLatestRequest) return;
                    setEpisodes(response.data.episodes || []);
                } catch (error) {
                    if (error?.code === "ERR_CANCELED") return;
                    console.error("Error fetching episodes:", error);
                    if (isLatestRequest) setEpisodes([]);
                } finally {
                    if (isLatestRequest) setLoading(false);
                }
            };

            fetchEpisodes();

            return () => {
                isLatestRequest = false;
                controller.abort();
            };
        }, [id, apiKey, seasonNumber]);
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
                                {episodes.map((episode) => {
                                    const isReleased = !episode.air_date || new Date(episode.air_date).getTime() <= Date.now();
                                    return (
                                    <EpisodeCard
                                        key={episode.id}
                                        episode={episode}
                                        showId={tvShow.id}
                                        seasonNumber={selectedSeason}
                                        isSelected={selectedEpisode === episode.episode_number}
                                        isAvailable={isReleased}
                                        unavailableReason={`Available on ${episode.air_date || "a later date"}`}
                                        onWatchClick={() => {
                                            if (!isReleased) return;
                                            handleEpisodeClick(episode.episode_number, selectedSeason);
                                            onClose(); // Close modal on episode click
                                        }}
                                        // Pass theme colors
                                        theme={{
                                            accent: "accent",
                                            secondary: "secondary-light",
                                            textPrimary: "text-textprimary",
                                            textSecondary: "text-textsecondary",
                                            primary: "primary"
                                        }}
                                    />
                                    );
                                })}
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
    useEffect(() => {
        const controller = new AbortController();
        let isLatestRequest = true;

        const fetchEpisodes = async () => {
            if (!id || !apiKey || !seasonNumber || seasonNumber === 0) {
                setEpisodes([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            setEpisodes([]);

            try {
                const response = await axios.get(`${BASE_URL}/tv/${id}/season/${seasonNumber}`, {
                    params: { api_key: apiKey, language: "en-US" },
                    signal: controller.signal,
                });

                if (!isLatestRequest) return;
                setEpisodes(response.data.episodes || []);
            } catch (error) {
                if (error?.code === "ERR_CANCELED") return;
                console.error("Error fetching episodes:", error);
                if (isLatestRequest) setEpisodes([]);
            } finally {
                if (isLatestRequest) setLoading(false);
            }
        };

        fetchEpisodes();

        return () => {
            isLatestRequest = false;
            controller.abort();
        };
    }, [id, apiKey, seasonNumber]);
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
    const { seriesID: id, season, episode } = router.query; // Get S/E from URL
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
    const { episodes: selectedSeasonEpisodes } = useTVSeasonsEpisodes(
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

    // --- NEW: Modal State ---
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isEpisodesModalOpen, setIsEpisodesModalOpen] = useState(false);

    const currentUser = auth.currentUser;

    // Set initial S/E from URL query params
    useEffect(() => {
        if (isRouterReady) {
            const seasonNum = season ? parseInt(season) : 1;
            const episodeNum = episode ? parseInt(episode) : 1;
            setSelectedSeason(seasonNum);
            setSelectedEpisode(episodeNum);
            setModalViewSeason(seasonNum); // Sync modal view
        }
    }, [isRouterReady, season, episode]);

    // Fetch User-Specific Data (Your logic)
    useEffect(() => {
        if (!currentUser || !validId) { setIsFavorite(false); setSavedRating(null); setFriends([]); return; }
        const fetchUserData = async () => {
            try {
                const favoritesRef = doc(db, "favorites", currentUser.uid);
                const favoritesDoc = await getDoc(favoritesRef);
                setIsFavorite( favoritesDoc.exists() && (favoritesDoc.data().episodes || []).some((ep) => ep.tvShowId === parseInt(validId)) );
                const ratingsRef = doc(db, "ratings", currentUser.uid);
                const ratingsDoc = await getDoc(ratingsRef);
                if (ratingsDoc.exists()) {
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
        const episodeData = { tvShowId: tvShow.id, tvShowName: tvShow.name, poster_path: tvShow.poster_path, recommendedBy: currentUser.uid, recommendedByUsername: currentUser.displayName || "Anonymous", recommendedAt: new Date().toISOString(), type: "tv" };
        try {
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

    const isEpisodeReleased = useCallback((ep) => {
        if (!ep?.air_date) return true;
        return new Date(ep.air_date).getTime() <= Date.now();
    }, []);

    const goToEpisode = useCallback((seasonNumber, episodeNumber) => {
        setSelectedSeason(seasonNumber);
        setSelectedEpisode(episodeNumber);
        setModalViewSeason(seasonNumber);
        router.push(`/watchTv/${id}/${seasonNumber}/${episodeNumber}`, undefined, { shallow: true });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [router, id]);

    const playableEpisodesInSeason = useMemo(() => {
        return (selectedSeasonEpisodes || [])
            .filter(isEpisodeReleased)
            .sort((a, b) => a.episode_number - b.episode_number);
    }, [selectedSeasonEpisodes, isEpisodeReleased]);

    const currentEpisodeDetails = useMemo(() => {
        return (selectedSeasonEpisodes || []).find((ep) => ep.episode_number === selectedEpisode) || null;
    }, [selectedSeasonEpisodes, selectedEpisode]);

    const isCurrentEpisodeReleased = currentEpisodeDetails ? isEpisodeReleased(currentEpisodeDetails) : true;

    // --- Episode Click Handler (UPDATED) ---
    const handleEpisodeClick = (episodeNumber, seasonNumber = selectedSeason) => {
        const targetEpisode = (seasonNumber === selectedSeason ? selectedSeasonEpisodes : episodes)
            ?.find((ep) => ep.episode_number === episodeNumber);
        if (targetEpisode && !isEpisodeReleased(targetEpisode)) {
            toast.error("This episode has not aired yet.");
            return;
        }
        goToEpisode(seasonNumber, episodeNumber);
    };

    const navigateToAdjacentEpisode = async (direction) => {
        if (!tvShow || !validId || !apiKey) return;

        const currentIndex = playableEpisodesInSeason.findIndex((ep) => ep.episode_number === selectedEpisode);

        if (direction === "next" && currentIndex >= 0 && currentIndex < playableEpisodesInSeason.length - 1) {
            goToEpisode(selectedSeason, playableEpisodesInSeason[currentIndex + 1].episode_number);
            return;
        }

        if (direction === "prev" && currentIndex > 0) {
            goToEpisode(selectedSeason, playableEpisodesInSeason[currentIndex - 1].episode_number);
            return;
        }

        const candidateSeasons = (tvShow.seasons || [])
            .filter((s) => s.season_number > 0 && s.episode_count > 0)
            .sort((a, b) => a.season_number - b.season_number);

        const orderedCandidates = direction === "next"
            ? candidateSeasons.filter((s) => s.season_number > selectedSeason)
            : candidateSeasons.filter((s) => s.season_number < selectedSeason).reverse();

        for (const seasonMeta of orderedCandidates) {
            try {
                const response = await axios.get(`${BASE_URL}/tv/${validId}/season/${seasonMeta.season_number}`, {
                    params: { api_key: apiKey, language: "en-US" },
                });

                const releasedEpisodes = (response.data.episodes || [])
                    .filter(isEpisodeReleased)
                    .sort((a, b) => a.episode_number - b.episode_number);

                if (!releasedEpisodes.length) {
                    continue;
                }

                const target = direction === "next"
                    ? releasedEpisodes[0]
                    : releasedEpisodes[releasedEpisodes.length - 1];
                goToEpisode(seasonMeta.season_number, target.episode_number);
                return;
            } catch (navError) {
                console.error("Could not fetch adjacent season episodes:", navError);
            }
        }

        toast(direction === "next" ? "You are at the latest released episode." : "You are at the earliest released episode.");
    };

    // --- Season Change Handler (UPDATED) ---
    const handleSeasonChange = (seasonNum) => {
        setModalViewSeason(seasonNum); // Change season *viewed in modal*
        // Update URL to S/E 1 of new season
        router.push(`/watchTv/${id}/${seasonNum}/1`, undefined, { shallow: true });
        setSelectedSeason(seasonNum);
        setSelectedEpisode(1);
        // Don't close modal, just update the episode list
    };

    // --- Click handler for recommendation card ---
    const handleRecClick = (recShowId) => {
        router.push(`/watchTv/${recShowId}/1/1`); // Navigate to TV player page
    };


    // --- Render States (Themed) ---
    if (!isRouterReady || loadingShow) { return ( <div className="min-h-screen mt-16 bg-primary flex items-center justify-center"> <NavBar /> <Mosaic color="#DAA520" size="medium" /> </div> ); }
    if (error) { return ( <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4"> <NavBar /> <div className="text-center"> <h2 className="text-2xl text-red-500 mb-4">Error Loading Show</h2> <p className="text-textsecondary mb-6">{error}</p> <button onClick={() => router.push("/home")} className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors"> Go to Home </button> </div> <Footer /> </div> ); }
    if (!tvShow) { return ( <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4"> <NavBar /> <div className="text-center"> <h2 className="text-2xl text-yellow-500 mb-4">TV Show Not Found</h2> <p className="text-textsecondary mb-6">The requested TV show could not be found.</p> <button onClick={() => router.push("/home")} className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors"> Go to Home </button> </div> <Footer /> </div> ); }

    // --- Main Render (UPDATED) ---
    return (
        <div className="min-h-screen bg-primary text-textprimary flex flex-col font-poppins selection:bg-accent/30">
            <Head>
                <title>{tvShow ? `${tvShow.name} (S${selectedSeason} E${selectedEpisode}) - StreamSynx` : 'TV Show Details - StreamSynx'}</title>
                <meta name="description" content={tvShow?.overview ? tvShow.overview.substring(0, 160) + '...' : 'Discover details about TV shows on StreamSynx.'} />
            </Head>
            <Toaster position="bottom-center" toastOptions={{ className: "bg-secondary/90 text-textprimary backdrop-blur-md border border-white/10" }} />
            <NavBar />

            {/* Cinematic Backdrop */}
            {tvShow.backdrop_path && (
                <div className="absolute top-0 left-0 w-full h-[80vh] -z-10 overflow-hidden" aria-hidden="true">
                    <div className="absolute inset-0 bg-primary/40 mix-blend-multiply z-10" />
                    <img src={`${IMAGE_BASE_URL_ORIGINAL}${tvShow.backdrop_path}`} alt="" className="w-full h-full object-cover opacity-30 blur-2xl scale-110"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-transparent z-20"></div>
                </div>
            )}

            <main className="flex-1 w-full pt-20 md:pt-24 pb-12 flex flex-col">
                {/* Contained Player Section */}
                <section className="w-full max-w-[1800px] mx-auto px-4 md:px-32 relative z-30">
                    <div className="w-full aspect-video relative group rounded-2xl overflow-hidden shadow-2xl shadow-black/50 bg-black border border-white/10">
                        <iframe
                            key={`${tvShow.id}-${selectedSeason}-${selectedEpisode}`}
                            src={`https://vidsrc-embed.ru/embed/tv?tmdb=${tvShow.id}&season=${selectedSeason}&episode=${selectedEpisode}&autoplay=1`}
                            frameBorder="0"
                            allowFullScreen
                            className="w-full h-full absolute inset-0"
                            title={`${tvShow.name} Player - S${selectedSeason} E${selectedEpisode}`}
                        ></iframe>
                    </div>
                </section>

                {/* Content Container below player */}
                <div className="max-w-7xl mx-auto w-full px-4 md:px-8 mt-6 md:mt-8 space-y-8 md:space-y-12">
                    
                    {/* Now Playing & Action Bar */}
                    <section className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                        <div className="flex-1">
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1.5">
                                <span className="section-label text-accent">Now Playing</span>
                                <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white">{tvShow.name}</h1>
                                <p className="text-sm md:text-base text-textsecondary font-medium">
                                    <span className="text-textprimary">Season {selectedSeason} • Episode {selectedEpisode}</span>
                                    {currentEpisodeDetails?.name && <span className="hidden sm:inline"> • {currentEpisodeDetails.name}</span>}
                                </p>
                            </motion.div>
                        </div>

                        {/* Action Buttons */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 bg-secondary/40 backdrop-blur-md p-1 rounded-2xl border border-white/[0.06]">
                                <button onClick={() => navigateToAdjacentEpisode("prev")} className="action-btn" title="Previous Episode">
                                    <FaChevronLeft className="w-3.5 h-3.5" /> <span className="hidden sm:block">Prev</span>
                                </button>
                                <div className="w-px h-5 bg-white/10"></div>
                                <button onClick={() => navigateToAdjacentEpisode("next")} className="action-btn-primary" title="Next Episode">
                                    <span className="hidden sm:block">Next</span> <FaChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button onClick={toggleFavoriteShow} className={`action-btn ${isFavorite ? "text-accent bg-accent/10 border border-accent/20" : ""}`} title="Favorite">
                                    {isFavorite ? <FaHeart className="w-4 h-4" /> : <FaRegHeart className="w-4 h-4" />}
                                </button>
                                <button onClick={() => setShowRecommend(!showRecommend)} className="action-btn" title="Share">
                                    <FaShareAlt className="w-4 h-4" />
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
                                <button onClick={recommendShow} disabled={!selectedFriend} className="action-btn-primary px-5 disabled:opacity-50">Send</button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Inline Episodes Strip */}
                    <section className="space-y-4">
                        <div className="flex items-end justify-between">
                            <h2 className="text-xl font-semibold text-white">Episodes</h2>
                            
                            {/* Inline Season Selector */}
                            <div className="relative group">
                                <select 
                                    value={modalViewSeason} 
                                    onChange={(e) => handleSeasonChange(Number(e.target.value))}
                                    className="appearance-none bg-secondary/50 border border-white/10 hover:border-white/20 text-sm text-textprimary py-1.5 pl-4 pr-8 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                                >
                                    {(tvShow.seasons || []).filter(s => s.season_number !== 0).map(s => (
                                        <option key={s.id} value={s.season_number}>Season {s.season_number}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-textsecondary group-hover:text-textprimary transition-colors">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        </div>

                        {loadingEpisodes ? (
                            <div className="h-40 flex items-center justify-center bg-secondary/20 rounded-xl"><Mosaic color="#DAA520" size="small" /></div>
                        ) : episodes && episodes.length > 0 ? (
                            <div className="flex overflow-x-auto gap-4 pb-4 episode-strip snap-x">
                                {episodes.map((ep) => (
                                    <div key={ep.id} className="snap-start">
                                        <EpisodeCard
                                            compact={true}
                                            episode={ep}
                                            showId={tvShow.id}
                                            seasonNumber={modalViewSeason}
                                            isSelected={selectedEpisode === ep.episode_number && selectedSeason === modalViewSeason}
                                            isAvailable={isEpisodeReleased(ep)}
                                            onWatchClick={() => handleEpisodeClick(ep.episode_number, modalViewSeason)}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-textsecondary bg-secondary/20 rounded-xl border border-white/5">No episodes available for this season.</div>
                        )}
                    </section>

                    {/* Inline Details Section */}
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-white/[0.06]">
                        {/* Poster & Rating */}
                        <div className="col-span-1 flex gap-6 lg:flex-col lg:gap-4">
                            <img src={tvShow.poster_path ? `${IMAGE_BASE_URL_W500}${tvShow.poster_path}` : "/placeholder.jpg"} alt={tvShow.name} className="w-32 lg:w-full rounded-xl shadow-xl aspect-[2/3] object-cover border border-white/10" />
                            <div className="flex-1 glass-card p-4 flex flex-col justify-center items-center gap-2">
                                <span className="text-xs text-textsecondary font-medium">Your Rating</span>
                                <div className="flex items-center gap-1.5">
                                    {[...Array(5)].map((_, i) => (
                                        <button key={i} onClick={() => handleShowRating((i + 1) * 2)} className="text-xl transition-transform hover:scale-110 active:scale-95">
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
                                <p className="text-textsecondary leading-relaxed text-sm md:text-base">{tvShow.overview}</p>
                            </div>
                            
                            {cast.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-4 text-white">Top Cast</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {cast.slice(0, 4).map(actor => (
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
                        </div>
                    </section>

                    {/* Recommendations */}
                    {recommendedShows.length > 0 && (
                        <section className="pt-8 border-t border-white/[0.06]">
                            <h2 className="text-xl font-semibold mb-4 text-white">More Like This</h2>
                            <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar">
                                {recommendedShows.map((recShow) => (
                                    <div key={recShow.id} className="flex-shrink-0 w-40 md:w-48">
                                        <SearchCard movie={{ ...recShow, media_type: "tv", poster_path: `${IMAGE_BASE_URL_W500}${recShow.poster_path}` }} onClick={() => router.push(`/watchTv/${recShow.id}/1/1`)} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};


export default TVShowPlayerPage;
