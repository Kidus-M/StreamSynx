import { useRouter } from "next/router";

/**
 * A card component to display movie information.
 * @param {Object} props - Component props.
 * @param {Object} props.movie - Movie data.
 * @param {string | number} props.movie.id - Movie ID.
 * @param {string} props.movie.title - Movie title.
 * @param {string} props.movie.posterUrl - URL of the movie poster.
 */
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
    <div className="flex max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden transform transition-transform hover:scale-105">
      {/* Movie Poster with Gradient Overlay */}
      <div className="relative w-1/2">
        <img
          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
          alt={`${movie.title} Poster`}
          className="w-full h-full object-cover rounded-l-xl"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-50 rounded-l-xl"></div>
      </div>

      {/* Movie Info */}
      <div className="p-6 flex flex-col justify-between w-2/3">
        <div>
          {/* Movie Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {movie.title}
          </h2>

          {/* Genre and Year */}
          
          <p className="text-gray-500 text-sm">{movie.release_date}</p>
        </div>

        {/* Rating with Star Icon */}
        <div className="flex items-center gap-1 mb-4">
          <span className="bg-white text-black text-sm font-bold px-2 py-1 rounded-full flex items-center gap-1">
            ⭐ {movie.vote_average}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
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
