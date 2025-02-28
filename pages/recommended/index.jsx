import React, { useEffect, useState } from "react";
import NavBar from "../../components/Navbar";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import { Mosaic } from "react-loading-indicators";
import MovieCard from "../../components/MinimalCard";

const RecommendedPage = () => {
  const [recommendations, setRecommendations] = useState({ movies: [], episodes: [] });
  const userId = auth.currentUser?.uid;
  const router = useRouter();
  const [userUsernames, setUserUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [usernamesLoading, setUsernamesLoading] = useState(true);
  const [expandedShows, setExpandedShows] = useState({});

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (userId) {
        const recommendationsRef = doc(db, "recommendations", userId);
        const recommendationsDoc = await getDoc(recommendationsRef);
        if (recommendationsDoc.exists()) {
          setRecommendations(recommendationsDoc.data());
        }
      }
      setLoading(false);
    };
    fetchRecommendations();
  }, [userId]);

  useEffect(() => {
    const fetchUsernames = async () => {
      if (recommendations?.movies || recommendations?.episodes) {
        const recommendedByUserIds = new Set([
          ...(recommendations.movies?.map((movie) => movie.recommendedBy) || []),
          ...(recommendations.episodes?.map((episode) => episode.recommendedBy) || []),
        ]);

        const usernamePromises = Array.from(recommendedByUserIds).map(async (recommendedByUserId) => {
          if (recommendedByUserId) {
            const userRef = doc(db, "users", recommendedByUserId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              return { userId: recommendedByUserId, username: userDoc.data().username };
            }
          }
          return null;
        });

        const usernames = (await Promise.all(usernamePromises)).filter(Boolean);
        const usernamesMap = {};
        usernames.forEach((user) => {
          usernamesMap[user.userId] = user.username;
        });
        setUserUsernames(usernamesMap);
      }
      setUsernamesLoading(false);
    };
    fetchUsernames();
  }, [recommendations]);

  const handleNavigate = (type, id) => {
    if (type === "movie") {
      router.push(`/watch?movie_id=${id}`);
    } else if (type === "tv") {
      router.push(`/watchTv?tv_id=${id}`);
    }
  };

  const toggleShowEpisodes = (showId) => {
    setExpandedShows((prev) => ({
      ...prev,
      [showId]: !prev[showId],
    }));
  };

  if (loading || usernamesLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <Mosaic color="#ff7f50" size="medium" text="" textColor="" />
      </div>
    );
  }

  // Check if recommendations.episodes exists before using reduce
  const groupedEpisodes = recommendations?.episodes?.reduce((acc, episode) => {
    if (!acc[episode.tvShowId]) {
      acc[episode.tvShowId] = {
        title: episode.tvShowTitle,
        episodes: [],
        poster_path: episode.poster_path,
        recommendedBy: episode.recommendedBy,
      };
    }
    acc[episode.tvShowId].episodes.push(episode);
    return acc;
  }, {}) || {}; // Default to an empty object if recommendations.episodes is undefined

  return (
    <div>
      <NavBar />
      <main className="p-6 mt-24 text-secondary">
        <h1 className="text-2xl font-bold mb-6">Recommended for You</h1>

        {/* Recommended Movies */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Recommended Movies</h2>
          {recommendations?.movies?.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {recommendations.movies.map((movie) => (
                <div
                  key={movie.id}
                  onClick={() => handleNavigate("movie", movie.id)}
                >
                  <MovieCard movie={movie} />
                  <p className="text-xs text-gray-400 mt-2">
                    Recommended by: {userUsernames[movie.recommendedBy] || movie.recommendedBy}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No recommended movies.</p>
          )}
        </div>

        {/* Recommended Episodes */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Recommended Episodes</h2>
          {recommendations?.episodes?.length > 0 ? (
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
                      onClick={() => handleNavigate("tv", showId)}
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
                    <p className="text-xs text-gray-400 mt-2">
                      Recommended by: {userUsernames[showData.recommendedBy] || showData.recommendedBy}
                    </p>
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
          ) : (
            <p className="text-gray-400">No recommended episodes.</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default RecommendedPage;