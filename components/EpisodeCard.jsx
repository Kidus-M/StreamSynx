import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { CheckCircleIcon } from "@heroicons/react/20/solid"; // Correct for v2
const EpisodeCard = ({ episode, onWatchClick, tvShowId, seasonNumber }) => {
  const [isWatched, setIsWatched] = useState(false);

  useEffect(() => {
    const checkIfWatched = async () => {
      if (auth.currentUser) {
        const historyRef = doc(db, "history", auth.currentUser.uid);
        const historyDoc = await getDoc(historyRef);
        if (historyDoc.exists()) {
          const watchedEpisodes = historyDoc.data().episodes || [];
          setIsWatched(
            watchedEpisodes.some(
              (watchedEpisode) =>
                watchedEpisode.tvShowId === tvShowId &&
                watchedEpisode.seasonNumber === seasonNumber &&
                watchedEpisode.episodeNumber === episode.episode_number
            )
          );
        }
      }
    };
    checkIfWatched();
  }, [episode, tvShowId, seasonNumber]); // Add tvShowId and seasonNumber to dependency array

  if (!episode) {
    return null;
  }

  return (
    <div
      className={`relative bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105 hover:shadow-lg ${
        isWatched ? "ring-2 ring-green-500" : ""
      }`}
      onClick={() => onWatchClick(episode.episode_number)}
    >
      <div className="relative aspect-w-16 aspect-h-9">
        <img
          src={
            episode.still_path
              ? `https://image.tmdb.org/t/p/w500${episode.still_path}`
              : "/placeholder.jpg"
          }
          alt={`Episode ${episode.episode_number}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/placeholder.jpg";
          }}
        />
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
        <h3 className="text-sm font-semibold text-white">
          Episode {episode.episode_number}
        </h3>
        <p className="text-xs text-gray-300 mt-1 line-clamp-2">
          {episode.name}
        </p>
      </div>

      {isWatched && (
        <div className="absolute top-2 right-2">
          <CheckCircleIcon
            className="w-6 h-6 text-green-500"
            aria-hidden="true"
          />{" "}
        </div>
      )}
    </div>
  );
};

export default EpisodeCard;
