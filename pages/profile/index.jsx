import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import { signOut } from "firebase/auth";
import NavBar from "../../components/Navbar";
import StatsCard from "../../components/StatsCard";
import { Mosaic } from "react-loading-indicators"; // Import Mosaic

export default function Profile() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState({
    buddies: 0,
    moviesWatched: 0,
    episodesWatched: 0,
    topGenre: "None",
    favoriteMovies: 0,
    favoriteEpisodes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data());
          setUsername(userDoc.data().username);
          setEmail(userDoc.data().email);
        }
      }
      if (!user) return router.push("/");

      try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) setUser(userDoc.data());

        const historyDoc = await getDoc(doc(db, "history", user.uid));
        const favoritesDoc = await getDoc(doc(db, "favorites", user.uid));
        const friendsDoc = await getDoc(doc(db, "friends", user.uid));

        const historyData = historyDoc.exists() ? historyDoc.data() : {};
        const favoritesData = favoritesDoc.exists() ? favoritesDoc.data() : {};
        const friendsData = friendsDoc.exists() ? friendsDoc.data() : {};

        const moviesWatched = historyData.movies?.length || 0;
        const episodesWatched = historyData.episodes?.length || 0;
        const favoriteMovies = favoritesData.movies?.length || 0;
        const favoriteEpisodes = favoritesData.episodes?.length || 0;
        const buddies = friendsData.friends?.length || 0;

        const genreCounts = {};
        [...(historyData.movies || []), ...(historyData.episodes || [])].forEach(
          (item) => {
            item.genre_ids?.forEach((genre) => {
              genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });
          }
        );
        const topGenre = Object.keys(genreCounts).length
          ? Object.keys(genreCounts).reduce((a, b) =>
              genreCounts[a] > genreCounts[b] ? a : b
            )
          : "None";

        setStats({
          buddies,
          moviesWatched,
          episodesWatched,
          topGenre: genreMap[topGenre] || "None",
          favoriteMovies,
          favoriteEpisodes,
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (user) {
      await updateDoc(doc(db, "users", user.uid), {
        username,
      });

      setIsEditing(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-900 text-white">
        <Mosaic color="#ff7f50" size="medium" text="" textColor="" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-6">
      <NavBar />
      <div className="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-3xl border border-gray-700 flex flex-col items-center mt-24">
        <h1 className="text-3xl font-bold mb-6">Profile</h1>
        <div className="flex flex-col items-center">
          {isEditing ? (
            <>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="Username"
              />
              <button
                onClick={handleSave}
                className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-all"
              >
                Save Changes
              </button>
            </>
          ) : (
            <>
              <div className="text-center">
                <p className="text-xl font-semibold text-white">{username}</p>
                <p className="text-gray-400 mt-1">{email}</p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="mt-6 bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-all"
              >
                Edit Profile
              </button>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6 w-full mt-6">
          <StatsCard title="Buddies" value={stats.buddies} />
          <StatsCard title="Movies Watched" value={stats.moviesWatched} />
          <StatsCard title="Episodes Watched" value={stats.episodesWatched} />
          <StatsCard title="Top Genre" value={stats.topGenre} />
          <StatsCard title="Favorite Movies" value={stats.favoriteMovies} />
          <StatsCard title="Favorite Episodes" value={stats.favoriteEpisodes} />
        </div>

        <button
          onClick={handleLogout}
          className="mt-8 bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 transition-all"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

const genreMap = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};