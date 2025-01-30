import { useRouter } from "next/router";
const EventCard = ({ movie }) => {
  const router = useRouter();

  const handleJoinWatchParty = () => {
    router.push(`/movie/${movie.id}/watch-party`);
  };

  return (
    <div
      className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w500${movie.poster_path})` }}
    >
      <div className="bg-black bg-opacity-60 p-10 max-w-4xl rounded-xl shadow-lg text-white text-left transition-transform transform hover:scale-105">
        <h1 className="text-5xl font-bold mb-2">{movie.title}</h1>
        <div className="flex items-center space-x-4 text-gray-300 text-lg">
          <span>{movie.vote_average}/10</span>
          <span>{movie.release_date}</span>
        </div>
        <p className="mt-4 text-gray-300 text-lg leading-relaxed">{movie.overview}</p>
        <button
          className="mt-6 px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-all flex items-center space-x-2"
          onClick={handleJoinWatchParty}
        >
          <span>🎬</span>
          <span>Join Watch Party</span>
        </button>
      </div>
    </div>
   
  );
};

export default EventCard;
