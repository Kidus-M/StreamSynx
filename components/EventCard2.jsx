import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import axios from 'axios';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

const EventCard = ({ movie }) => {
  const [cast, setCast] = useState([]);
  const [trailerKey, setTrailerKey] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!movie || !movie.id) return;

    const fetchAdditionalDetails = async () => {
      try {
        if (!API_KEY) throw new Error("API Key is missing");

        console.log("Fetching cast and trailer for movie ID:", movie.id);

        // Fetch cast
        const castResponse = await axios.get(`${BASE_URL}/movie/${movie.id}/credits`, {
          params: { api_key: API_KEY, language: 'en-US' },
        });
        setCast(castResponse.data.cast.slice(0, 5)); // Get top 5 cast members

        // Fetch trailer
        const trailerResponse = await axios.get(`${BASE_URL}/movie/${movie.id}/videos`, {
          params: { api_key: API_KEY, language: 'en-US' },
        });
        const trailer = trailerResponse.data.results.find(
          (vid) => vid.type === 'Trailer' && vid.site === 'YouTube'
        );
        setTrailerKey(trailer ? trailer.key : '');
      } catch (error) {
        console.error('Error fetching additional movie data:', error);
      }
    };

    fetchAdditionalDetails();
  }, [movie]);

  if (!movie) {
    return <div className="text-white text-center mt-10">Loading...</div>;
  }

  return (
    <div
      className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-70"></div>
      <motion.div
        className="relative z-10 bg-black bg-opacity-60 p-10 max-w-4xl rounded-xl shadow-lg text-white text-left"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-5xl font-bold mb-2">{movie.title}</h1>
        <div className="flex items-center space-x-4 text-gray-300 text-lg">
          <span>{new Date(movie.release_date).toLocaleDateString()}</span>
          <span>Rating: {movie.vote_average}/10</span>
          <span>Runtime: {movie.runtime} mins</span>
        </div>

        {/* ✅ FIX: Safely map over genres */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(movie.genres || []).map((genre) => (
            <span
              key={genre.id}
              className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm"
            >
              {genre.name}
            </span>
          ))}
        </div>

        <p className="mt-4 text-gray-300 text-lg leading-relaxed">
          {movie.overview}
        </p>
        <div className="mt-4">
          <h2 className="text-2xl font-semibold">Cast:</h2>
          <ul className="mt-2 space-y-1">
            {cast.map((member) => (
              <li key={member.cast_id}>
                {member.name} as {member.character}
              </li>
            ))}
          </ul>
        </div>
        {trailerKey && (
          <div className="mt-6">
            <h2 className="text-2xl font-semibold mb-2">Trailer:</h2>
            <div className="relative" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${trailerKey}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}
        <motion.button
          className="mt-6 px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-all"
          onClick={() => router.push(`/movie/${movie.id}/watch-party`)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Join Watch Party
        </motion.button>
      </motion.div>
    </div>
  );
};

export default EventCard;
