import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import axios from 'axios';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const EventCard = ({ movie }) => {
  const [cast, setCast] = useState([]);
  const [trailerKey, setTrailerKey] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!movie || !movie.id) return;

    const fetchAdditionalDetails = async () => {
      try {
        if (!API_KEY) throw new Error('API Key is missing');

        const [castResponse, trailerResponse] = await Promise.all([
          axios.get(`${BASE_URL}/movie/${movie.id}/credits`, {
            params: { api_key: API_KEY, language: 'en-US' },
          }),
          axios.get(`${BASE_URL}/movie/${movie.id}/videos`, {
            params: { api_key: API_KEY, language: 'en-US' },
          }),
        ]);

        setCast(castResponse.data.cast.slice(0, 5));

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
      className="relative w-full h-[calc(100vh-80px)] mt-6 flex items-stretch bg-cover bg-center rounded-xl overflow-hidden"
      style={{
        backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-70"></div>
      
      {/* Main Content Container */}
      <motion.div
        className="relative z-10 bg-black bg-opacity-60 p-10 flex w-full h-full rounded-lg shadow-lg text-white"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Left Section - Movie Info */}
        <div className="flex-1 pr-8 flex flex-col justify-center">
          <h1 className="text-5xl font-bold mb-4">{movie.title}</h1>
          <div className="flex items-center space-x-6 text-gray-300 text-lg">
            <span>{new Date(movie.release_date).toLocaleDateString()}</span>
            <span>⭐ {movie.vote_average}/10</span>
            <span>⏳ {movie.runtime} mins</span>
          </div>

          {/* Genres */}
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

          {/* Movie Description */}
          <p className="my-6 text-gray-300 text-lg leading-relaxed">
            {movie.overview}
          </p>
          {/* Cast Section with Images */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-3">Top Cast:</h2>
            <div className="flex space-x-4 overflow-x-auto">
              {cast.map((member) => (
                <div key={member.cast_id} className="flex-shrink-0 w-24 text-center">
                  <img
                    src={
                      member.profile_path
                        ? `${IMAGE_BASE_URL}${member.profile_path}`
                        : '/placeholder.jpg'
                    }
                    alt={member.name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-700"
                  />
                  <p className="text-sm mt-2">{member.name}</p>
                  <p className="text-xs text-gray-400">{member.character}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Watch Party Button */}
          <motion.button
            className="mt-6 px-8 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-all"
            onClick={() => router.push(`/movie/${movie.id}/watch-party`)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🎬 Join Watch Party
          </motion.button>
        </div>

        {/* Right Section - Cast & Trailer */}
        <div className="flex-1 flex flex-col">
          {/* Cast Section with Images */}
          

          {/* Trailer Section */}
          {trailerKey && (
            <div>
              <h2 className="text-2xl font-semibold mt-20 mb-16">Official Trailer:</h2>
              <div className="relative w-full h-96">
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
        </div>
      </motion.div>
    </div>
  );
};

export default EventCard;
