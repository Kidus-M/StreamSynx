import React, { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import MovieCard from "../../components/MinimalCard";
import { Mosaic } from "react-loading-indicators";

const HistoryPage = () => {
  const [history, setHistory] = useState({ movies: [], episodes: [] });
  const userId = auth.currentUser?.uid;
  const [loading, setLoading] = useState(true);
  const [expandedShows, setExpandedShows] = useState({});

  useEffect(() => {
    const fetchHistory = async () => {
      if (userId) {
        const historyRef = doc(db, "history", userId);
        const historyDoc = await getDoc(historyRef);
        if (historyDoc.exists()) {
          const data = historyDoc.data();

          // Process movies
          const uniqueMovies = {};
          data.movies.forEach((movie) => {
            if (!uniqueMovies[movie.id] || new Date(movie.watchedAt) > new Date(uniqueMovies[movie.id].watchedAt)) {
              uniqueMovies[movie.id] = movie;
            }
          });
          const latestMovies = Object.values(uniqueMovies).sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));

          // Process episodes
          const uniqueEpisodes = {};
          data.episodes.forEach((episode) => {
            const episodeKey = `${episode.tvShowId}-${episode.seasonNumber}-${episode.episodeNumber}`;
            if (!uniqueEpisodes[episodeKey] || new Date(episode.watchedAt) > new Date(uniqueEpisodes[episodeKey].watchedAt)) {
              uniqueEpisodes[episodeKey] = episode;
            }
          });
          const latestEpisodes = Object.values(uniqueEpisodes).sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));

          setHistory({
            movies: latestMovies,
            episodes: latestEpisodes,
          });
        }
      }
      setLoading(false);
    };
    fetchHistory();
  }, [userId]);

  const clearHistory = async () => {
    if (userId) {
      const historyRef = doc(db, "history", userId);
      await updateDoc(historyRef, {
        movies: [],
        episodes: [],
      });
      setHistory({ movies: [], episodes: [] });
    }
  };

  const toggleShowEpisodes = (showId) => {
    setExpandedShows((prev) => ({
      ...prev,
      [showId]: !prev[showId],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <Mosaic color="#ff7f50" size="medium" text="" textColor="" />
      </div>
    );
  }

  const groupedEpisodes = history.episodes.reduce((acc, episode) => {
    if (!acc[episode.tvShowId]) {
      acc[episode.tvShowId] = {
        title: episode.tvShowTitle,
        episodes: [],
        poster_path: episode.poster_path,
      };
    }
    acc[episode.tvShowId].episodes.push(episode);
    return acc;
  }, {});

  return (
    <div className="text-secondary bg-primary min-h-screen">
      <Navbar />
      <main className="p-6 mt-24">
        <div className="flex align-middle justify-between">
          <h1 className="text-2xl font-bold mb-6">Watch History</h1>
          <button
            onClick={clearHistory}
            className="mb-6 bg-red-500 text-white py-2 px-4 rounded"
          >
            Clear History
          </button>
        </div>
        <div>
          <h2 className="text-xl font-bold mb-4">Movies</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {history.movies.map((movie) => (
              <div key={movie.id}>
                <MovieCard movie={movie} />
                <p className="text-xs mt-3 text-white">
                  Watched on: {new Date(movie.watchedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Episodes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">

          {Object.entries(groupedEpisodes).map(([showId, showData]) => (
            <div key={showId} className="mb-4">
              
                <MovieCard
                  key={showId}
                  movie={{
                    id: showId,
                    title: showData.title,
                    poster_path: showData.poster_path,
                    media_type: "tv",
                  }}
                />
                
              
            </div>
          ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default HistoryPage;