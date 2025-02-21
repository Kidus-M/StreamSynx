import React, { useEffect, useState } from "react";
import NavBar from "../../components/Navbar";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import MovieCard from "../../components/MinimalCard";
const FavoritesPage = () => {
  const [favorites, setFavorites] = useState({ movies: [], episodes: [] });
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchFavorites = async () => {
      if (userId) {
        const favoritesRef = doc(db, "favorites", userId);
        const favoritesDoc = await getDoc(favoritesRef);
        if (favoritesDoc.exists()) {
          setFavorites(favoritesDoc.data());
        }
      }
    };
    fetchFavorites();
  }, [userId]);

  return (
    <div>
      <NavBar />
      <main className="p-6">
        <h1 className="text-2xl font-bold mb-6">Favorites</h1>
        <div>
          <h2 className="text-xl font-bold mb-4">Favorite Movies</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {favorites.movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </div>
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Favorite Episodes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {favorites.episodes.map((episode) => (
              <div
                key={`${episode.tvShowId}-${episode.seasonNumber}-${episode.episodeNumber}`}
                className="bg-gray-800 p-4 rounded-lg"
              >
                <p className="text-sm font-bold">{episode.tvShowTitle}</p>
                <p className="text-xs text-gray-400">
                  Season {episode.seasonNumber}, Episode {episode.episodeNumber}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FavoritesPage;