'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const SlideShow = () => {
  const [movies, setMovies] = useState([[], [], []]);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=en-US&page=1`);
        const data = await res.json();
        const movieChunks = [[], [], []];
        data.results.forEach((movie, index) => {
          movieChunks[index % 3].push(movie);
        });
        setMovies(movieChunks);
      } catch (error) {
        console.error('Error fetching movies:', error);
      }
    };

    fetchMovies();
  }, []);

  const columnVariants = (direction) => ({
    animate: {
      y: direction === 'up' ? [0, -1000] : [0, 1000],
      transition: {
        y: {
          repeat: Infinity,
          repeatType: 'loop',
          duration: 20,
          ease: 'linear',
        },
      },
    },
    paused: {
      y: 0,
    },
  });

  return (
    <div className="hidden md:flex justify-center space-x-4 overflow-hidden h-[800px] p-4">
      {movies.map((column, colIndex) => (
        <motion.div
          key={colIndex}
          className={`flex flex-col space-y-4 transition-opacity duration-300 ${hovered === colIndex ? 'opacity-100' : 'opacity-60'}`}
          variants={columnVariants(colIndex === 1 ? 'down' : 'up')}
          animate={hovered === colIndex ? 'paused' : 'animate'}
          onMouseEnter={() => setHovered(colIndex)}
          onMouseLeave={() => setHovered(null)}
        >
          {column.concat(column).map((movie, index) => (
            <div key={index} className="w-60 h-90 rounded-lg overflow-hidden shadow-lg">
              <img
                src={`${IMAGE_BASE_URL}${movie.poster_path}`}
                alt={movie.title}
                className="object-cover w-full h-full"
              />
            </div>
          ))}
        </motion.div>
      ))}
    </div>
  );
};

export default SlideShow;
