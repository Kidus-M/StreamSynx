import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-gray-400 py-8 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm">
        <div className="mb-4 md:mb-0">
          <p>
            Powered by <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">TMDB</a> (The Movie Database).
          </p>
          <p className="mt-1">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
        <div className="text-center md:text-right">
          <p>&copy; {currentYear} StreamSync. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;