import React, { useEffect, useState } from "react";
import NavBar from "../../components/NavBar";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import MovieCard from "../../components/MinimalCard";
import { Mosaic } from "react-loading-indicators";
import { useRouter } from "next/router";

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

// Main FavoritesPage component
const FavoritesPage = () => {
  const userId = auth.currentUser?.uid;
  const { favorites, loading, error } = useFavorites(userId);
  const router = useRouter();
  const [expandedShows, setExpandedShows] = useState({});

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <Mosaic color="#ff7f50" size="medium" text="" textColor="" />
      </div>
    );
  }

  if (error) return <p className="text-red-500">Error: {error}</p>;

  const handleCardClick = (movie) => {
    if (movie.media_type === "tv") {
      router.push(`/watchTv?tv_id=${movie.id}`);
    } else {
      router.push(`/watch?movie_id=${movie.id}`);
    }
  };

  const toggleShowEpisodes = (showId) => {
    setExpandedShows((prev) => ({
      ...prev,
      [showId]: !prev[showId],
    }));
  };

  const groupedEpisodes = favorites.episodes.reduce((acc, episode) => {
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
    <div>
      <NavBar />
      <main className="p-6 mt-24 text-secondary">
        <h1 className="text-2xl font-bold mb-6">Favorites</h1>

        <div>
          <h2 className="text-xl font-bold mb-4">Favorite Movies</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {favorites.movies.map((movie) => (
              <div key={movie.id} onClick={() => handleCardClick(movie)}>
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Favorite Episodes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {Object.entries(groupedEpisodes).map(([showId, showData]) => (
              <div key={showId} className="mb-4">
                <div className="relative">
                  <MovieCard
                    movie={{
                      id: showId,
                      title: showData.title,
                      poster_path: showData.poster_path,
                      media_type: "tv",
                    }}
                    onClick={() => handleCardClick({ id: showId, media_type: "tv" })}
                  />
                  <button
                    className="absolute bottom-0 left-0 w-full text-left py-2 px-4 bg-gray-800 rounded-b-xl mt-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleShowEpisodes(showId);
                    }}
                  >
                    {expandedShows[showId] ? "Collapse Episodes" : "Expand Episodes"}
                  </button>
                </div>
                {expandedShows[showId] && (
                  <div className="mt-2">
                    {showData.episodes.map((episode) => (
                      <p
                        key={`${episode.tvShowId}-${episode.seasonNumber}-${episode.episodeNumber}`}
                        className="text-xs text-white p-2"
                      >
                        {`S${episode.seasonNumber}E${episode.episodeNumber}`}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FavoritesPage;