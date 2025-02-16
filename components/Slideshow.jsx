'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original'; // Use full-size posters

const SlideShow = () => {
  const [movies, setMovies] = useState([]);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const fetchMoviesAndShows = async () => {
      try {
        // Fetch popular movies
        const moviesRes = await fetch(
          `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=en-US&page=1`
        );
        const moviesData = await moviesRes.json();

        // Fetch top-rated TV shows
        const showsRes = await fetch(
          `https://api.themoviedb.org/3/tv/top_rated?api_key=${API_KEY}&language=en-US&page=1`
        );
        const showsData = await showsRes.json();

        // Combine movies and shows
        const combinedResults = [...moviesData.results, ...showsData.results];
        setMovies(combinedResults);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchMoviesAndShows();
  }, []);

  return (
    <div className="hidden md:flex overflow-hidden h-[400px] relative">
      <motion.div
        className="flex space-x-8"
        animate={{ x: ['0%', '-10%'] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {/* Duplicate the movies to create an infinite scroll effect */}
        {[...movies, ...movies].map((item, index) => (
          <motion.div
            key={index}
            className="flex-shrink-0 w-64 h-[400px] rounded-lg overflow-hidden relative"
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            whileHover={{ scale: 1.1 }}
            style={{
              opacity: hovered === index ? 1 : 0.8,
              transition: 'opacity 0.3s ease',
            }}
          >
            <img
              src={`${IMAGE_BASE_URL}${item.poster_path}`}
              alt={item.title || item.name}
              className="object-cover w-full h-full"
            />
            {/* <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-4">
              <h3 className="text-white font-bold text-lg">
                {item.title || item.name}
              </h3>
              <p className="text-gray-400 text-sm">
                {item.release_date || item.first_air_date}
              </p>
            </div> */}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default SlideShow;