import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Mosaic } from 'react-loading-indicators';
import { IoClose, IoSearch } from 'react-icons/io5';
import { FaPlusCircle } from "react-icons/fa";

const BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
const IMAGE_BASE_URL_W185 = "https://image.tmdb.org/t/p/w185";

// --- Debounce Utility ---
function debounce(func, wait) { let timeout; function executedFunction(...args) { const later = () => { clearTimeout(timeout); func(...args); }; clearTimeout(timeout); timeout = setTimeout(later, wait); } executedFunction.cancel = () => { clearTimeout(timeout); }; return executedFunction; }

const SelectMediaModal = ({ isOpen, onClose, onMediaSelect }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // State for TV Show Episode Selection Flow
    const [selectedTvShowForEpisodes, setSelectedTvShowForEpisodes] = useState(null);
    const [tvDetails, setTvDetails] = useState(null); // To store seasons
    const [selectedSeasonNum, setSelectedSeasonNum] = useState('');
    const [tvEpisodes, setTvEpisodes] = useState([]);
    const [loadingTvDetails, setLoadingTvDetails] = useState(false);

    // Memoized seasons list, filtering specials and sorting
    const validSeasons = useMemo(() => {
        return (tvDetails?.seasons || [])
            .filter(s => s.season_number > 0 && s.episode_count > 0)
            .sort((a, b) => a.season_number - b.season_number);
    }, [tvDetails]);

    // Reset state when modal opens/closes or query clears
    useEffect(() => {
        if (!isOpen) {
            // Reset everything on close
            setQuery(""); setResults([]); setError(null); setLoading(false);
            setSelectedTvShowForEpisodes(null); setTvDetails(null); setSelectedSeasonNum(''); setTvEpisodes([]); setLoadingTvDetails(false);
        } else if (!query && !selectedTvShowForEpisodes) {
            // Clear results if query is empty and not in episode selection
             setResults([]); setError(null); setLoading(false);
        }
    }, [isOpen, query, selectedTvShowForEpisodes]);

    // Debounced Search Fetch for /search/multi
    const fetchSearchResults = useCallback(async (currentQuery) => {
        if (!currentQuery || !API_KEY) { setResults([]); setLoading(false); return; }
        setLoading(true); setError(null); setSelectedTvShowForEpisodes(null);
        try {
            const response = await axios.get(`${BASE_URL}/search/multi`, { params: { api_key: API_KEY, query: currentQuery, include_adult: false, page: 1 } });
            setResults((response.data.results || []).filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path));
        } catch (err) { console.error("Search error:", err); setError("Failed to fetch search results."); setResults([]); }
        finally { setLoading(false); }
    }, [API_KEY]);

    const debouncedFetch = useCallback(debounce(fetchSearchResults, 400), [fetchSearchResults]);

    useEffect(() => {
        // Only trigger search if NOT in episode selection mode
        if (!selectedTvShowForEpisodes) {
             debouncedFetch(query);
        }
        return () => debouncedFetch.cancel?.();
    }, [query, selectedTvShowForEpisodes, debouncedFetch]);

    // Fetch TV Show details (for seasons) when a TV result is clicked
    const handleTvShowSelectForEpisodes = async (tvShow) => {
        if (!API_KEY) return;
        setSelectedTvShowForEpisodes(tvShow); // Enter episode selection mode
        setLoadingTvDetails(true); setResults([]); setError(null); // Clear search results
        try {
            const response = await axios.get(`${BASE_URL}/tv/${tvShow.id}`, { params: { api_key: API_KEY, language: 'en-US' } });
            setTvDetails(response.data);
            setSelectedSeasonNum(''); setTvEpisodes([]); // Reset season/episode selection
        } catch (err) { console.error("Error fetching TV seasons:", err); setError("Failed to load TV show details."); setSelectedTvShowForEpisodes(null); }
        finally { setLoadingTvDetails(false); }
    };

    // Fetch Episodes when a Season is selected
    useEffect(() => {
        const fetchEpisodes = async () => {
            if (!selectedTvShowForEpisodes || !selectedSeasonNum || !API_KEY) { setTvEpisodes([]); return; }
            setLoadingTvDetails(true); setError(null);
            try {
                const response = await axios.get(`${BASE_URL}/tv/${selectedTvShowForEpisodes.id}/season/${selectedSeasonNum}`, { params: { api_key: API_KEY, language: 'en-US' } });
                setTvEpisodes(response.data.episodes || []);
            } catch (err) { console.error("Error fetching episodes:", err); setTvEpisodes([]); setError("Failed to load episodes."); }
            finally { setLoadingTvDetails(false); }
        };
        if(selectedSeasonNum) fetchEpisodes(); // Fetch only if a season is selected
        else setTvEpisodes([]); // Clear episodes if no season selected
    }, [selectedTvShowForEpisodes, selectedSeasonNum, API_KEY]);

    // Handle Final Selection (Movie or specific TV Episode)
    const handleSelect = (item, season = null, episode = null) => {
        const mediaSelection = {
            type: item.media_type === 'tv' ? 'tv' : 'movie',
            id: item.id,
            title: item.title || item.name,
            poster_path: item.poster_path,
            // Include S/E details ONLY if they are valid numbers
            ...(item.media_type === 'tv' && typeof season === 'number' && typeof episode === 'number' && { season, episode })
        };
        onMediaSelect(mediaSelection); // Pass data back to RoomPage
    };

    // --- Render Modal ---
    return (
        <div className="fixed inset-0 z-50 bg-primary/90 backdrop-blur-sm flex justify-center items-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="select-media-title">
            {/* Themed Modal Panel */}
            <div className="bg-secondary rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-secondary-light overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center p-3 md:p-4 border-b border-secondary-light flex-shrink-0">
                    <h2 id="select-media-title" className="text-lg font-semibold text-textprimary">
                        {selectedTvShowForEpisodes ? `Select Episode: ${selectedTvShowForEpisodes.name}` : "Select Media to Watch"}
                    </h2>
                    <button onClick={onClose} className="text-textsecondary hover:text-textprimary transition-colors" aria-label="Close media selection"><IoClose className="h-6 w-6" /></button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-3 md:p-4">
                    {/* Back Button */}
                    {selectedTvShowForEpisodes && (
                        <button onClick={() => { setSelectedTvShowForEpisodes(null); setQuery(query); /* Re-trigger search might happen via useEffect */ }} className="text-sm text-accent hover:text-accent-hover mb-3">
                            &larr; Back to Search Results
                        </button>
                    )}

                    {/* Search Input (conditional) */}
                    {!selectedTvShowForEpisodes && (
                        <div className="relative mb-4">
                            <input type="text" autoFocus placeholder="Search movies or TV shows..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-primary border border-secondary-light rounded-md text-textprimary placeholder-textsecondary focus:outline-none focus:ring-1 focus:ring-accent text-sm" />
                            <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-textsecondary" />
                        </div>
                    )}

                    {/* Loading / Error */}
                    {loading && <div className="flex justify-center p-10"><Mosaic color="#DAA520" size="small" /></div>}
                    {error && <p className="text-center text-red-400 py-4 text-sm">{error}</p>}

                    {/* TV Show S/E Selection */}
                    {selectedTvShowForEpisodes && (
                        <div className="space-y-3 bg-primary p-3 rounded-md border border-secondary-light">
                            {loadingTvDetails && <div className="flex justify-center p-4"><Mosaic color="#DAA520" size="small" /></div>}
                            {!loadingTvDetails && (
                                <>
                                    <div>
                                        <label htmlFor="season-select" className="block text-xs font-medium text-textsecondary mb-1">Season:</label>
                                        <select id="season-select" value={selectedSeasonNum} onChange={(e) => setSelectedSeasonNum(e.target.value)} className="w-full p-2 bg-secondary border border-secondary-light rounded text-textprimary focus:ring-1 focus:ring-accent focus:outline-none appearance-none text-sm">
                                            <option value="">-- Select Season --</option>
                                            {validSeasons.map(s => <option key={s.id} value={s.season_number}>Season {s.season_number} ({s.episode_count} Ep.)</option>)}
                                        </select>
                                    </div>
                                    {selectedSeasonNum && episodes.length > 0 && (
                                        <div>
                                            <label className="block text-xs font-medium text-textsecondary mb-1">Episode:</label>
                                            <ul className="space-y-1 max-h-60 overflow-y-auto border border-secondary-light rounded p-1 bg-secondary">
                                                {episodes.map(ep => (
                                                    <li key={ep.id}>
                                                        <button onClick={() => handleSelect(selectedTvShowForEpisodes, ep.season_number, ep.episode_number)} className="w-full text-left p-1.5 rounded hover:bg-secondary-light text-sm text-textsecondary hover:text-textprimary transition-colors">
                                                            {/* Added padding for episode number */}
                                                            <span className="font-mono inline-block w-8 text-right mr-1">E{ep.episode_number}:</span> {ep.name || 'N/A'}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {selectedSeasonNum && !loadingTvDetails && episodes.length === 0 && ( <p className="text-sm text-textsecondary italic text-center py-2">No episodes found for Season {selectedSeasonNum}.</p> )}
                                </>
                             )}
                        </div>
                    )}

                    {/* Custom Search Results List */}
                    {!selectedTvShowForEpisodes && results.length > 0 && (
                        <ul className="space-y-2">
                            {results.map(item => (
                                <li key={`${item.id}-${item.media_type}`} className="p-2 bg-primary rounded border border-secondary-light flex items-center gap-3 group transition-colors hover:border-accent/50">
                                    <img src={item.poster_path ? `${IMAGE_BASE_URL_W185}${item.poster_path}` : '/placeholder.jpg'} // Add placeholder
                                         alt={item.title || item.name} className="w-10 h-14 object-cover rounded flex-shrink-0 bg-secondary-light" />
                                    <div className="flex-grow overflow-hidden">
                                        <p className="text-sm font-semibold text-textprimary truncate">{item.title || item.name}</p>
                                        <p className="text-xs text-textsecondary">
                                            {item.media_type === 'movie' ? `Movie • ${item.release_date?.substring(0,4) || 'N/A'}` : `TV Show • ${item.first_air_date?.substring(0,4) || 'N/A'}`}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => item.media_type === 'movie' ? handleSelect(item) : handleTvShowSelectForEpisodes(item)}
                                        className="ml-auto flex-shrink-0 bg-secondary-light p-2 rounded-full text-textsecondary group-hover:bg-accent group-hover:text-primary transition-all duration-200"
                                        title={item.media_type === 'movie' ? "Select Movie" : "Select TV Show Episode"}
                                    > <FaPlusCircle /> </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {!selectedTvShowForEpisodes && query && !loading && results.length === 0 && ( <p className="text-center text-textsecondary py-10 italic">No matches found for "{query}".</p> )}
                </div>
            </div>
        </div>
    );
};
