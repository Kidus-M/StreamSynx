import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { FaListAlt } from "react-icons/fa";
import PageShell, { AuthGate, EmptyState } from "../../components/PageShell";
import MovieCard from "../../components/MinimalCard";
import { db } from "../../firebase";
import { useAuth } from "../../lib/auth";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "Series" },
];

const WatchlistPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let active = true;
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    getDoc(doc(db, "watchlists", user.uid))
      .then((snapshot) => {
        if (!active) return;
        setItems(snapshot.exists() ? snapshot.data()?.items || [] : []);
      })
      .catch((error) => console.error("Error loading watchlist:", error))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [user?.uid]);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((item) => item.media_type === filter)),
    [items, filter]
  );

  return (
    <PageShell
      title="Watchlist"
      description="Everything you have saved for later."
      actions={
        <div className="flex items-center gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`chip ${filter === option.id ? "chip-active" : ""}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      }
    >
      <AuthGate message="Sign in to see your watchlist.">
        {loading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index}>
                <div className="skeleton aspect-[2/3] w-full rounded-xl" />
                <div className="skeleton mt-2.5 h-3 w-4/5 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {filtered.map((item) => (
              <MovieCard key={`${item.media_type}-${item.id}`} movie={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FaListAlt}
            title="Nothing saved yet"
            hint="Tap the + on any poster to keep it here."
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

export default WatchlistPage;
