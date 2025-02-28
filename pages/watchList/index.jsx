import React, { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import MovieCard from "../../components/MinimalCard";
import Navbar from "../../components/Navbar"; // Assuming you have a Navbar component
import { Mosaic } from "react-loading-indicators"; // Import Mosaic

const WatchlistPage = () => {
  const [watchlistItems, setWatchlistItems] = useState(null); // Initialize to null for loading state
  const [filter, setFilter] = useState("all");
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchWatchlist = async () => {
      if (userId) {
        const watchlistRef = doc(db, "watchlists", userId);
        const watchlistDoc = await getDoc(watchlistRef);

        if (watchlistDoc.exists() && watchlistDoc.data().items) {
          setWatchlistItems(watchlistDoc.data().items);
        } else {
          setWatchlistItems([]); // Empty watchlist
        }
      } else{
        setWatchlistItems([]);
      }
    };

    fetchWatchlist();
  }, [userId]);

  const filteredItems = watchlistItems ? watchlistItems.filter((item) => {
    if (filter === "all") return true;
    return item.media_type === filter;
  }) : [];

  if (watchlistItems === null) {
    return (
      <div className="bg-secondary min-h-screen">
        <Navbar />
        <Mosaic color="#ff7f50" size="medium" text="" textColor="" />
      </div>
    );
  }

  return (
    <div className="bg-primary min-h-screen">
      <Navbar />
      <div className="p-4 mt-24">
        <h1 className="text-2xl font-bold mb-4 text-white">My Watchlist</h1>

        <div className="mb-4">
          <button
            className={`mx-1 p-2 rounded text-white ${filter === "all" ? "underline" : "opacity-70"}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={`mx-1 p-2 rounded text-white ${filter === "movie" ? "underline" : "opacity-70"}`}
            onClick={() => setFilter("movie")}
          >
            Movies
          </button>
          <button
            className={`mx-1 p-2 rounded text-white ${filter === "tv" ? "underline" : "opacity-70"}`}
            onClick={() => setFilter("tv")}
          >
            TV Shows
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredItems.map((item) => (
            <MovieCard key={item.id} movie={item} />
          ))}
        </div>
          {filteredItems.length === 0 && (<p className="text-white">Your watchlist is empty.</p>)}
      </div>
    </div>
  );
};

export default WatchlistPage;