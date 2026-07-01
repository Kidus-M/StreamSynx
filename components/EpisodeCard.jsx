import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { FaPlay } from "react-icons/fa";
import { IoCheckmarkCircle } from "react-icons/io5";
import { FaLock, FaClock } from "react-icons/fa";
import { motion } from "framer-motion";

const EpisodeCard = ({
  episode,
  showId,
  seasonNumber,
  isSelected,
  onWatchClick,
  isAvailable = true,
  unavailableReason = "This episode is not available yet.",
  compact = false,
}) => {
  const router = useRouter();
  const [isWatched, setIsWatched] = useState(false);
  const [loading, setLoading] = useState(true);
  const userId = auth.currentUser?.uid;

  // Memoize checkIfWatched to prevent unnecessary re-renders
  const checkIfWatched = useCallback(async () => {
    if (!userId || !episode?.episode_number) {
      setLoading(false);
      return;
    }

    try {
      const historyRef = doc(db, "history", userId);
      const historyDoc = await getDoc(historyRef);
      if (historyDoc.exists()) {
        const watchedEpisodes = historyDoc.data().episodes || [];
        const numericShowId = Number(showId);
        const watched = watchedEpisodes.some((watchedEp) => {
          return (
              watchedEp.tvShowId === numericShowId &&
              watchedEp.seasonNumber === seasonNumber &&
              watchedEp.episodeNumber === episode.episode_number
          );
        });
        setIsWatched(watched);
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
    if (!isAvailable) {
      return;
    }

    if (onWatchClick) {
      onWatchClick();
      return;
    }

    router.push(`/watchTv/${showId}/${seasonNumber}/${episode.episode_number}`, undefined, { scroll: true });
  };

  if (!episode) {
    return null;
  }

  const imageUrl = episode.still_path
      ? `https://image.tmdb.org/t/p/w500${episode.still_path}`
      : "/placeholder-wide.jpg";

  // Compact mode for inline episode strip
  if (compact) {
    return (
      <motion.div
        onClick={handleClick}
        role="button"
        tabIndex={isAvailable ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        whileHover={isAvailable ? { scale: 1.03 } : {}}
        whileTap={isAvailable ? { scale: 0.98 } : {}}
        className={`
          tv-focusable group relative flex-shrink-0 w-48 md:w-56 rounded-xl overflow-hidden
          transition-all duration-200 ease-out
          ${isSelected
            ? "ring-2 ring-accent ring-offset-2 ring-offset-primary shadow-lg shadow-accent/20"
            : "hover:ring-1 hover:ring-white/20 focus:ring-2 focus:ring-accent"
          }
          ${isAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-50 grayscale-[0.3]"}
        `}
        title={
          isAvailable
            ? isWatched
              ? "Watched"
              : `Watch Episode ${episode.episode_number}`
            : unavailableReason
        }
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Play overlay on hover */}
          {isAvailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-9 h-9 rounded-full bg-accent/90 flex items-center justify-center shadow-lg">
                <FaPlay className="w-3 h-3 text-primary ml-0.5" />
              </div>
            </div>
          )}

          {/* Lock overlay for unavailable */}
          {!isAvailable && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="flex items-center gap-1.5 text-xs text-white/80 font-medium">
                <FaClock className="w-3 h-3 text-accent" />
                <span>Coming Soon</span>
              </div>
            </div>
          )}

          {/* Watched indicator */}
          {isWatched && !isSelected && !loading && (
            <div className="absolute top-1.5 right-1.5">
              <IoCheckmarkCircle className="w-4 h-4 text-accent drop-shadow-md" />
            </div>
          )}

          {/* Episode info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <p className="text-xs font-semibold text-white truncate">
              E{episode.episode_number} · {episode.name}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Full card mode (for modals)
  return (
      <motion.div
          onClick={handleClick}
          role="button"
          tabIndex={isAvailable ? 0 : -1}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            }
          }}
          whileHover={isAvailable ? { y: -2 } : {}}
          whileTap={isAvailable ? { scale: 0.98 } : {}}
          className={`
        tv-focusable group relative bg-secondary/80 rounded-xl shadow-md overflow-hidden
        border transition-all duration-200 ease-out
        ${isSelected ? "border-accent shadow-lg shadow-accent/15" : "border-white/[0.06] focus:border-accent"}
        ${isWatched && !isSelected ? "opacity-65 hover:opacity-100" : "opacity-100"}
        ${!isSelected && isAvailable ? "hover:border-white/[0.12]" : ""}
        ${isAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-50 grayscale-[0.25]"}
      `}
          title={
            isAvailable
              ? isWatched
                ? "Watched"
                : `Watch Episode ${episode.episode_number}`
              : unavailableReason
          }
      >
        <div className="relative aspect-video">
          <img
              src={imageUrl}
              alt={`Still from ${episode.name}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/placeholder-wide.jpg";
              }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          
          {/* Play button overlay */}
          {isAvailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-10 h-10 rounded-full bg-accent/90 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <FaPlay className="w-3.5 h-3.5 text-primary ml-0.5" />
              </div>
            </div>
          )}

          {/* Unavailable overlay */}
          {!isAvailable && (
              <div className="absolute inset-0 bg-black/65 flex items-center justify-center px-3 text-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <FaLock className="w-3 h-3 text-accent" />
                  </div>
                  <span className="text-xs text-white/80 font-medium">Not released yet</span>
                </div>
              </div>
          )}

          {/* Watched badge */}
          {isWatched && !isSelected && !loading && (
              <div className="absolute top-2 right-2" title="Watched">
                <IoCheckmarkCircle className="w-5 h-5 text-accent drop-shadow-md" />
              </div>
          )}

          {/* Currently playing indicator */}
          {isSelected && (
            <div className="absolute top-2 left-2">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent/90 text-primary text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Playing
              </span>
            </div>
          )}
        </div>
        <div className="p-3">
          <h4 className="text-sm font-semibold text-textprimary truncate" title={episode.name}>
            E{episode.episode_number}: {episode.name}
          </h4>
          <p className="text-xs text-textsecondary mt-1 line-clamp-2 leading-relaxed">
            {episode.overview || "No description available."}
          </p>
        </div>
      </motion.div>
  );
};

export default EpisodeCard;