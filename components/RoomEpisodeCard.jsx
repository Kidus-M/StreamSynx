// components/RoomEpisodeCard.jsx
import React from 'react';
import { FaPlay, FaEye, FaStar } from 'react-icons/fa';

const IMAGE_BASE_URL_W500 = 'https://image.tmdb.org/t/p/w500';
const PLACEHOLDER_IMAGE_URL = '/placeholder-wide.jpg';

const EpisodeCard = ({ episode, isSelected, onWatchClick }) => {
    const episodeName = episode?.name || 'Untitled Episode';
    const imageUrl = episode?.still_path
        ? `${IMAGE_BASE_URL_W500}${episode.still_path}`
        : PLACEHOLDER_IMAGE_URL;
    const imageAlt = episode?.still_path
        ? `Still from ${episodeName}`
        : 'Placeholder image for episode still';

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onWatchClick?.();
        }
    };

    return (
        <div
            className={`tv-focusable group bg-primary rounded-lg shadow overflow-hidden transition-all duration-200 border-2 cursor-pointer ${isSelected ? 'border-accent' : 'border-secondary-light/50 hover:border-secondary-light focus:border-accent'}`}
            onClick={onWatchClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            title={`Watch Episode ${episode?.episode_number || '?'}: ${episodeName}`}
            aria-label={`Watch Episode ${episode?.episode_number || '?'}: ${episodeName}`}
        >
            <div className="relative">
                <img src={imageUrl} alt={imageAlt} className="w-full h-24 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onWatchClick?.();
                    }}
                    className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-2 rounded-full transition-all duration-200 text-primary 
                        ${isSelected
                            ? 'bg-accent/90 scale-100'
                            : 'bg-black/60 scale-90 opacity-70 group-focus:opacity-100 group-focus:scale-100 group-focus:bg-accent/80 hover:opacity-100 hover:scale-100 hover:bg-accent/80'
                        }`}
                    title={`Watch Episode ${episode?.episode_number || '?'}`}
                    aria-label={`Watch Episode ${episode?.episode_number || '?'}: ${episodeName}`}
                    tabIndex={-1}
                >
                    <FaPlay className="w-4 h-4" />
                </button>

                {isSelected && (
                    <div className="absolute top-1 right-1 p-1 bg-accent text-primary rounded-full text-xs shadow-md" title="Currently selected">
                        <FaEye className="w-3 h-3"/>
                    </div>
                )}
            </div>
            <div className="p-2">
                <h4 className="text-xs font-semibold text-textprimary truncate" title={episodeName}>
                    E{episode?.episode_number || '?'}: {episodeName}
                </h4>
                <p className="text-xs text-textsecondary mt-0.5 line-clamp-2 h-8">
                    {episode?.overview || 'No description available.'}
                </p>
                <div className="flex justify-between items-center mt-1 text-xs text-textsecondary">
                    <span>{episode?.air_date || 'No date'}</span>
                    {(episode?.vote_average ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5 text-accent">
                            <FaStar className="text-xs"/> {episode.vote_average.toFixed(1)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EpisodeCard;