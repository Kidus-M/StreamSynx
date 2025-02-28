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
  const [mediaType, setMediaType] = useState(initialMovie.media_type || (initialMovie.first_air_date ? "tv" : "movie"));

  useEffect(() => {
    const fetchMovieDetails = async () => {
      if (!initialMovie || !initialMovie.id) return;

      try {
        const { data } = await axios.get(`${BASE_URL}/${mediaType}/${initialMovie.id}`, {
          params: {
            api_key: API_KEY,
            language: "en-US",
          },
        });

        setMovie(data);

        if (data.genres) {
          setGenres(data.genres.map((genre) => genre.name).join(", "));
        } else if (initialMovie.genre_ids?.length) {
          setGenres(initialMovie.genre_ids.map((id) => genreMap[id] || "Unknown").join(", "));
        }
      } catch (error) {
        console.error("Error fetching movie/TV details:", error);
      }
    };

    fetchMovieDetails();
  }, [initialMovie, mediaType]);

  useEffect(() => {
    const checkIfAdded = async () => {
      if (userId && movie.id) {
        const watchlistRef = doc(db, "watchlists", userId);
        const watchlistDoc = await getDoc(watchlistRef);
        if (watchlistDoc.exists() && watchlistDoc.data().items) {
          const items = watchlistDoc.data().items;
          setIsAdded(items.some((m) => m.id === movie.id && m.media_type === mediaType));
        } else {
            setIsAdded(false) //if the doc doesnt exist or items is undefined, then the item is not added.
        }
      }
    };
    checkIfAdded();
  }, [userId, movie.id, mediaType]);

  const handleWatch = () => {
    const url = mediaType === "tv" ? `/watchTv?tv_id=${movie.id}` : `/watch?movie_id=${movie.id}`;
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
    const item = { ...movie, media_type: mediaType };

    if (isAdded) {
      await updateDoc(watchlistRef, {
        items: arrayRemove(item),
      });
    } else {
      if (watchlistDoc.exists()) {
        await updateDoc(watchlistRef, {
          items: arrayUnion(item),
        });
      } else {
        await setDoc(watchlistRef, {
          items: [item],
        }, { merge: true });
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
        alt={`${movie.title || movie.name} Poster`}
        className="w-full h-[400px] object-cover rounded-xl"
      />
      <div className="absolute bottom-0 left-0 w-full bg-primary bg-opacity-60 text-white p-3 flex justify-between items-center rounded-md">
        <div>
          <h2 className="text-sm font-bold">{movie.title || movie.name}</h2>
          <p className="text-xs opacity-80">
            ⭐ {movie.vote_average} | {genres}
          </p>
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