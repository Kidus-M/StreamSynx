import React, { useEffect, useState } from "react";
import NavBar from "../../components/Navbar";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import MovieCard from "../../components/MinimalCard";

// Custom hook to fetch favorites
const useFavorites = (userId) => {
  const [favorites, setFavorites] = useState({ movies: [], episodes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!userId) return;

      try {
        const favoritesRef = doc(db, "favorites", userId);
        const favoritesDoc = await getDoc(favoritesRef);

        if (favoritesDoc.exists()) {
          setFavorites(favoritesDoc.data());
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [userId]);

  return { favorites, loading, error };
};

// Component to display favorite movies
const FavoriteMovies = ({ movies }) => {
  if (movies.length === 0) return <p className="text-gray-400">No favorite movies found.</p>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  );
};

// Component to display favorite episodes
const FavoriteEpisodes = ({ episodes }) => {
  if (episodes.length === 0) return <p className="text-gray-400">No favorite episodes found.</p>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {episodes.map((episode) => (
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
  );
};

// Main FavoritesPage component
const FavoritesPage = () => {
  const userId = auth.currentUser?.uid;
  const { favorites, loading, error } = useFavorites(userId);

  if (loading) return <p className="text-white">Loading...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div>
      <NavBar />
      <main className="p-6 mt-24 text-secondary">
        <h1 className="text-2xl font-bold mb-6">Favorites</h1>

        <div>
          <h2 className="text-xl font-bold mb-4">Favorite Movies</h2>
          <FavoriteMovies movies={favorites.movies} />
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Favorite Episodes</h2>
          <FavoriteEpisodes episodes={favorites.episodes} />
        </div>
      </main>
    </div>
  );
};

export default FavoritesPage;