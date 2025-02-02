import React from 'react';

const EventCard = ({ movie }) => {
  return (
    <div
      className="relative w-full mt-6 h-96 bg-cover bg-center flex items-end justify-start p-6 rounded-lg shadow-lg"
      style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w500${movie.poster_path})` }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg"></div>

      {/* Content */}
      <div className="relative z-10 text-white max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">{movie.title}</h1>
        <div className="flex space-x-4 mb-3">
          <span className="text-sm">{movie.release_date}</span>
          <span className="text-sm">Rating: {movie.vote_average}</span>
        </div>
        <p className="text-sm mb-4 line-clamp-3">{movie.overview}</p>
        <button className="px-5 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-secondary transition duration-300">
          Join Watch Party
        </button>
      </div>
    </div>
  );
};

export default EventCard;