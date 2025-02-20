import React, { useEffect, useState } from "react";
import NavBar from "../../components/Navbar";
import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const HistoryPage = () => {
  const [history, setHistory] = useState({ movies: [], episodes: [] });
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchHistory = async () => {
      if (userId) {
        const historyRef = doc(db, "history", userId);
        const historyDoc = await getDoc(historyRef);
        if (historyDoc.exists()) {
          setHistory(historyDoc.data());
        }
      }
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

  return (
    <div>
      <NavBar />
      <main className="p-6">
        <h1 className="text-2xl font-bold mb-6">Watch History</h1>
        <button
          onClick={clearHistory}
          className="mb-6 bg-red-500 text-white py-2 px-4 rounded"
        >
          Clear History
        </button>
        <div>
          <h2 className="text-xl font-bold mb-4">Movies</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {history.movies.map((movie) => (
              <div key={movie.id} className="bg-gray-800 p-4 rounded-lg">
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
                <p className="mt-2 text-sm font-bold">{movie.title}</p>
                <p className="text-xs text-gray-400">
                  Watched on: {new Date(movie.watchedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Episodes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {history.episodes.map((episode) => (
              <div key={`${episode.tvShowId}-${episode.seasonNumber}-${episode.episodeNumber}`} className="bg-gray-800 p-4 rounded-lg">
                <p className="text-sm font-bold">{episode.tvShowTitle}</p>
                <p className="text-xs text-gray-400">
                  Season {episode.seasonNumber}, Episode {episode.episodeNumber}
                </p>
                <p className="text-xs text-gray-400">
                  Watched on: {new Date(episode.watchedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default HistoryPage;