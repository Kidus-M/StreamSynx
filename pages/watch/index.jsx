import React, { useState, useEffect } from "react";
import MovieCard from "../../components/MinimalCard";
import NavBar from "../../components/Navbar";
import { useRouter } from "next/router";
import axios from "axios";
import { FaVideo, FaGripLinesVertical } from "react-icons/fa";
import Footer from "../../components/Footer";

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

const MoviePlayerPage = () => {
  const router = useRouter();
  const { query } = router;
  const [movie, setMovie] = useState(null);
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cast, setCast] = useState([]);
  const [trailerKey, setTrailerKey] = useState("");

  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  const id = query.movie_id || 0;

  // Fetch movie details
  useEffect(() => {
    if (!id || !apiKey) {
      setError("Movie ID or API Key is missing");
      setLoading(false);
      return;
    }

    const fetchMovie = async () => {
      try {
        const response = await fetch(
          `${BASE_URL}/movie/${id}?api_key=${apiKey}&language=en-US`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch movie: ${response.statusText}`);
        }
        const data = await response.json();
        setMovie(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id, apiKey]);

  // Fetch recommended movies
  useEffect(() => {
    if (!id || !apiKey) return;

    const fetchRecommendedMovies = async () => {
      try {
        const response = await fetch(
          `${BASE_URL}/movie/${id}/recommendations?api_key=${apiKey}&language=en-US&page=1`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch recommended movies: ${response.statusText}`);
        }
        const data = await response.json();
        setRecommendedMovies(data.results.slice(0, 20));
      } catch (error) {
        console.error("Error fetching recommended movies:", error);
      }
    };

    fetchRecommendedMovies();
  }, [id, apiKey]);

  // Fetch additional details (cast and trailer)
  useEffect(() => {
    if (!movie || !movie.id || !apiKey) return;

    const fetchAdditionalDetails = async () => {
      try {
        const [castResponse, trailerResponse] = await Promise.all([
          axios.get(`${BASE_URL}/movie/${movie.id}/credits`, {
            params: { api_key: apiKey, language: "en-US" },
          }),
          axios.get(`${BASE_URL}/movie/${movie.id}/videos`, {
            params: { api_key: apiKey, language: "en-US" },
          }),
        ]);

        setCast(castResponse.data.cast.slice(0, 5));

        const trailer = trailerResponse.data.results.find(
          (vid) => vid.type === "Trailer" && vid.site === "YouTube"
        );
        setTrailerKey(trailer ? trailer.key : "");
      } catch (error) {
        console.error("Error fetching additional movie data:", error);
      }
    };

    fetchAdditionalDetails();
  }, [movie, apiKey]);

  // Handle loading and error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <NavBar />
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <NavBar />
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!movie) {
    return (
      
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <NavBar />
        <p className="text-red-500">Movie not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col  mt-20">
      <NavBar />
      <main className="flex-1 p-4 space-y-8">
        {/* Video Player Section */}
        <div className="w-full max-w-4xl mx-auto">
          <div className="relative rounded-lg overflow-hidden shadow-lg bg-black h-[500px]">
            <iframe
              src={`https://vidlink.pro/movie/${movie.id}?primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&player=default&title=true&poster=true&autoplay=false&nextbutton=false`}
              frameBorder="0"
              allowFullScreen
              sandbox
              className="w-full h-full"
            ></iframe>
          </div>
        </div>

        {/* Movie Details Section */}
        <section className="w-full bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-3xl font-bold mb-4">{movie.title}</h2>
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Movie Poster */}
            <img
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              alt={movie.title}
              className="w-64 h-96 object-cover rounded-lg"
            />
            {/* Movie Details */}
            <div className="flex-1">
              <p className="text-gray-300 mb-4">{movie.overview}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-secondary">Release Date:</span>
                  <p>{movie.release_date}</p>
                </div>
                <div>
                  <span className="text-secondary">Rating:</span>
                  <p>{movie.vote_average}</p>
                </div>
                <div>
                  <span className="text-secondary">Runtime:</span>
                  <p>{movie.runtime} mins</p>
                </div>
                <div>
                  <span className="text-secondary">Genres:</span>
                  <p className="text-orange-600">
                    {movie.genres.map((genre) => genre.name).join(", ")}
                  </p>
                </div>
                <div>
                  <span className="text-secondary">Status:</span>
                  <p>{movie.status}</p>
                </div>
                <div>
                  <span className="text-secondary">Budget:</span>
                  <p>${movie.budget.toLocaleString()}</p>
                </div>
              </div>
              {/* Trailer Section */}
              {trailerKey && (
                <div className="mt-6">
                  <h3 className="text-xl font-bold mb-4">Trailer</h3>
                  <div className="relative w-full h-64">
                    <iframe
                      src={`https://www.youtube.com/embed/${trailerKey}`}
                      frameBorder="0"
                      allowFullScreen
                      className="w-full h-full rounded-lg"
                    ></iframe>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Recommended Movies Section */}
        <section className="w-full">
          <div className="px-6 my-6 flex justify-between items-center">
            <p className="flex justify-between items-center text-lg gap-4">
              <FaGripLinesVertical className="text-2xl" />
              Recommended for you
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6">
            {recommendedMovies.map((mov) => (
              <MovieCard key={mov.id} movie={mov} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default MoviePlayerPage;