// components/RoomEpisodeCard.jsx
import React from 'react';
import { FaPlay, FaEye, FaStar } from 'react-icons/fa';

// Define image base URL locally or import from a config file
const IMAGE_BASE_URL_W500 = 'https://image.tmdb.org/t/p/w500';
const PLACEHOLDER_IMAGE_URL = '/placeholder-wide.jpg'; // Ensure this exists in /public

// Removed unused theme prop
const EpisodeCard = ({ episode, isSelected, onWatchClick }) => {
    // Basic placeholder if no image or episode data
    const episodeName = episode?.name || 'Untitled Episode';
    const imageUrl = episode?.still_path
        ? `${IMAGE_BASE_URL_W500}${episode.still_path}`
        : PLACEHOLDER_IMAGE_URL;
    const imageAlt = episode?.still_path
        ? `Still from ${episodeName}`
        : 'Placeholder image for episode still'; // Improved placeholder alt text

    return (
        // Added group class here if needed for other potential group-hover effects, but not strictly necessary for the button fix below
        <div className={`group bg-primary rounded-lg shadow overflow-hidden transition-all duration-200 border-2 ${isSelected ? 'border-accent' : 'border-secondary-light/50 hover:border-secondary-light'}`}>
            <div className="relative">
                <img src={imageUrl} alt={imageAlt} className="w-full h-24 object-cover" /> {/* Removed opacity for clearer image */}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

                {/* Play Button - Simplified visibility/hover */}
                <button
                    onClick={onWatchClick}
                    // Always visible, changes background/scale on hover
                    className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-2 rounded-full transition-all duration-200 text-primary 
                        ${isSelected
                            ? 'bg-accent/90 scale-100' // Slightly different style when selected
                            : 'bg-black/60 scale-90 opacity-70 hover:opacity-100 hover:scale-100 hover:bg-accent/80' // Default state + hover effect
                        }`}
                    title={`Watch Episode ${episode?.episode_number || '?'}`}
                    aria-label={`Watch Episode ${episode?.episode_number || '?'}: ${episodeName}`} // Accessibility
                >
                    <FaPlay className="w-4 h-4" />
                </button>

                {/* Selected Indicator */}
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
                <p className="text-xs text-textsecondary mt-0.5 line-clamp-2 h-8"> {/* Set fixed height for overview */}
                    {episode?.overview || 'No description available.'}
                </p>
                <div className="flex justify-between items-center mt-1 text-xs text-textsecondary">
                    {/* Added check for air_date */}
                    <span>{episode?.air_date || 'No date'}</span>
                    {/* Added check for vote_average */}
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