import React, { useState, useEffect } from "react";
import MovieCard from "../../components/MinimalCard";
import NavBar from "../../components/Navbar";
import { useRouter } from "next/router";
import axios from "axios";
import {
  FaVideo,
  FaGripLinesVertical,
  FaStar,
  FaHeart,
  FaShare,
} from "react-icons/fa";
import Footer from "../../components/Footer";
import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { Mosaic } from "react-loading-indicators";

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

// Custom hook to fetch movie details
const useMovie = (id, apiKey) => {
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMovie = async () => {
      if (!id || !apiKey) {
        setError("Movie ID or API Key is missing");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${BASE_URL}/movie/${id}?api_key=${apiKey}&language=en-US`
        );
        if (!response.ok)
          throw new Error(`Failed to fetch movie: ${response.statusText}`);
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

  return { movie, loading, error };
};

// Custom hook to fetch recommended movies
const useRecommendedMovies = (id, apiKey) => {
  const [recommendedMovies, setRecommendedMovies] = useState([]);

  useEffect(() => {
    const fetchRecommendedMovies = async () => {
      if (!id || !apiKey) return;

      try {
        const response = await fetch(
          `${BASE_URL}/movie/${id}/recommendations?api_key=${apiKey}&language=en-US&page=1`
        );
        if (!response.ok)
          throw new Error(
            `Failed to fetch recommended movies: ${response.statusText}`
          );
        const data = await response.json();
        setRecommendedMovies(data.results.slice(0, 20));
      } catch (error) {
        console.error("Error fetching recommended movies:", error);
      }
    };

    fetchRecommendedMovies();
  }, [id, apiKey]);

  return { recommendedMovies };
};

// Custom hook to fetch additional details (cast and trailer)
const useAdditionalDetails = (movie, apiKey) => {
  const [cast, setCast] = useState([]);
  const [trailerKey, setTrailerKey] = useState("");

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

  return { cast, trailerKey };
};

// Main MoviePlayerPage component
const MoviePlayerPage = () => {
  const router = useRouter();
  const { query } = router;
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  const id = query.movie_id || 0;

  const { movie, loading, error } = useMovie(id, apiKey);
  const { recommendedMovies } = useRecommendedMovies(id, apiKey);
  const { cast, trailerKey } = useAdditionalDetails(movie, apiKey);
  const [rating, setRating] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState("");

  // Fetch friends
  useEffect(() => {
    const fetchFriends = async () => {
      if (auth.currentUser) {
        const friendsRef = doc(db, "friends", auth.currentUser.uid);
        const friendsDoc = await getDoc(friendsRef);

        if (friendsDoc.exists()) {
          const friendIds = friendsDoc.data().friends || [];

          // Fetch usernames for each friend ID
          const friendsWithUsernames = await Promise.all(
            friendIds.map(async (friendId) => {
              const userRef = doc(db, "users", friendId);
              const userDoc = await getDoc(userRef);

              if (userDoc.exists()) {
                return {
                  uid: friendId,
                  username: userDoc.data().username,
                };
              } else {
                // Handle the case where the user document doesn't exist
                return { uid: friendId, username: "Unknown User" }; // or null
              }
            })
          );

          setFriends(friendsWithUsernames);
        } else {
          // No friends document found, set friends to an empty array
          setFriends([]);
        }
      }
    };

    fetchFriends();
  }, []);

  // Recommend movie to a friend
  const recommendMovie = async () => {
    if (!auth.currentUser || !selectedFriend || !movie) return;

    try {
      const recommendationRef = doc(db, "recommendations", selectedFriend);
      await setDoc(
        recommendationRef,
        {
          movies: arrayUnion({
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            recommendedBy: auth.currentUser.uid,
          }),
        },
        { merge: true } // Use setDoc with merge: true
      );

      // Find the friend's username for the alert message
      const friend = friends.find((f) => f.uid === selectedFriend);
      alert(
        `Recommended "${movie.title}" to ${friend?.username || selectedFriend}`
      );
    } catch (error) {
      console.error("Error recommending movie:", error);
      alert("Error recommending movie. Please try again.");
    }
  };

  // Check if the movie is already in favorites
  useEffect(() => {
    const checkIfFavorite = async () => {
      if (auth.currentUser && movie) {
        const favoritesRef = doc(db, "favorites", auth.currentUser.uid);
        const favoritesDoc = await getDoc(favoritesRef);
        if (favoritesDoc.exists()) {
          const movies = favoritesDoc.data().movies || [];
          setIsFavorite(movies.some((m) => m.id === movie.id));
        }
      }
    };
    checkIfFavorite();
  }, [movie]);

  // Add/Remove movie from favorites
  const toggleFavorite = async () => {
    if (!auth.currentUser || !movie) return;

    const favoritesRef = doc(db, "favorites", auth.currentUser.uid);
    const favoritesDoc = await getDoc(favoritesRef);

    if (isFavorite) {
      await updateDoc(favoritesRef, {
        movies: arrayRemove({
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
        }),
      });
    } else {
      if (favoritesDoc.exists()) {
        await updateDoc(favoritesRef, {
          movies: arrayUnion({
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
          }),
        });
      } else {
        await setDoc(favoritesRef, {
          movies: [
            {
              id: movie.id,
              title: movie.title,
              poster_path: movie.poster_path,
            },
          ],
          episodes: [],
        });
      }
    }
    setIsFavorite((prev) => !prev);
  };

  const saveRating = async (movieId, rating) => {
    if (!auth.currentUser) return;

    const ratingsRef = doc(db, "ratings", auth.currentUser.uid);
    const ratingsDoc = await getDoc(ratingsRef);

    if (ratingsDoc.exists()) {
      await updateDoc(ratingsRef, {
        ratings: arrayUnion({ movieId, rating }),
      });
    } else {
      await setDoc(ratingsRef, {
        ratings: [{ movieId, rating }],
      });
    }
    alert(`Rating of ${rating} submitted for "${movie.title}"`);
  };

  // Save movie to history
  useEffect(() => {
    const saveToHistory = async () => {
      if (!auth.currentUser || !movie) return;

      const historyRef = doc(db, "history", auth.currentUser.uid);
      const historyDoc = await getDoc(historyRef);

      if (historyDoc.exists()) {
        await updateDoc(historyRef, {
          movies: arrayUnion({
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            watchedAt: new Date().toISOString(),
          }),
        });
      } else {
        await setDoc(historyRef, {
          movies: [
            {
              id: movie.id,
              title: movie.title,
              poster_path: movie.poster_path,
              watchedAt: new Date().toISOString(),
            },
          ],
          episodes: [],
        });
      }
    };

    saveToHistory();
  }, [movie]);

  // Handle loading and error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <NavBar />
        <Mosaic color="#ff7f50" size="medium" text="" textColor="" />
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
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <NavBar />
      <main className="flex p-6 mx-auto mt-24 gap-6">
        {/* Video Player Section */}
        <div className="w-[130%] rounded-lg overflow-hidden shadow-lg bg-black aspect-video">
          <iframe
            src={`https://vidlink.pro/movie/${movie.id}?primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&player=default&title=true&poster=true&autoplay=false&nextbutton=false`}
            frameBorder="0"
            allowFullScreen
            sandbox
            className="w-full h-full"
          ></iframe>
        </div>
        <div className="">
          {/* Movie Details Section */}
          <section className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-3xl font-bold mb-4">{movie.title}</h2>
            <div className="flex flex-col md:flex-row gap-8">
              <img
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                alt={movie.title}
                className="w-full md:w-64 object-cover rounded-lg"
              />
              <div className="flex-1">
                <p className="text-gray-300 mb-4">{movie.overview}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-secondary">Release:</span>{" "}
                    <p>{movie.release_date}</p>
                  </div>
                  <div>
                    <span className="text-secondary">Rating:</span>{" "}
                    <p>{movie.vote_average}</p>
                  </div>
                  <div>
                    <span className="text-secondary">Runtime:</span>{" "}
                    <p>{movie.runtime} mins</p>
                  </div>
                  <div>
                    <span className="text-secondary">Genres:</span>{" "}
                    <p className="text-orange-600">
                      {movie.genres.map((genre) => genre.name).join(", ")}
                    </p>
                  </div>
                  <div>
                    <span className="text-secondary">Status:</span>{" "}
                    <p>{movie.status}</p>
                  </div>
                  <div>
                    <span className="text-secondary">Budget:</span>{" "}
                    <p>${movie.budget.toLocaleString()}</p>
                  </div>
                </div>
                {trailerKey && (
                  <div className="mt-6">
                    <h3 className="text-xl font-bold mb-4">Trailer</h3>
                    <div className="relative w-full aspect-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${trailerKey}`}
                        frameBorder="0"
                        allowFullScreen
                        className="w-full h-full rounded-lg"
                        title="Movie Trailer" // Added a title for accessibility
                      ></iframe>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons and Inputs */}
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4 pt-6 ">
              {/* Favorite Button */}
              <button
                onClick={toggleFavorite}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors ${isFavorite ? "bg-red-500" : "bg-gray-700 hover:bg-gray-600"
                  }`}
              >
                <FaHeart
                  className={`${isFavorite ? "text-white" : "text-gray-300"}`}
                />
                <span className="hidden sm:inline">
                  {isFavorite ? "Remove" : "Favorite"}
                </span>
              </button>

              {/* Rating Input and Button */}
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="p-2 border rounded bg-gray-700 text-white w-20"
                  placeholder="Rate (0-10)"
                />
                <button
                  onClick={() => saveRating(movie.id, rating)}
                  className="flex items-center space-x-2 bg-blue-500 px-4 py-2 rounded-full hover:bg-blue-600 transition-colors"
                >
                  <FaStar className="text-yellow-400" />
                  <span className="hidden sm:inline">Rate</span>
                </button>
              </div>

              {/* Recommend Select and Button */}
              <div className="flex items-center space-x-2">
                <select
                  value={selectedFriend}
                  onChange={(e) => setSelectedFriend(e.target.value)}
                  className="p-2 border rounded bg-gray-700 text-white w-full sm:w-64"
                >
                  <option value="">Select a friend</option>
                  {friends.map((friend) => (
                    <option key={friend.uid} value={friend.uid}>
                      {friend.username}
                    </option>
                  ))}
                </select>
                <button
                  onClick={recommendMovie}
                  className="flex items-center space-x-2 bg-green-500 px-4 py-2 rounded-full hover:bg-green-600 transition-colors"
                >
                  <FaShare className="text-white" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
            </div>
          </section>

        </div>


        {/* Recommended Movies Section */}
      </main>
      <section className="p-6">
        <h2 className="text-2xl font-bold mb-4">Recommended for You</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {recommendedMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default MoviePlayerPage;
