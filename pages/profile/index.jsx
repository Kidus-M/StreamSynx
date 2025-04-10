// pages/profile.js (or wherever your profile page is)
import React, { useEffect, useState } from "react";
import NavBar from "../../components/NavBar"; // Adjust path
import Footer from "../../components/Footer"; // Adjust path (Add Footer if missing)
import { auth, db } from "../../firebase"; // Adjust path
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import { signOut } from "firebase/auth";
import StatsCard from "../../components/StatsCard"; // Adjust path
import { Mosaic } from "react-loading-indicators";
import toast, { Toaster } from 'react-hot-toast'; // For feedback
import { FaEdit, FaSave, FaSignOutAlt } from "react-icons/fa"; // Icons
import { motion } from "framer-motion";
// Genre Map (Ensure this covers IDs present in your data, including TV genres)
const genreMap = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", // Abbreviated
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
    // Common TV Genres (add more as needed)
    10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
    10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};


export default function Profile() {
  const [userData, setUserData] = useState(null); // Renamed from 'user' to avoid conflict
  const [stats, setStats] = useState({
    buddies: 0, moviesWatched: 0, episodesWatched: 0, topGenre: "N/A", // Default N/A
    favoriteMovies: 0, favoriteEpisodes: 0, favoriteShows: 0 // Added favoriteShows
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState(null); // Add error state
  const router = useRouter();
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchUserDataAndStats = async () => {
        setLoading(true);
        setError(null);
        if (!currentUser) {
            toast.error("Please log in to view your profile.");
            router.push("/"); // Redirect to login if not authenticated
            setLoading(false);
            return;
        }

      try {
        // Fetch User Data
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
             const data = userDoc.data();
             setUserData(data);
             setUsername(data.username); // Initialize username state
        } else {
             throw new Error("User data not found."); // Handle case where user doc doesn't exist
        }

        // Fetch Stats Data (History, Favorites, Friends)
        const historyDoc = await getDoc(doc(db, "history", currentUser.uid));
        const favoritesDoc = await getDoc(doc(db, "favorites", currentUser.uid));
        const friendsDoc = await getDoc(doc(db, "friends", currentUser.uid));

        const historyData = historyDoc.exists() ? historyDoc.data() : { movies: [], episodes: [] }; // Default empty arrays
        const favoritesData = favoritesDoc.exists() ? favoritesDoc.data() : { movies: [], episodes: [], shows: [] }; // Include shows
        const friendsData = friendsDoc.exists() ? friendsDoc.data() : { friends: [] };

        // Calculate Stats
        const moviesWatched = historyData.movies?.length || 0;
        const episodesWatched = historyData.episodes?.length || 0;
        const favoriteMovies = favoritesData.movies?.length || 0;
        const favoriteEpisodes = favoritesData.episodes?.length || 0;
        const favoriteShows = favoritesData.shows?.length || 0; // Calculate favorite shows
        const buddies = friendsData.friends?.length || 0;

        // --- Genre Calculation Start ---
        const genreCounts = {};
        // Combine movie and episode history items
        const allHistoryItems = [...(historyData.movies || []), ...(historyData.episodes || [])];

        allHistoryItems.forEach((item) => {
            let itemGenreIds = []; // Initialize empty array for genre IDs

            // Check if item exists and has genre_ids (array of numbers)
            if (item && Array.isArray(item.genre_ids) && item.genre_ids.length > 0) {
                itemGenreIds = item.genre_ids;
            }
            // Else, check if item exists and has genres (array of objects)
            else if (item && Array.isArray(item.genres) && item.genres.length > 0) {
                // Map objects to get only IDs, filter out invalid ones
                itemGenreIds = item.genres.map(g => g?.id).filter(id => typeof id === 'number');
            }
            // else, genre info is missing for this item in history

            // Count the valid IDs found
            itemGenreIds.forEach((genreId) => {
                if (genreId) { // Ensure ID is valid before counting
                    genreCounts[genreId] = (genreCounts[genreId] || 0) + 1;
                }
            });
        });

        // Find the top genre ID (This logic is correct)
        let topGenreName = "N/A";
        if (Object.keys(genreCounts).length > 0) {
            const topGenreId = Object.keys(genreCounts).reduce((a, b) => genreCounts[a] > genreCounts[b] ? a : b );
            // Look up name in map, fallback to ID
            topGenreName = genreMap[topGenreId] || `Unknown Genre (ID: ${topGenreId})`;
        }
        // --- Genre Calculation End ---

        setStats({
            buddies, moviesWatched, episodesWatched,
            topGenre: topGenreName, favoriteMovies, favoriteEpisodes, favoriteShows
        });

      } catch (err) {
        console.error("Error fetching user data/stats:", err);
        setError(err.message || "Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndStats();
  }, [currentUser, router]); // Dependencies// Depend on currentUser

  // Handle Save Username
  const handleSave = async () => {
    if (!currentUser || !username.trim()) {
        toast.error("Username cannot be empty.");
        return;
    }
     if (username.trim() === userData?.username) {
         setIsEditing(false); // No changes made
         return;
     }

     const userRef = doc(db, "users", currentUser.uid);
     const savingToast = toast.loading("Saving username...");

    try {
        await updateDoc(userRef, {
            username: username.trim(),
             // Also update lowercase version if used for searching elsewhere
             username_lowercase: username.trim().toLowerCase(),
        });
        // Optimistically update local state first for better UX
        setUserData(prev => ({...prev, username: username.trim()}));
        toast.success("Username updated!", { id: savingToast });
        setIsEditing(false);
    } catch(err) {
         console.error("Error updating username:", err);
         toast.error("Failed to update username.", { id: savingToast });
    }
  };

  // Handle Logout
  const handleLogout = async () => {
     const loggingOutToast = toast.loading("Logging out...");
     try {
        await signOut(auth);
        toast.success("Logged out successfully.", { id: loggingOutToast });
        router.push("/"); // Redirect to homepage after logout
     } catch (err) {
         console.error("Logout error:", err);
         toast.error("Logout failed. Please try again.", { id: loggingOutToast });
     }
  };

  // --- Render Loading ---
  if (loading) {
    return (
      <div className="min-h-screen mt-16 bg-primary flex flex-col items-center justify-center">
        <NavBar />
        <div className="flex-grow flex flex-col items-center justify-center">
            <Mosaic color="#DAA520" size="medium" />
        </div>
        <Footer />
      </div>
    );
  }

   // --- Render Error ---
   if (error) {
       return ( <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4"> <NavBar /> <div className="text-center"> <h2 className="text-2xl text-red-500 mb-4">Error Loading Profile</h2> <p className="text-textsecondary mb-6">{error}</p> </div> <Footer /> </div> );
    }

  // --- Main Render ---
  return (
    // Added mt-16 for spacing below NavBar
    <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center p-4 md:p-6 font-poppins">
      <Toaster position="bottom-center" toastOptions={{ className: 'bg-secondary text-textprimary',}} />
      <NavBar />
       {/* Main Profile Card - Themed */}
      <div className="bg-secondary p-6 md:p-8 rounded-xl shadow-lg w-full max-w-3xl border border-secondary-light flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-6 text-textprimary">Profile</h1>

        {/* Avatar */}
        <img
            src={userData?.avatar || `https://www.gravatar.com/avatar/${currentUser?.uid}?d=mp&f=y`} // Use UID for Gravatar seed, or userData.avatar
            alt="User Avatar"
            className="w-24 h-24 rounded-full mb-4 border-4 border-secondary-light shadow-md"
        />

        <div className="w-full max-w-xs text-center mb-6"> {/* Container for info/edit */}
          {isEditing ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-3">
              {/* Themed Input */}
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 bg-primary border border-secondary-light rounded-lg text-textprimary placeholder-textsecondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                placeholder="Enter new username"
              />
              {/* Themed Save Button */}
              <button
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 bg-accent text-primary font-semibold py-2 rounded-lg hover:bg-accent-hover transition-colors duration-200"
              >
                 <FaSave /> Save Changes
              </button>
               {/* Cancel Button */}
               <button
                onClick={() => { setIsEditing(false); setUsername(userData?.username || ""); }} // Reset username on cancel
                className="w-full text-sm text-textsecondary hover:text-textprimary transition-colors"
              > Cancel </button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-3">
               {/* Themed Display Text */}
              <div className="text-center">
                <p className="text-xl font-semibold text-textprimary">{userData?.username || "Username not set"}</p>
                <p className="text-sm text-textsecondary mt-1">{currentUser?.email || 'Email not available'}</p>
              </div>
               {/* Themed Edit Button */}
              <button
                onClick={() => setIsEditing(true)}
                className="w-full flex items-center justify-center gap-2 border border-accent/50 text-accent font-medium py-2 px-6 rounded-lg hover:bg-accent/10 hover:text-accent-hover transition-all duration-200"
              >
                <FaEdit /> Edit Username
              </button>
            </motion.div>
          )}
        </div>

        {/* Stats Section - Themed */}
        <div className="w-full border-t border-secondary-light pt-6 mt-6">
             <h2 className="text-lg font-semibold text-textprimary mb-4 text-center">Your Stats</h2>
             {/* Updated Grid Columns for better responsiveness */}
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-5 w-full">
               <StatsCard title="Buddies" value={stats.buddies} />
               <StatsCard title="Movies Watched" value={stats.moviesWatched} />
               <StatsCard title="Episodes Watched" value={stats.episodesWatched} />
               <StatsCard title="Favorite Movies" value={stats.favoriteMovies} />
                {/* Assuming favoriteShows was added */}
               <StatsCard title="Favorite Shows" value={stats.favoriteShows} />
               <StatsCard title="Favorite Episodes" value={stats.favoriteEpisodes} />
               {/* Make Top Genre span 2 cols on smallest screens if 6 items look odd */}
               <div className="sm:col-span-1">
                    <StatsCard title="Top Genre" value={stats.topGenre} />
               </div>
             </div>
        </div>


        {/* Logout Button - Themed */}
        <button
          onClick={handleLogout}
          className="mt-8 flex items-center justify-center gap-2 border border-red-600/50 text-red-300 font-medium py-2 px-6 rounded-lg hover:bg-red-700/20 hover:text-red-200 transition-all duration-200"
        >
          <FaSignOutAlt /> Logout
        </button>
      </div>
       <Footer /> {/* Add Footer */}
    </div>
  );
}