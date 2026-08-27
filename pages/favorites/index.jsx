import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { FaHeart } from "react-icons/fa";
import PageShell, { AuthGate, EmptyState } from "../../components/PageShell";
import MovieCard from "../../components/MinimalCard";
import { db } from "../../firebase";
import { useAuth } from "../../lib/auth";

const FavoritesPage = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState({ movies: [], episodes: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("movies");

  useEffect(() => {
    let active = true;
    if (!user?.uid) {
      setFavorites({ movies: [], episodes: [] });
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    getDoc(doc(db, "favorites", user.uid))
      .then((snapshot) => {
        if (!active) return;
        const data = snapshot.exists() ? snapshot.data() : {};
        setFavorites({ movies: data.movies || [], episodes: data.episodes || [] });
      })
      .catch((error) => console.error("Error loading favorites:", error))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [user?.uid]);

  const tabs = [
    { id: "movies", label: `Films (${favorites.movies.length})` },
    { id: "episodes", label: `Series (${favorites.episodes.length})` },
  ];

  const shows = favorites.episodes.map((entry) => ({
    id: entry.tvShowId,
    name: entry.tvShowName,
    poster_path: entry.poster_path,
    media_type: "tv",
  }));

  const active = tab === "movies" ? favorites.movies : shows;

  return (
    <PageShell
      title="Favorites"
      description="The titles you keep coming back to."
      actions={
        <div className="flex items-center gap-2">
          {tabs.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTab(option.id)}
              className={`chip ${tab === option.id ? "chip-active" : ""}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      }
    >
      <AuthGate message="Sign in to see your favorites.">
        {loading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index}>
                <div className="skeleton aspect-[2/3] w-full rounded-xl" />
                <div className="skeleton mt-2.5 h-3 w-4/5 rounded" />
              </div>
            ))}
          </div>
        ) : active.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {active.map((item, index) => (
              <MovieCard key={`${item.id}-${index}`} movie={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FaHeart}
            title={tab === "movies" ? "No favorite films yet" : "No favorite series yet"}
            hint="Use the heart on any watch page to add one."
            action={
              <Link href="/" className="btn-primary mt-2">
                Browse titles
              </Link>
            }
          />
        )}
      </AuthGate>
    </PageShell>
  );
};

export default FavoritesPage;
