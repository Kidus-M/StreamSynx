import React from "react";
import { useRouter } from "next/router";

const MovieCard = ({ movie }) => {
  const router = useRouter();

  const handleCreateRoom = () => {
    router.push(`/movie/${user.id}/${movie.id}`);
  };

  const handleAloneWatch = () => {
    router.push(`/movie/${movie.id}`);
  };

  return (
    <div className="relative w-full max-w-xs rounded-xl overflow-hidden transition-transform hover:scale-105 cursor-pointer group">
      {/* Movie Poster with Increased Height */}
      <img
        src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
        alt={`${movie.title} Poster`}
        className="w-full h-[500px] object-cover rounded-xl"
      />

      {/* Details Sliding Up */}
      <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-80 text-white p-4 
                      transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out">
        <h2 className="text-lg font-bold mb-1">{movie.title}</h2>
        <p className="text-sm">{movie.release_date} ⭐ {movie.vote_average}</p>
        <p className="text-xs mt-1 line-clamp-3">{movie.overview}</p>
        <div className="flex gap-3 mt-3">
          <button
            className="px-4 py-2 text-xs font-semibold rounded-full border-2 border-secondary text-secondary hover:bg-secondary hover:text-white transition-all w-full"
            onClick={handleCreateRoom}
          >
            Create a Room
          </button>
          <button
            className="px-4 py-2 text-xs font-semibold rounded-full border-2 border-secondary text-secondary hover:bg-secondary hover:text-white transition-all w-full"
            onClick={handleAloneWatch}
          >
            Alone Watch
          </button>
        </div>
      </div>

      {/* Title Always Visible, Moving Up on Hover */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 px-3 py-1 rounded text-white text-sm 
                      transition-transform duration-300 ease-in-out group-hover:hidden">
        {movie.title}
      </div>
    </div>
  );
};

export default MovieCard;
