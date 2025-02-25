import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';
const SMALL_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w200';

const TrendingShows = () => {
    const [trendingShows, setTrendingShows] = useState([]);
    const [currentShowIndex, setCurrentShowIndex] = useState(0);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [showDetails, setShowDetails] = useState(null);

    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const response = await axios.get(`${BASE_URL}/trending/tv/day`, {
                    params: { api_key: API_KEY },
                });
                setTrendingShows(response.data.results);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching trending shows:', error);
                setLoading(false);
            }
        };

        fetchTrending();

        const intervalId = setInterval(() => {
            setCurrentShowIndex((prevIndex) => (prevIndex + 1) % (trendingShows.length || 1));
        }, 7000);

        return () => clearInterval(intervalId);
    }, [trendingShows.length]);

    useEffect(() => {
        if (trendingShows.length > 0) {
            const currentShow = trendingShows[currentShowIndex];
            const fetchShowDetails = async () => {
                try {
                    const response = await axios.get(`${BASE_URL}/tv/${currentShow.id}`, {
                        params: { api_key: API_KEY, append_to_response: 'credits,genres' },
                    });
                    setShowDetails(response.data);
                } catch (error) {
                    console.error('Error fetching show details:', error);
                    setShowDetails(null);
                }
            };
            fetchShowDetails();
        }
    }, [trendingShows, currentShowIndex]);

    const handleWatch = (show) => {
        router.push(`/watchTv?tv_id=${show.id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (trendingShows.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <p>No trending shows found.</p>
            </div>
        );
    }

    const currentShow = trendingShows[currentShowIndex];

    return (
        <div className="relative w-full h-screen overflow-hidden">
            <AnimatePresence initial={false} custom={currentShowIndex}>
                <motion.div
                    key={currentShow.id}
                    custom={currentShowIndex}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: `url(${IMAGE_BASE_URL}${currentShow.backdrop_path})`,
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-80"></div>
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                        {showDetails && (
                            <motion.div
                                initial={{ opacity: 0, y: 80 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.6, ease: "easeInOut" }}
                                className="text-center text-white max-w-3xl"
                            >
                                <h2 className="text-5xl font-extrabold mb-4 tracking-tight leading-tight">
                                    {showDetails.name}
                                </h2>
                                <div className="flex justify-center mb-4 space-x-4">
                                    {showDetails.genres.map((genre) => (
                                        <span key={genre.id} className="bg-gray-800 px-3 py-1 rounded-full text-sm">
                                            {genre.name}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xl mb-6 text-gray-300 leading-relaxed">
                                    {showDetails.overview}
                                </p>
                                <div className="flex justify-center mb-6 space-x-4 overflow-x-auto">
                                    {showDetails.credits.cast.slice(0, 5).map((actor) => (
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
                                    onClick={() => handleWatch(currentShow)}
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

export default TrendingShows;