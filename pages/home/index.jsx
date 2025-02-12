import { useEffect, useState } from "react";
import MovieCard from "../../components/SmallMovieCard"; // Import your card component
import NavBar from "../../components/Navbar"; // Import your navbar component
import Footer from "../../components/Footer"
import EventCard from "../../components/EventCard";
import { FaFilter } from "react-icons/fa";
import { FaGripLinesVertical } from "react-icons/fa";

console.log(process.env);
const MovieList = () => {
  const [movies, setMovies] = useState([]);
  const [higestRatedMovies, setHighestRatedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  const apiUrl = `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=en-US&page=1`;
  const highRatedApiUrl = `https://api.themoviedb.org/3/discover/movie?language=en-US&page=1&sort_by=vote_count.desc&api_key=${apiKey}`;

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error("Failed to fetch movies");
        }
        const data = await response.json();
        setMovies(data.results.slice(0, 20)); // Get the first 20 movies
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchHighestRated = async () => {
      try {
        const response = await fetch(highRatedApiUrl);
        if (!response.ok) {
          throw new Error("Failed to fetch movies");
        }
        const data = await response.json();
        setHighestRatedMovies(data.results.slice(0, 20)); // Get the first 20 movies
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMovies();
    fetchHighestRated();
  }, [apiUrl, highRatedApiUrl]);

  if (loading) {
    return <div className="text-center mt-8">Loading movies...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div>
      <NavBar />
      <div className="px-6">
        <EventCard movie={movies[1]} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 p-6">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
      <div className="px-6 my-6 flex justify-start gap-24 items-center">
        <p className="flex justify-between items-center text-lg gap-4"><FaGripLinesVertical className="text-2xl" />Highest Rated Movies" <FaFilter /></p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-5 gap-6 p-6">
        {higestRatedMovies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
      <Footer />
    </div>
  );
};

export default MovieList;
