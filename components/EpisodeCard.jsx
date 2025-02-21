import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const EpisodeCard = ({ episode, onWatchClick }) => {
  const [isWatched, setIsWatched] = useState(false);

  useEffect(() => {
    const checkIfWatched = async () => {
      if (auth.currentUser) {
        const historyRef = doc(db, "history", auth.currentUser.uid);
        const historyDoc = await getDoc(historyRef);
        if (historyDoc.exists()) {
          const episodes = historyDoc.data().episodes || [];
          setIsWatched(
            episodes.some(
              (e) =>
                e.tvShowId === episode.tvShowId &&
                e.seasonNumber === episode.seasonNumber &&
                e.episodeNumber === episode.episodeNumber
            )
          );
        }
      }
    };
    checkIfWatched();
  }, [episode]);

  return (
    <div
      className={`relative bg-primary border rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-transform duration-300 hover:scale-105 hover:shadow-xl ${
        isWatched ? "border-green-500" : ""
      }`}
      onClick={() => onWatchClick(episode.episode_number)}
    >
      {/* Background Image */}
      <div
        className="w-full h-56 bg-cover bg-center rounded-t-lg"
        style={{
          backgroundImage: `url(${
            episode.still_path
              ? `https://image.tmdb.org/t/p/w500${episode.still_path}`
              : "/placeholder.jpg"
          })`,
        }}
      ></div>

      {/* Content Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg"></div>

      {/* Episode Details */}
      <div className="absolute bg-primary bg-opacity-50 bottom-0 left-0 right-0 p-4">
        <h3 className="text-secondary text-sm font-bold uppercase tracking-wide">
          Episode {episode.episode_number}
        </h3>
        <p className="text-white text-xs font-semibold mt-1">{episode.name}</p>
      </div>
    </div>
  );
};

export default EpisodeCard;