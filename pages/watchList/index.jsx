import React, { useEffect, useState } from "react";
import NavBar from "../../components/Navbar";
import { FaGripLinesVertical } from "react-icons/fa";
import MovieCard from "../../components/MinimalCard";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import {Mosaic} from "react-loading-indicators";

const Watchlist = () => {
  const [watchlistMovies, setWatchlistMovies] = useState([]);
  const [loading, setLoading] = useState(true); // Add loading state
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
      setLoading(false); // Set loading to false after fetching
    };
    fetchWatchlist();
  }, [userId]);

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
          <div className="px-6 my-6 flex justify-between items-center">
            <p className="flex justify-between items-center text-lg gap-4">
              <FaGripLinesVertical className="text-2xl" />
              Your Watchlist
            </p>
          </div>
          {watchlistMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6">
              {watchlistMovies.map((mov) => (
                <MovieCard key={mov.id} movie={mov} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">Your watchlist is empty.</p>
          )}
        </section>
      </main>
    </div>
  );
};

export default Watchlist;