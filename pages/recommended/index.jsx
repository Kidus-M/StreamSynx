import React, { useEffect, useState } from "react";
import NavBar from "../../components/Navbar";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/router";

const RecommendedPage = () => {
  const [recommendations, setRecommendations] = useState({ movies: [], episodes: [] });
  const userId = auth.currentUser?.uid;
  const router = useRouter();
  const [userUsernames, setUserUsernames] = useState({}); // Store usernames by userId

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (userId) {
        const recommendationsRef = doc(db, "recommendations", userId);
        const recommendationsDoc = await getDoc(recommendationsRef);
        if (recommendationsDoc.exists()) {
          setRecommendations(recommendationsDoc.data());
        }
      }
    };
    fetchRecommendations();
  }, [userId]);

  // Fetch usernames
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
    };

    fetchUsernames();
  }, [recommendations]);

  const handleNavigate = (type, id) => {
    if (type === "movie") {
      router.push(`/watch?movie_id=${id}`);
    } else if (type === "episode") {
      router.push(`/watchTv?tv_id=${id}`);
    }
  };

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
                  className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => handleNavigate("movie", movie.id)}
                >
                  <img
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={movie.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <p className="mt-2 text-sm font-bold">{movie.title}</p>
                  <p className="text-xs text-gray-400">
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
              {recommendations.episodes.map((episode) => (
                <div
                  key={`${episode.tvShowId}-${episode.seasonNumber}-${episode.episodeNumber}`}
                  className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => handleNavigate("episode", episode.tvShowId)}
                >
                  <p className="text-sm font-bold">{episode.tvShowTitle}</p>
                  <p className="text-xs text-gray-400">
                    Season {episode.seasonNumber}, Episode {episode.episodeNumber}
                  </p>
                  <p className="text-xs text-gray-400">
                    Recommended by: {userUsernames[episode.recommendedBy] || episode.recommendedBy}
                  </p>
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