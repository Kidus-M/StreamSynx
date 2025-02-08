import React, { useState } from "react";
import MovieCard from "../../components/MovieCard";
import ChatComponent from "../../components/Chat"; 
import { useRouter } from "next/router";

const MoviePlayerPage = ({ movie, recommendedMovies }) => {
    // movie: an object containing details such as title, overview, release_date, vote_average, videoUrl, etc.
    // recommendedMovies: an array of movie objects to be rendered as MovieCard components
  
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        {/* Header */}
        <header className="p-4 bg-primary">
          <h1 className="text-3xl font-bold">Now Playing: {movie.title}</h1>
        </header>
  
        {/* Main content area */}
        <main className="flex-1 p-4 space-y-8">
          {/* Video Player and Chat */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Video Player Section */}
            <div className="flex-1">
              <div className="relative rounded-lg overflow-hidden shadow-lg bg-black">
                <video controls className="w-full h-full object-cover">
                  <source src={movie.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
            {/* Chat Section */}
            <div className="w-full lg:w-1/3">
              <ChatComponent />
            </div>
          </div>
  
          {/* Movie Details Section */}
          <section className="p-4 bg-gray-800 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-2">{movie.title}</h2>
            <p className="text-gray-300 mb-4">{movie.overview}</p>
            <div className="flex space-x-6">
              <span className="text-secondary">Released: {movie.release_date}</span>
              <span className="text-secondary">Rating: {movie.vote_average}</span>
            </div>
          </section>
  
          {/* Recommended Movies Section */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Recommended for You</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {recommendedMovies.map((mov) => (
                <MovieCard key={mov.id} movie={mov} />
              ))}
            </div>
          </section>
        </main>
  
        
      </div>
    );
  };
  
  export default MoviePlayerPage;