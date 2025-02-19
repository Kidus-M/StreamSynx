import React, { useState } from "react";
import { useRouter } from "next/router";
import { Plus, Check } from "lucide-react";

const genreMap = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western"
};

const MovieCard = ({ movie }) => {
  const router = useRouter();
  const [isAdded, setIsAdded] = useState(false);

  const handleWatch = () => {
    const url = `/watch?movie_id=${movie.id}`;
      
    router.push(url);
  };

  const toggleWatchlist = (e) => {
    e.stopPropagation(); // Prevent card click when pressing the button
    setIsAdded((prev) => !prev);
  };

  const genres = movie.genre_ids?.length > 0 
    ? movie.genre_ids.map(id => genreMap[id] || "Unknown").join(", ") 
    : "Unknown Genre";

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden transition-transform hover:scale-105 cursor-pointer"
      onClick={handleWatch}
    >
      {/* Movie Poster */}
      <img
        src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
        alt={`${movie.title} Poster`}
        className="w-full h-[400px] object-cover rounded-xl"
      />

      {/* Bottom Details */}
      <div className="absolute bottom-0 left-0 w-full bg-primary bg-opacity-60 text-white p-3 flex justify-between items-center rounded-md">
        <div>
          <h2 className="text-sm font-bold">{movie.title}</h2>
          <p className="text-xs opacity-80">⭐ {movie.vote_average} | {genres}</p>
        </div>
        <button
          className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-40"
          onClick={toggleWatchlist}
        >
          {isAdded ? <Check size={18} /> : <Plus size={18} />}
        </button>
      </div>
    </div>
  );
};

export default MovieCard;
