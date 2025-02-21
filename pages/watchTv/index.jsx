import React, { useState, useEffect } from "react";
import EpisodeCard from "../../components/EpisodeCard";
import SearchCard from "../../components/MinimalCard";
import NavBar from "../../components/Navbar";
import { useRouter } from "next/router";
import axios from "axios";
import { FaVideo, FaGripLinesVertical } from "react-icons/fa";
import Footer from "../../components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

const TVShowPlayerPage = () => {
  const router = useRouter();
  const { query } = router;
  const [tvShow, setTVShow] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cast, setCast] = useState([]);
  const [trailerKey, setTrailerKey] = useState("");
  const [recommendedShows, setRecommendedShows] = useState([]);
  const [rating, setRating] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  const id = query.tv_id || 0;

  // Fetch TV show details
  useEffect(() => {
    if (!id || !apiKey) {
      setError("TV Show ID or API Key is missing");
      setLoading(false);
      return;
    }

    const fetchTVShow = async () => {
      try {
        const response = await fetch(`${BASE_URL}/tv/${id}?api_key=${apiKey}&language=en-US`);
        if (!response.ok) throw new Error(`Failed to fetch TV show: ${response.statusText}`);
        const data = await response.json();
        setTVShow(data);
        setSeasons(data.seasons);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTVShow();
  }, [id, apiKey]);

  // Fetch episodes for the selected season
  useEffect(() => {
    if (!id || !apiKey || !selectedSeason) return;

    const fetchEpisodes = async () => {
      try {
        const response = await fetch(`${BASE_URL}/tv/${id}/season/${selectedSeason}?api_key=${apiKey}&language=en-US`);
        if (!response.ok) throw new Error(`Failed to fetch episodes: ${response.statusText}`);
        const data = await response.json();
        setEpisodes(data.episodes);
      } catch (error) {
        console.error("Error fetching episodes:", error);
      }
    };

    fetchEpisodes();
  }, [id, apiKey, selectedSeason]);

  // Fetch recommended TV shows
  useEffect(() => {
    if (!id || !apiKey) return;

    const fetchRecommendedShows = async () => {
      try {
        const response = await fetch(`${BASE_URL}/tv/${id}/recommendations?api_key=${apiKey}&language=en-US&page=1`);
        if (!response.ok) throw new Error(`Failed to fetch recommended shows: ${response.statusText}`);
        const data = await response.json();
        setRecommendedShows(data.results.slice(0, 10));
      } catch (error) {
        console.error("Error fetching recommended shows:", error);
      }
    };

    fetchRecommendedShows();
  }, [id, apiKey]);

  // Fetch additional details (cast and trailer)
  useEffect(() => {
    if (!tvShow || !tvShow.id || !apiKey) return;

    const fetchAdditionalDetails = async () => {
      try {
        const [castResponse, trailerResponse] = await Promise.all([
          axios.get(`${BASE_URL}/tv/${tvShow.id}/credits`, { params: { api_key: apiKey, language: "en-US" } }),
          axios.get(`${BASE_URL}/tv/${tvShow.id}/videos`, { params: { api_key: apiKey, language: "en-US" } }),
        ]);

        setCast(castResponse.data.cast.slice(0, 5));
        const trailer = trailerResponse.data.results.find((vid) => vid.type === "Trailer" && vid.site === "YouTube");
        setTrailerKey(trailer ? trailer.key : "");
      } catch (error) {
        console.error("Error fetching additional TV show data:", error);
      }
    };

    fetchAdditionalDetails();
  }, [tvShow, apiKey]);

  // Check if the episode is already in favorites
  useEffect(() => {
    const checkIfFavorite = async () => {
      if (auth.currentUser && tvShow && selectedEpisode) {
        const favoritesRef = doc(db, "favorites", auth.currentUser.uid);
        const favoritesDoc = await getDoc(favoritesRef);
        if (favoritesDoc.exists()) {
          const episodes = favoritesDoc.data().episodes || [];
          setIsFavorite(episodes.some((e) => e.tvShowId === tvShow.id && e.seasonNumber === selectedSeason && e.episodeNumber === selectedEpisode));
        }
      }
    };
    checkIfFavorite();
  }, [tvShow, selectedSeason, selectedEpisode]);

  // Add/Remove episode from favorites
  const toggleFavorite = async () => {
    if (!auth.currentUser || !tvShow || !selectedEpisode) return;

    const favoritesRef = doc(db, "favorites", auth.currentUser.uid);
    const favoritesDoc = await getDoc(favoritesRef);

    if (isFavorite) {
      await updateDoc(favoritesRef, {
        episodes: arrayRemove({
          tvShowId: tvShow.id,
          tvShowTitle: tvShow.name,
          seasonNumber: selectedSeason,
          episodeNumber: selectedEpisode,
        }),
      });
    } else {
      if (favoritesDoc.exists()) {
        await updateDoc(favoritesRef, {
          episodes: arrayUnion({
            tvShowId: tvShow.id,
            tvShowTitle: tvShow.name,
            seasonNumber: selectedSeason,
            episodeNumber: selectedEpisode,
          }),
        });
      } else {
        await setDoc(favoritesRef, {
          movies: [],
          episodes: [
            {
              tvShowId: tvShow.id,
              tvShowTitle: tvShow.name,
              seasonNumber: selectedSeason,
              episodeNumber: selectedEpisode,
            },
          ],
        });
      }
    }
    setIsFavorite((prev) => !prev);
  };

  // Save watched episode to history
  useEffect(() => {
    const saveToHistory = async () => {
      if (!auth.currentUser || !selectedEpisode || !tvShow) return;

      const historyRef = doc(db, "history", auth.currentUser.uid);
      const historyDoc = await getDoc(historyRef);

      if (historyDoc.exists()) {
        await updateDoc(historyRef, {
          episodes: arrayUnion({
            tvShowId: tvShow.id,
            tvShowTitle: tvShow.name,
            seasonNumber: selectedSeason,
            episodeNumber: selectedEpisode,
            watchedAt: new Date().toISOString(),
          }),
        });
      } else {
        await setDoc(historyRef, {
          movies: [],
          episodes: [
            {
              tvShowId: tvShow.id,
              tvShowTitle: tvShow.name,
              seasonNumber: selectedSeason,
              episodeNumber: selectedEpisode,
              watchedAt: new Date().toISOString(),
            },
          ],
        });
      }
    };

    saveToHistory();
  }, [selectedEpisode, tvShow, selectedSeason]);

  // Save rating for the TV show
  const saveRating = async (tvShowId, rating) => {
    if (!auth.currentUser) return;

    const ratingsRef = doc(db, "ratings", auth.currentUser.uid);
    const ratingsDoc = await getDoc(ratingsRef);

    if (ratingsDoc.exists()) {
      await updateDoc(ratingsRef, {
        ratings: arrayUnion({ tvShowId, rating }),
      });
    } else {
      await setDoc(ratingsRef, {
        ratings: [{ tvShowId, rating }],
      });
    }
  };

  // Handle loading and error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <NavBar />
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <NavBar />
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!tvShow) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <NavBar />
        <p className="text-red-500">TV Show not found</p>
      </div>
    );
  }

  // Scroll to top when an episode is selected
  const handleEpisodeClick = (episodeNumber) => {
    setSelectedEpisode(episodeNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col mt-20">
      <NavBar />
      <main className="flex-1 p-4 space-y-8">
        {/* Video Player Section */}
        <div className="w-full max-w-4xl mx-auto">
          <div className="relative rounded-lg overflow-hidden shadow-lg bg-black h-[500px]">
            <iframe
              src={`https://vidlink.pro/tv/${tvShow.id}/${selectedSeason}/${selectedEpisode}?primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&player=default&title=true&poster=true&autoplay=false&nextbutton=false`}
              frameBorder="0"
              allowFullScreen
              sandbox
              className="w-full h-full"
            ></iframe>
          </div>
        </div>

        {/* Favorite Button */}
        <button onClick={toggleFavorite} className="mt-4 bg-secondary text-white py-2 px-4 rounded">
          {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        </button>

        {/* Rating Section */}
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-4">Rate this Show</h3>
          <input
            type="number"
            min="0"
            max="10"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="p-2 border rounded bg-primary"
          />
          <button onClick={() => saveRating(tvShow.id, rating)} className="ml-2 bg-secondary text-white py-2 px-4 rounded">
            Submit Rating
          </button>
        </div>

        {/* TV Show Details Section */}
        <section className="w-full bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-3xl font-bold mb-4">{tvShow.name}</h2>
          <div className="flex flex-col lg:flex-row gap-8">
            <img src={`${IMAGE_BASE_URL}${tvShow.poster_path}`} alt={tvShow.name} className="w-64 h-96 object-cover rounded-lg" />
            <div className="flex-1">
              <p className="text-gray-300 mb-4">{tvShow.overview}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-secondary">First Air Date:</span>
                  <p>{tvShow.first_air_date}</p>
                </div>
                <div>
                  <span className="text-secondary">Rating:</span>
                  <p>{tvShow.vote_average}</p>
                </div>
                <div>
                  <span className="text-secondary">Genres:</span>
                  <p className="text-orange-600">{tvShow.genres.map((genre) => genre.name).join(", ")}</p>
                </div>
                <div>
                  <span className="text-secondary">Status:</span>
                  <p>{tvShow.status}</p>
                </div>
                <div>
                  <span className="text-secondary">Seasons:</span>
                  <p>{tvShow.number_of_seasons}</p>
                </div>
                <div>
                  <span className="text-secondary">Episodes:</span>
                  <p>{tvShow.number_of_episodes}</p>
                </div>
              </div>
              {trailerKey && (
                <div className="mt-6">
                  <h3 className="text-xl font-bold mb-4">Trailer</h3>
                  <div className="relative w-full h-64">
                    <iframe
                      src={`https://www.youtube.com/embed/${trailerKey}`}
                      frameBorder="0"
                      allowFullScreen
                      className="w-full h-full rounded-lg"
                    ></iframe>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Season Selection */}
        <section className="w-full bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-2xl font-bold mb-4">Seasons</h3>
          <div className="flex flex-wrap gap-2">
            {seasons.map((season) => (
              <button
                key={season.id}
                onClick={() => {
                  setSelectedSeason(season.season_number);
                  setSelectedEpisode(null);
                  setShowAllEpisodes(false);
                }}
                className={`px-4 py-2 rounded-lg ${
                  selectedSeason === season.season_number ? "bg-orange-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Season {season.season_number}
              </button>
            ))}
          </div>
        </section>

        {/* Episodes Section */}
        <section className="w-full">
          <div className="px-6 my-6 flex justify-between items-center">
            <p className="flex justify-between items-center text-lg gap-4">
              <FaGripLinesVertical className="text-2xl" />
              Episodes
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 p-6">
            <AnimatePresence>
              {(showAllEpisodes ? episodes : episodes.slice(0, 8)).map((episode) => (
                <motion.div key={episode.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                  <EpisodeCard episode={episode} onWatchClick={() => handleEpisodeClick(episode.episode_number)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="flex justify-center mt-6">
            {!showAllEpisodes && episodes.length > 8 ? (
              <button onClick={() => setShowAllEpisodes(true)} className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all">
                Show More
              </button>
            ) : (
              showAllEpisodes && (
                <button onClick={() => setShowAllEpisodes(false)} className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all">
                  Show Less
                </button>
              )
            )}
          </div>
        </section>

        {/* Recommended Shows Section */}
        <section className="w-full">
          <div className="px-6 my-6 flex justify-between items-center">
            <p className="flex justify-between items-center text-lg gap-4">
              <FaGripLinesVertical className="text-2xl" />
              Recommended Shows
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6">
            {recommendedShows.map((show) => (
              <SearchCard key={show.id} movie={show} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default TVShowPlayerPage;