import React, { useEffect, useState } from "react";
import NavBar from "../../components/Navbar";
import { FaGripLinesVertical } from "react-icons/fa";
import MovieCard from "../../components/MinimalCard";
import { auth, db } from "../../firebase"; // Import Firebase
import { doc, getDoc } from "firebase/firestore";

const Watchlist = () => {
  const [watchlistMovies, setWatchlistMovies] = useState([]);
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
    };
    fetchWatchlist();
  }, [userId]);

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