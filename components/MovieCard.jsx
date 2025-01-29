import React from 'react';
import { useRouter } from 'next/router';
const MovieCard = ({ movie }) => {

  const router = useRouter();
    
    // Handlers for button navigation
    const handleCreateRoom = () => {
      router.push(`/movie/${user.id}/${movie.id}`);
    };
  
    const handleAloneWatch = () => {
      router.push(`/movie/${movie.id}`);
    };
  return (
    <div className="max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden transform transition-transform hover:scale-105">
      {/* Movie Poster with Gradient Overlay */}
      <div className="relative">
        <img 
          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
          alt={`${movie.title} Poster`} 
          className="w-full h-64 object-cover rounded-t-xl" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-50 rounded-t-xl"></div>
      </div>
      
      {/* Movie Info */}
      <div className="p-6">
        {/* Movie Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{movie.title}</h2>
        
        {/* Genre and Year */}
        {/* <p className="text-gray-500 text-sm mb-1">{movie.genre}</p> */}
          
        
        <p className="text-gray-500 text-sm mb-4">{movie.release_date} ⭐ <span>{movie.vote_average}</span> </p>
          
        
        {/* Description */}
        <p className="text-gray-700 text-sm mb-6">{movie.overview}</p>
        
        {/* Rating with Star Icon */}
        
        
        {/* Buttons */}
        <div className="flex gap-3">
          <button
            className="px-4 py-2 text-sm font-semibold rounded-full text-white bg-primary hover:bg-primary-dark transition-all transform hover:scale-105 w-full"
            onClick={handleCreateRoom}
          >
            Create a Room
          </button>
          <button
            className="px-4 py-2 text-sm font-semibold rounded-full border-2 border-secondary text-secondary hover:bg-secondary hover:text-white transition-all transform hover:scale-105 w-full"
            onClick={handleAloneWatch}
          >
            Alone Watch
          </button>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;