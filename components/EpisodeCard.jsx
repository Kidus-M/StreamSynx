import React from "react";

const EpisodeCard = ({ episode, onWatchClick }) => {
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <img
        src={
          episode.still_path
            ? `https://image.tmdb.org/t/p/w300${episode.still_path}`
            : "/placeholder.jpg" // Fallback image if no still_path
        }
        alt={episode.name}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="text-lg font-semibold truncate">{episode.name}</h3>
        <p className="text-sm text-gray-300 mt-1">
          Episode {episode.episode_number}
        </p>
        <p className="text-sm text-gray-300 mt-2">{episode.air_date}</p>
        <p className="text-sm text-gray-300 mt-2 truncate">{episode.overview}</p>
        <button
          onClick={() => onWatchClick(episode.episode_number)}
          className="mt-2 w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all"
        >
          Watch
        </button>
      </div>
    </div>
  );
};

export default EpisodeCard;