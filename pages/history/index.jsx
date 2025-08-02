// pages/history.js
import React, { useEffect, useState, useMemo } from "react";
import NavBar from "../../components/NavBar"; // Adjusted path
import Footer from "../../components/Footer"; // Adjusted path
import { auth, db } from "../../firebase"; // Adjusted path
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import MovieCard from "../../components/MinimalCard"; // Adjusted path
import { Mosaic } from "react-loading-indicators";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  FaChevronDown,
  FaChevronUp,
  FaFilm,
  FaTv,
  FaTrashAlt,
  FaExternalLinkAlt,
} from "react-icons/fa"; // Added Icons
import toast, { Toaster } from "react-hot-toast";
import TimeAgo from "react-timeago"; // Import TimeAgo
import Head from "next/head";
const IMAGE_BASE_URL_W500 = "https://image.tmdb.org/t/p/w500";

// Helper function to format date
const formatDate = (isoString) => {
  if (!isoString) return "";
  try {
    return new Date(isoString).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch (e) {
    return "Invalid Date";
  }
};

// Main HistoryPage component
const HistoryPage = () => {
  const [history, setHistory] = useState({ movies: [], episodes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedShows, setExpandedShows] = useState({});
  const [activeTab, setActiveTab] = useState("movies");

  const currentUser = auth.currentUser;
  const userId = currentUser?.uid;
  const router = useRouter();

  // Fetch and process history
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      if (!userId) {
        setHistory({ movies: [], episodes: [] });
        setLoading(false);
        return;
      }
      try {
        const historyRef = doc(db, "history", userId);
        const historyDoc = await getDoc(historyRef);
        let latestMovies = [];
        let latestEpisodes = [];
        if (historyDoc.exists()) {
          const data = historyDoc.data();
          const uniqueMovies = {};
          (data.movies || []).forEach((movie) => {
            if (!movie.id || !movie.watchedAt) return;
            if (
              !uniqueMovies[movie.id] ||
              new Date(movie.watchedAt) >
                new Date(uniqueMovies[movie.id].watchedAt)
            ) {
              uniqueMovies[movie.id] = movie;
            }
          });
          latestMovies = Object.values(uniqueMovies).sort(
            (a, b) => new Date(b.watchedAt) - new Date(a.watchedAt)
          );
          const uniqueEpisodes = {};
          (data.episodes || []).forEach((episode) => {
            if (
              !episode.tvShowId ||
              !episode.seasonNumber ||
              !episode.episodeNumber ||
              !episode.watchedAt
            )
              return;
            const episodeKey = `${episode.tvShowId}-${episode.seasonNumber}-${episode.episodeNumber}`;
            if (
              !uniqueEpisodes[episodeKey] ||
              new Date(episode.watchedAt) >
                new Date(uniqueEpisodes[episodeKey].watchedAt)
            ) {
              uniqueEpisodes[episodeKey] = episode;
            }
          });
          latestEpisodes = Object.values(uniqueEpisodes).sort(
            (a, b) => new Date(b.watchedAt) - new Date(a.watchedAt)
          );
        }
        setHistory({ movies: latestMovies, episodes: latestEpisodes });
      } catch (err) {
        console.error("Error fetching history:", err);
        setError(err.message || "Failed to load history.");
        setHistory({ movies: [], episodes: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [userId]);

  // Clear History Function
  const clearHistory = async () => {
    if (!userId) return;
    if (!window.confirm("Clear entire watch history? This cannot be undone."))
      return;
    const historyRef = doc(db, "history", userId);
    try {
      await setDoc(historyRef, { movies: [], episodes: [] });
      setHistory({ movies: [], episodes: [] });
      toast.success("Watch history cleared.");
    } catch (err) {
      console.error("Error clearing history:", err);
      toast.error("Failed to clear history.");
    }
  };

  // Toggle Episode List
  const toggleShowEpisodes = (showId) => {
    setExpandedShows((prev) => ({ ...prev, [showId]: !prev[showId] }));
  };

  // Group processed episodes by show ID
  const groupedEpisodes = useMemo(() => {
    return (history?.episodes || []).reduce((acc, episode) => {
      if (!episode.tvShowId || !episode.tvShowName) return acc;
      const showIdStr = String(episode.tvShowId);
      if (!acc[showIdStr]) {
        acc[showIdStr] = {
          id: episode.tvShowId,
          title: episode.tvShowName,
          episodes: [],
          poster_path: null,
        };
      }
      if (!acc[showIdStr].poster_path && episode.poster_path) {
        acc[showIdStr].poster_path = episode.poster_path;
      }
      acc[showIdStr].episodes.push(episode);
      return acc;
    }, {});
  }, [history.episodes]);

  // Framer motion variants
  const episodeListVariants = {
    hidden: { opacity: 0, height: 0, marginTop: 0 },
    visible: {
      opacity: 1,
      height: "auto",
      marginTop: "0.75rem",
      transition: { duration: 0.3, ease: "easeInOut" },
    },
    exit: {
      opacity: 0,
      height: 0,
      marginTop: 0,
      transition: { duration: 0.2, ease: "easeIn" },
    },
  };

  // --- Render Loading / Error / No User ---
  if (loading) {
    return (
      <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center">
        {" "}
        <NavBar />{" "}
        <div className="flex-grow flex items-center justify-center">
          <Mosaic color="#DAA520" size="medium" />
        </div>{" "}
        <Footer />{" "}
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4">
        {" "}
        <NavBar />{" "}
        <div className="text-center">
          <h2 className="text-2xl text-red-500 mb-4">Error Loading History</h2>
          <p className="text-textsecondary mb-6">{error}</p>
        </div>{" "}
        <Footer />{" "}
      </div>
    );
  }
  if (!currentUser) {
    return (
      <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4">
        {" "}
        <Head>
          <title>My History | StreamSynx</title>
          <meta name="description" content="View your collection of Privious  movies and TV show episodes. Your curated list of top picks on StreamSynx." />
          <meta name="keywords" content="History, Past movies, Privious tv shows, liked, StreamSynx" />
        </Head>
        <NavBar />{" "}
        <div className="text-center">
          <h2 className="text-2xl text-accent mb-4">Log In Required</h2>
          <p className="text-textsecondary mb-6">
            Please log in to view your watch history.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Log In
          </button>
        </div>{" "}
        <Footer />{" "}
      </div>
    );
  }

  // --- Main Render ---
  return (
    // Added mt-16
    <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col font-poppins">
      <Toaster
        position="bottom-center"
        toastOptions={{ className: "bg-secondary text-textprimary" }}
      />
      <NavBar />
      <div className="flex-grow">
        <main className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto w-full">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-textprimary">
              Watch History
            </h1>
            {(history.movies.length > 0 || history.episodes.length > 0) && (
              <button
                onClick={clearHistory}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-red-600/50 text-red-300 hover:bg-red-700/20 hover:text-red-200 transition-colors duration-200"
                title="Clear all watch history"
              >
                <FaTrashAlt /> <span>Clear History</span>
              </button>
            )}
          </div>

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
              >
                <FaFilm /> Movies ({history?.movies?.length || 0}){" "}
              </button>
              <button
                onClick={() => setActiveTab("episodes")}
                className={`flex items-center gap-2 whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out ${
                  activeTab === "episodes"
                    ? "border-accent text-accent"
                    : "border-transparent text-textsecondary hover:text-textprimary hover:border-secondary-light"
                }`}
              >
                <FaTv /> TV Episodes ({history?.episodes?.length || 0}){" "}
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === "movies" && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-textprimary sr-only">
                  Watched Movies
                </h2>
                {history?.movies?.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {history.movies.map((movie) => (
                      <div key={`${movie.id}-${movie.watchedAt}`}>
                        <MovieCard
                          movie={movie}
                          onClick={() => router.push(`/watch?movie_id=${movie.id}`)}
                        />
                        <p
                          className="text-xs mt-1.5 text-textsecondary text-center"
                          title={`Watched: ${formatDate(movie.watchedAt)}`}
                        >
                          Watched: {formatDate(movie.watchedAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-textsecondary text-center py-10 italic">
                    You haven't watched any movies yet.
                  </p>
                )}
              </div>
            )}

            {activeTab === "episodes" && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-textprimary sr-only">
                  Watched TV Episodes
                </h2>
                {Object.keys(groupedEpisodes).length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(groupedEpisodes).map(
                      ([showId, showData]) => (
                        <div
                          key={showId}
                          className="bg-secondary rounded-lg p-4 shadow-md border border-secondary-light"
                        >
                          <div className="flex items-center justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {showData.poster_path ? (
                                <img
                                  src={`${IMAGE_BASE_URL_W500}${showData.poster_path}`}
                                  alt={`${showData.title} Poster`}
                                  className="w-12 h-auto object-cover rounded flex-shrink-0 hidden sm:block"
                                />
                              ) : (
                                <div className="w-12 h-[72px] bg-primary rounded flex-shrink-0 hidden sm:flex items-center justify-center text-textsecondary">
                                  <FaTv />
                                </div>
                              )}
                              <div className="flex-grow min-w-0">
                                <Link
                                  href={`/watchTv?tv_id=${showId}`}
                                  className="block group"
                                >
                                  {" "}
                                  <h3
                                    className="text-base md:text-lg font-semibold text-textprimary mb-0.5 line-clamp-1 group-hover:text-accent transition-colors"
                                    title={showData.title}
                                  >
                                    {" "}
                                    {showData.title ||
                                      `Show ID: ${showId}`}{" "}
                                    <FaExternalLinkAlt className="inline ml-1 opacity-60 group-hover:opacity-100 text-xs" />{" "}
                                  </h3>{" "}
                                </Link>
                                <span className="text-xs text-textsecondary">
                                  {" "}
                                  Latest Watch:{" "}
                                  {showData.episodes[0]
                                    ? formatDate(showData.episodes[0].watchedAt)
                                    : "N/A"}{" "}
                                  ({showData.episodes.length} Ep. Watched){" "}
                                </span>
                              </div>
                            </div>
                            <button
                              className="flex-shrink-0 flex items-center gap-1 text-sm text-accent hover:text-accent-hover font-medium p-1"
                              onClick={() => toggleShowEpisodes(showId)}
                              aria-expanded={!!expandedShows[showId]}
                            >
                              {expandedShows[showId] ? (
                                <FaChevronUp size={12} />
                              ) : (
                                <FaChevronDown size={12} />
                              )}
                              <span className="hidden md:inline">
                                {expandedShows[showId] ? "Hide" : "Show"}{" "}
                                Episodes
                              </span>
                            </button>
                          </div>
                          <AnimatePresence>
                            {expandedShows[showId] && (
                              <motion.div
                                key="episode-list"
                                variants={episodeListVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="overflow-hidden border-t border-secondary-light pt-3"
                              >
                                <ul className="space-y-1 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-secondary-light scrollbar-track-secondary">
                                  {(showData.episodes || []).map((episode) => (
                                    <li
                                      key={`${episode.tvShowId}-${episode.seasonNumber}-${episode.episodeNumber}`}
                                    >
                                      <Link
                                        href={`/watchTv?tv_id=${episode.tvShowId}&season=${episode.seasonNumber}&episode=${episode.episodeNumber}`}
                                        className="flex justify-between items-center text-sm text-textsecondary hover:text-textprimary hover:bg-secondary-light p-1.5 rounded transition-colors duration-150 group"
                                      >
                                        <span>
                                          {" "}
                                          S
                                          {String(
                                            episode.seasonNumber
                                          ).padStart(2, "0")}{" "}
                                          E
                                          {String(
                                            episode.episodeNumber
                                          ).padStart(2, "0")}{" "}
                                        </span>
                                        <span
                                          className="text-xs opacity-80"
                                          title={`Watched: ${formatDate(
                                            episode.watchedAt
                                          )}`}
                                        >
                                          {formatDate(episode.watchedAt)}
                                        </span>
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-textsecondary text-center py-10 italic">
                    You haven't watched any TV episodes yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </main>
      </div>{" "}
      {/* End flex-grow wrapper */}
      <Footer />
    </div> // <-- Added closing parenthesis here
  ); // <-- Added closing parenthesis here
};

export default HistoryPage;
