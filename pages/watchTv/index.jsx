import React, { useState, useEffect } from "react";
import EpisodeCard from "../../components/EpisodeCard"; // Updated EpisodeCard component
import NavBar from "../../components/Navbar";
import ChatComponent from "../../components/Chat";
import { useRouter } from "next/router";
import axios from "axios";
import { FaVideo } from "react-icons/fa";
import { FaGripLinesVertical } from "react-icons/fa";
import Footer from "../../components/Footer";

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

const TVShowPlayerPage = () => {
  const router = useRouter();
  const { query } = router;
  const [tvShow, setTVShow] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1); // Default to season 1
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null); // Track selected episode
  const [visibleEpisodes, setVisibleEpisodes] = useState(5); // Show only 5 episodes initially
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cast, setCast] = useState([]);
  const [trailerKey, setTrailerKey] = useState("");
  const [recommendedShows, setRecommendedShows] = useState([]); // Recommended TV shows

  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  const id = query.tv_id || 0;

  // Fetch TV show details
  useEffect(() => {
    if (!id || !apiKey) {
      setError("TV Show ID or API Key is missing");
      setLoading(false);
      return;
    }

    const fetchTVShow = async () => {
      try {
        const response = await fetch(
          `${BASE_URL}/tv/${id}?api_key=${apiKey}&language=en-US`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch TV show: ${response.statusText}`);
        }
        const data = await response.json();
        setTVShow(data);
        setSeasons(data.seasons); // Set seasons data
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTVShow();
  }, [id, apiKey]);

  // Fetch episodes for the selected season
  useEffect(() => {
    if (!id || !apiKey || !selectedSeason) return;

    const fetchEpisodes = async () => {
      try {
        const response = await fetch(
          `${BASE_URL}/tv/${id}/season/${selectedSeason}?api_key=${apiKey}&language=en-US`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch episodes: ${response.statusText}`);
        }
        const data = await response.json();
        setEpisodes(data.episodes);
      } catch (error) {
        console.error("Error fetching episodes:", error);
      }
    };

    fetchEpisodes();
  }, [id, apiKey, selectedSeason]);

  // Fetch recommended TV shows
  useEffect(() => {
    if (!id || !apiKey) return;

    const fetchRecommendedShows = async () => {
      try {
        const response = await fetch(
          `${BASE_URL}/tv/${id}/recommendations?api_key=${apiKey}&language=en-US&page=1`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch recommended shows: ${response.statusText}`);
        }
        const data = await response.json();
        setRecommendedShows(data.results.slice(0, 10)); // Show first 10 recommended shows
      } catch (error) {
        console.error("Error fetching recommended shows:", error);
      }
    };

    fetchRecommendedShows();
  }, [id, apiKey]);

  // Fetch additional details (cast and trailer)
  useEffect(() => {
    if (!tvShow || !tvShow.id || !apiKey) return;

    const fetchAdditionalDetails = async () => {
      try {
        const [castResponse, trailerResponse] = await Promise.all([
          axios.get(`${BASE_URL}/tv/${tvShow.id}/credits`, {
            params: { api_key: apiKey, language: "en-US" },
          }),
          axios.get(`${BASE_URL}/tv/${tvShow.id}/videos`, {
            params: { api_key: apiKey, language: "en-US" },
          }),
        ]);

        setCast(castResponse.data.cast.slice(0, 5));

        const trailer = trailerResponse.data.results.find(
          (vid) => vid.type === "Trailer" && vid.site === "YouTube"
        );
        setTrailerKey(trailer ? trailer.key : "");
      } catch (error) {
        console.error("Error fetching additional TV show data:", error);
      }
    };

    fetchAdditionalDetails();
  }, [tvShow, apiKey]);

  // Handle loading and error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!tvShow) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-red-500">TV Show not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <NavBar />
      <main className="flex-1 p-4 space-y-8">
        {/* Video Player and Chat */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Video Player Section */}
          <div className="flex-1">
            <div className="relative rounded-lg overflow-hidden shadow-lg bg-black h-96">
              <iframe
                src={`https://vidlink.pro/tv/${tvShow.id}/${selectedSeason}/${selectedEpisode}?primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&player=default&title=true&poster=true&autoplay=false&nextbutton=false`}
                frameBorder="0"
                allowFullScreen
                sandbox
                className="w-full h-full"
              ></iframe>
            </div>
          </div>
          {/* Chat Section */}
          <div className="w-full lg:w-1/3">
            <ChatComponent />
          </div>
        </div>

        {/* TV Show Details Section */}
        <section className="p-4 bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-2">{tvShow.name}</h2>
          <p className="text-gray-300 mb-4">{tvShow.overview}</p>
          <div className="flex space-x-6 text-sm">
            <span className="text-secondary">
              First Air Date: {tvShow.first_air_date}
            </span>
            <span className="text-secondary">Rating: {tvShow.vote_average}</span>
            <span className="text-secondary hover:text-tertiary">
              <a
                className="flex items-center gap-1"
                href={`https://www.youtube.com/embed/${trailerKey}`}
              >
                <FaVideo /> Trailer
              </a>
            </span>
            <span className="text-secondary">
              Genres:{" "}
              <span className="text-orange-600">
                {tvShow.genres.map((genre) => genre.name).join(", ")}
              </span>
            </span>
          </div>
        </section>

        {/* Season Selection */}
        <section className="p-4 bg-gray-800 rounded-lg shadow-lg">
          <h3 className="text-xl font-bold mb-4">Seasons</h3>
          <div className="flex flex-wrap gap-2">
            {seasons.map((season) => (
              <button
                key={season.id}
                onClick={() => {
                  setSelectedSeason(season.season_number);
                  setSelectedEpisode(null); // Reset selected episode when changing seasons
                }}
                className={`px-4 py-2 rounded-lg ${
                  selectedSeason === season.season_number
                    ? "bg-orange-500 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Season {season.season_number}
              </button>
            ))}
          </div>
        </section>

        {/* Episodes Section */}
        <section>
          <div className="px-6 my-6 flex justify-between items-center">
            <p className="flex justify-between items-center text-lg gap-4">
              <FaGripLinesVertical className="text-2xl" />
              Episodes
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 p-6">
            {episodes.slice(0, visibleEpisodes).map((episode) => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                onWatchClick={(episodeNumber) => setSelectedEpisode(episodeNumber)}
              />
            ))}
          </div>
          {episodes.length > visibleEpisodes && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setVisibleEpisodes((prev) => prev + 5)}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all"
              >
                Show More
              </button>
            </div>
          )}
        </section>

        {/* Recommended Shows Section */}
        <section>
          <div className="px-6 my-6 flex justify-between items-center">
            <p className="flex justify-between items-center text-lg gap-4">
              <FaGripLinesVertical className="text-2xl" />
              Recommended Shows
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6">
            {recommendedShows.map((show) => (
              <EpisodeCard
                key={show.id}
                episode={{
                  ...show,
                  episode_number: 1, // Placeholder for episode number
                  still_path: show.poster_path, // Use poster_path for recommended shows
                }}
                onWatchClick={() => router.push(`/tv/${show.id}`)}
              />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default TVShowPlayerPage;