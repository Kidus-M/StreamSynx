import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';
const SMALL_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w200';

const TrendingMovies = () => {
    const [trendingMovies, setTrendingMovies] = useState([]);
    const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [movieDetails, setMovieDetails] = useState(null);

    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const response = await axios.get(`${BASE_URL}/trending/movie/day`, {
                    params: { api_key: API_KEY },
                });
                setTrendingMovies(response.data.results);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching trending movies:', error);
                setLoading(false);
            }
        };

        fetchTrending();

        const intervalId = setInterval(() => {
            setCurrentMovieIndex((prevIndex) => (prevIndex + 1) % (trendingMovies.length || 1));
        }, 7000);

        return () => clearInterval(intervalId);
    }, [trendingMovies.length]);

    useEffect(() => {
        if (trendingMovies.length > 0) {
            const currentMovie = trendingMovies[currentMovieIndex];
            const fetchMovieDetails = async () => {
                try {
                    const response = await axios.get(`${BASE_URL}/movie/${currentMovie.id}`, {
                        params: { api_key: API_KEY, append_to_response: 'credits,genres' },
                    });
                    setMovieDetails(response.data);
                } catch (error) {
                    console.error('Error fetching movie details:', error);
                    setMovieDetails(null);
                }
            };
            fetchMovieDetails();
        }
    }, [trendingMovies, currentMovieIndex]);

    const handleWatch = (movie) => {
        router.push(`/watch?movie_id=${movie.id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (trendingMovies.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <p>No trending movies found.</p>
            </div>
        );
    }

    const currentMovie = trendingMovies[currentMovieIndex];

    return (
        <div className="relative w-full h-screen overflow-hidden">
            <AnimatePresence initial={false} custom={currentMovieIndex}>
                <motion.div
                    key={currentMovie.id}
                    custom={currentMovieIndex}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: `url(${IMAGE_BASE_URL}${currentMovie.backdrop_path})`,
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-80"></div>
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                        {movieDetails && (
                            <motion.div
                                initial={{ opacity: 0, y: 80 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.6, ease: "easeInOut" }}
                                className="text-center text-white max-w-3xl"
                            >
                                <h2 className="text-5xl font-extrabold mb-4 tracking-tight leading-tight">
                                    {movieDetails.title}
                                </h2>
                                <div className="flex justify-center mb-4 space-x-4">
                                    {movieDetails.genres.map((genre) => (
                                        <span key={genre.id} className="bg-gray-800 px-3 py-1 rounded-full text-sm">
                                            {genre.name}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xl mb-6 text-gray-300 leading-relaxed">
                                    {movieDetails.overview}
                                </p>
                                <div className="flex justify-center mb-6 space-x-4 overflow-x-auto">
                                    {movieDetails.credits.cast.slice(0, 5).map((actor) => (
                                        <div key={actor.cast_id} className="text-center flex-shrink-0">
                                            <img
                                                src={actor.profile_path ? `${SMALL_IMAGE_BASE_URL}${actor.profile_path}` : "/placeholder.jpg"}
                                                alt={actor.name}
                                                className="w-24 h-24 rounded-full object-cover mb-2"
                                            />
                                            <p className="text-sm">{actor.name}</p>
                                        </div>
                                    ))}
                                </div>
                                <motion.button
                                    onClick={() => handleWatch(currentMovie)}
                                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-red-500 hover:to-orange-500 text-white font-semibold py-4 px-12 rounded-full text-lg shadow-lg"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Watch Now <span aria-hidden="true">→</span>
                                </motion.button>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default TrendingMovies;