import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import MovieCard from "../../components/SmallMovieCard"; // Import your card component
import NavBar from "../../components/Navbar"; // Import your navbar component
import Footer from "../../components/Footer"
import EventCard from "../../components/EventCard";
import { FaFilter } from "react-icons/fa";
import { FaGripLinesVertical } from "react-icons/fa";

console.log(process.env);
const MovieList = () => {
    const router = useRouter();
    const { query } = router;
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    const searchQuery = query.query || "";
    const apiUrl = `https://api.themoviedb.org/3/search/movie?query=${searchQuery}&api_key=${apiKey}&page=1`;

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

        fetchMovies();
    }, [apiUrl]);

    if (loading) {
        return <div className="text-center mt-8">Loading movies...</div>;
    }

    if (error) {
        return <div className="text-center mt-8 text-red-500">Error: {error}</div>;
    }

    return (
        <div>
            <NavBar />
            <div className="px-6 my-6 flex justify-between items-center">
                <p className="flex justify-between items-center text-lg gap-4"><FaGripLinesVertical className="text-2xl" />Search results for "{searchQuery}" <FaFilter /></p>
            </div>
            {movies.length === 0 && <div className="flex justify-center text-center bg-tertiary mx-6 h-48 rounded-lg items-center py-auto">No movies found.</div>}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-6 p-6">
                {movies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                ))}
            </div>
            <Footer />
        </div>
    );
};

export default MovieList;
