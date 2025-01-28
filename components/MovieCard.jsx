import { useRouter } from 'next/router';

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
    <div className="flex max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden">
    {/* Movie Poster */}
    <img 
      src={movie.posterUrl} 
      alt={`${movie.title} Poster`} 
      className="w-1/3 object-cover rounded-l-xl" 
    />
    
    {/* Movie Info */}
    <div className="p-6 flex flex-col justify-between w-2/3">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{movie.title}</h2>
        <p className="text-gray-500 text-sm">{movie.genre}</p>
        <p className="text-black font-bold">{movie.year}</p>
      </div>
      
      {/* Rating */}
      <span className="bg-yellow-400 text-black text-sm font-bold px-2 py-1 rounded-full self-start">
        {movie.rating}
      </span>
      
      {/* Buttons */}
      <div className="flex gap-3 mt-4">
        <button
          className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-secondary hover:bg-orange-500 transition w-full"
          onClick={handleCreateRoom}
        >
          Create a Room
        </button>
        <button
          className="px-4 py-2 text-sm font-semibold rounded-lg border-2 border-secondary text-secondary hover:bg-secondary hover:text-white transition w-full"
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