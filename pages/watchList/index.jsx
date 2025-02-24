import React, { useEffect, useState } from "react";
import NavBar from "../../components/Navbar";
import { FaGripLinesVertical } from "react-icons/fa";
import MovieCard from "../../components/MinimalCard";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { Mosaic } from "react-loading-indicators";

const Watchlist = () => {
  const [watchlistMovies, setWatchlistMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchWatchlist = async () => {
      if (userId) {
        const watchlistRef = doc(db, "watchlists", userId);
        const watchlistDoc = await getDoc(watchlistRef);
        if (watchlistDoc.exists()) {
          setWatchlistMovies(watchlistDoc.data().movies || []);
        }
      }
      setLoading(false);
    };
    fetchWatchlist();
  }, [userId]);

  const filteredMovies = () => {
    if (filter === "all") {
      return watchlistMovies;
    } else if (filter === "movies") {
      return watchlistMovies.filter((movie) => movie.media_type === "movie");
    } else if (filter === "tv") {
      return watchlistMovies.filter((movie) => movie.media_type === "tv");
    }
    return [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <Mosaic color="#ff7f50" size="medium" text="" textColor="" />
      </div>
    );
  }

  return (
    <div>
      <NavBar />
      <main>
        <section className="w-full text-secondary mt-24">
          <div className="px-6 my-6 flex flex-col items-start">
            <div className="flex justify-between items-center w-full mb-4">
              <p className="flex justify-between items-center text-lg gap-4">
                <FaGripLinesVertical className="text-2xl" />
                Your Watchlist
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                className={`px-4 py-2 rounded-md ${
                  filter === "all" ? "bg-secondary text-white" : "bg-gray-700 text-gray-300"
                }`}
                onClick={() => setFilter("all")}
              >
                All
              </button>
              <button
                className={`px-4 py-2 rounded-md ${
                  filter === "movies" ? "bg-secondary text-white" : "bg-gray-700 text-gray-300"
                }`}
                onClick={() => setFilter("movies")}
              >
                Movies
              </button>
              <button
                className={`px-4 py-2 rounded-md ${
                  filter === "tv" ? "bg-secondary text-white" : "bg-gray-700 text-gray-300"
                }`}
                onClick={() => setFilter("tv")}
              >
                TV Shows
              </button>
            </div>
          </div>
          {filteredMovies().length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6">
              {filteredMovies().map((mov) => (
                <MovieCard key={mov.id} movie={mov} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">
              Your watchlist is empty or no items match your filter.
            </p>
          )}
        </section>
      </main>
    </div>
  );
};

export default Watchlist;