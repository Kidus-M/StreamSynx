import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { FaPlay } from "react-icons/fa";
import { IoCheckmarkCircle } from "react-icons/io5";

const EpisodeCard = ({ episode, showId, seasonNumber, isSelected }) => {
  const router = useRouter();
  const [isWatched, setIsWatched] = useState(false);
  const [loading, setLoading] = useState(true);
  const userId = auth.currentUser?.uid;

  // Memoize checkIfWatched to prevent unnecessary re-renders
  const checkIfWatched = useCallback(async () => {
    if (!userId || !episode?.episode_number) {
      console.debug("No userId or episode_number, skipping check:", { userId, episodeNumber: episode?.episode_number });
      setLoading(false);
      return;
    }

    try {
      const historyRef = doc(db, "history", userId);
      const historyDoc = await getDoc(historyRef);
      if (historyDoc.exists()) {
        const watchedEpisodes = historyDoc.data().episodes || [];
        const numericShowId = Number(showId); // Coerce showId to number
        const watched = watchedEpisodes.some((watchedEp) => {
          const match =
              watchedEp.tvShowId === numericShowId &&
              watchedEp.seasonNumber === seasonNumber &&
              watchedEp.episodeNumber === episode.episode_number;
          console.debug("Checking episode:", {
            tvShowId: watchedEp.tvShowId,
            seasonNumber: watchedEp.seasonNumber,
            episodeNumber: watchedEp.episodeNumber,
            inputShowId: numericShowId,
            matches: match,
          });
          return match;
        });
        setIsWatched(watched);
      } else {
        console.debug("No history document found for user:", userId);
      }
    } catch (error) {
      console.error("Error checking watch history:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, episode?.episode_number, showId, seasonNumber]);

  useEffect(() => {
    setLoading(true);
    setIsWatched(false);
    checkIfWatched();
  }, [checkIfWatched]);

  // Handle click to navigate to the episode route
  const handleClick = () => {
    router.push(`/watchTv/${showId}/${seasonNumber}/${episode.episode_number}`, undefined, { scroll: true });
  };

  if (!episode) {
    return null;
  }

  const imageUrl = episode.still_path
      ? `https://image.tmdb.org/t/p/w500${episode.still_path}`
      : "/placeholder-wide.jpg";

  return (
      <div
          onClick={handleClick}
          className={`
        group relative bg-secondary rounded-lg shadow overflow-hidden cursor-pointer
        border-2 transition-all duration-200 ease-in-out
        ${isSelected ? "border-accent shadow-lg shadow-accent/20" : "border-transparent"}
        ${isWatched && !isSelected ? "opacity-60 hover:opacity-100" : "opacity-100"}
        ${!isSelected ? "hover:border-accent/50" : ""}
      `}
          title={isWatched ? "Watched" : `Watch Episode ${episode.episode_number}`}
      >
        <div className="relative aspect-video">
          <img
              src={imageUrl}
              alt={`Still from ${episode.name}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/placeholder-wide.jpg";
              }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
          <div className="absolute inset-0 flex items-center justify-center
                      bg-black/50 opacity-0 group-hover:opacity-100
                      transition-opacity duration-200">
            <FaPlay className="w-6 h-6 text-white" />
          </div>
          {isWatched && !isSelected && !loading && (
              <div className="absolute top-1.5 right-1.5" title="Watched">
                <IoCheckmarkCircle className="w-5 h-5 text-accent bg-secondary rounded-full" />
              </div>
          )}
        </div>
        <div className="p-3">
          <h4 className="text-sm font-semibold text-textprimary truncate" title={episode.name}>
            E{episode.episode_number}: {episode.name}
          </h4>
          <p className="text-xs text-textsecondary mt-1 line-clamp-2">
            {episode.overview || "No description available."}
          </p>
        </div>
      </div>
  );
};

export default EpisodeCard;