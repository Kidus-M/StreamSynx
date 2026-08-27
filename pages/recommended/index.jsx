import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { FiSend } from "react-icons/fi";
import PageShell, { AuthGate, EmptyState } from "../../components/PageShell";
import MovieCard from "../../components/MinimalCard";
import { db } from "../../firebase";
import { useAuth } from "../../lib/auth";

const RecommendedPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState({ movies: [], episodes: [] });
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("movies");

  useEffect(() => {
    let active = true;
    if (!user?.uid) {
      setData({ movies: [], episodes: [] });
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoading(true);
      try {
        const snapshot = await getDoc(doc(db, "recommendations", user.uid));
        const raw = snapshot.exists() ? snapshot.data() : {};
        const next = { movies: raw.movies || [], episodes: raw.episodes || [] };
        if (!active) return;
        setData(next);

        const senderIds = Array.from(
          new Set(
            [...next.movies, ...next.episodes].map((item) => item.recommendedBy).filter(Boolean)
          )
        );
        const profiles = await Promise.all(
          senderIds.map(async (uid) => {
            const profile = await getDoc(doc(db, "users", uid));
            return [uid, profile.exists() ? profile.data().username : "Someone"];
          })
        );
        if (active) setUsernames(Object.fromEntries(profiles));
      } catch (error) {
        console.error("Error loading recommendations:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  const items = useMemo(() => {
    const source = tab === "movies" ? data.movies : data.episodes;
    return source
      .slice()
      .sort((a, b) => new Date(b.recommendedAt || 0) - new Date(a.recommendedAt || 0))
      .map((entry) => ({
        key: `${entry.id || entry.tvShowId}-${entry.recommendedAt || ""}`,
        from: usernames[entry.recommendedBy] || entry.recommendedByUsername || "A buddy",
        media:
          tab === "movies"
            ? { id: entry.id, title: entry.title, poster_path: entry.poster_path, media_type: "movie" }
            : {
                id: entry.tvShowId,
                name: entry.tvShowName,
                poster_path: entry.poster_path,
                media_type: "tv",
              },
      }));
  }, [data, tab, usernames]);

  const tabs = [
    { id: "movies", label: `Films (${data.movies.length})` },
    { id: "episodes", label: `Series (${data.episodes.length})` },
  ];

  return (
    <PageShell
      title="Recommended"
      description="Titles your buddies think you should watch."
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
      <AuthGate message="Sign in to see recommendations.">
        {loading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index}>
                <div className="skeleton aspect-[2/3] w-full rounded-xl" />
                <div className="skeleton mt-2.5 h-3 w-4/5 rounded" />
              </div>
            ))}
          </div>
        ) : items.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => (
              <div key={item.key}>
                <MovieCard movie={item.media} />
                <p className="mt-1.5 truncate px-0.5 text-[11px] text-textsecondary">
                  from <span className="text-accent">{item.from}</span>
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FiSend}
            title="No recommendations yet"
            hint="Add buddies, then share titles from any watch page."
            action={
              <Link href="/buddies" className="btn-primary mt-2">
                Find buddies
              </Link>
            }
          />
        )}
      </AuthGate>
    </PageShell>
  );
};

export default RecommendedPage;
