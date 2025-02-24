import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Plus, Check } from "lucide-react";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import axios from "axios";

const BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

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
  37: "Western",
};

const MovieCard = ({ movie: initialMovie }) => {
  const router = useRouter();
  const [isAdded, setIsAdded] = useState(false);
  const userId = auth.currentUser?.uid;
  const [movie, setMovie] = useState(initialMovie);
  const [genres, setGenres] = useState("Unknown Genre");

  useEffect(() => {
    const fetchMovieDetails = async () => {
      if (!initialMovie) return;

      try {
        const response = await axios.get(
          `${BASE_URL}/${initialMovie.media_type === "tv" ? "tv" : "movie"}/${initialMovie.id}`,
          {
            params: {
              api_key: API_KEY,
              language: "en-US",
            },
          }
        );
        setMovie(response.data);

        // Extract and set genres
        if (response.data.genres && response.data.genres.length > 0) {
          const genreNames = response.data.genres.map(genre => genre.name).join(", ");
          setGenres(genreNames);
        } else if (initialMovie.genre_ids && initialMovie.genre_ids.length > 0) {
          const initialGenreNames = initialMovie.genre_ids.map(id => genreMap[id] || "Unknown").join(", ");
          setGenres(initialGenreNames);
        } else {
          setGenres("Unknown Genre");
        }

      } catch (error) {
        console.error("Error fetching movie details:", error);
      }
    };

    fetchMovieDetails();
  }, [initialMovie]);

  useEffect(() => {
    const checkIfAdded = async () => {
      if (userId) {
        const watchlistRef = doc(db, "watchlists", userId);
        const watchlistDoc = await getDoc(watchlistRef);
        if (watchlistDoc.exists()) {
          const movies = watchlistDoc.data().movies || [];
          setIsAdded(movies.some((m) => m.id === movie.id));
        }
      }
    };
    checkIfAdded();
  }, [userId, movie.id]);

  const handleWatch = () => {
    const url = movie.media_type === "tv"
      ? `/watchTv?tv_id=${movie.id}`
      : `/watch?movie_id=${movie.id}`;
    router.push(url);
  };

  const toggleWatchlist = async (e) => {
    e.stopPropagation();
    if (!userId) {
      router.push("/login");
      return;
    }

    const watchlistRef = doc(db, "watchlists", userId);
    const watchlistDoc = await getDoc(watchlistRef);

    if (isAdded) {
      await updateDoc(watchlistRef, {
        movies: arrayRemove(movie),
      });
    } else {
      if (watchlistDoc.exists()) {
        await updateDoc(watchlistRef, {
          movies: arrayUnion(movie),
        });
      } else {
        await setDoc(watchlistRef, {
          movies: [movie],
        });
      }
    }
    setIsAdded((prev) => !prev);
  };

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden transition-transform hover:scale-105 cursor-pointer"
      onClick={handleWatch}
    >
      <img
        src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
        alt={`${movie.title} Poster`}
        className="w-full h-[400px] object-cover rounded-xl"
      />
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