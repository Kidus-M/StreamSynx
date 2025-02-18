import React from 'react';
import NavBar from '../../components/Navbar';
import { FaGripLinesVertical } from 'react-icons/fa';
import MovieCard from '../../components/MovieCard';


//.. Need to figure out a way to get the watchlist movies from the user and store it in the backend...
//.. I got the movie object as a parameter but instead I need to get the userid AND THEN get the watchlist movies from the backend...
//.. I will need to use the useEffect hook to get the watchlist movies from the backend and then store it in the state...
const Watchlist = ({ watchlistMovies }) => {
    return (
        <div>
            <NavBar />
            <main>
                <section className="w-full">
                    <div className="px-6 my-6 flex justify-between items-center">
                        <p className="flex justify-between items-center text-lg gap-4">
                            <FaGripLinesVertical className="text-2xl" />
                            Your Watchlist
                        </p>
                    </div>
                    {watchlistMovies && watchlistMovies.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6">
                            {watchlistMovies.map((mov) => (
                                <MovieCard key={mov.id} movie={mov} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500">Your watchlist is empty.</p>
                    )}
                </section>
            </main>
        </div>
    );
};

export default Watchlist;
