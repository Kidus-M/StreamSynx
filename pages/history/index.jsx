import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { FiClock, FiTrash2 } from "react-icons/fi";
import toast from "react-hot-toast";
import TimeAgo from "react-timeago";
import PageShell, { AuthGate, EmptyState } from "../../components/PageShell";
import MovieCard from "../../components/MinimalCard";
import ContinueCard from "../../components/ContinueCard";
import { db } from "../../firebase";
import { useAuth } from "../../lib/auth";
import {
  CONTINUE_KEY,
  getContinueWatching,
  removeContinueWatching,
  subscribeToStore,
} from "../../lib/localStore";

/** Keeps the newest entry per title / per episode. */
const dedupe = (entries, keyOf) => {
  const map = new Map();
  entries.forEach((entry) => {
    if (!entry?.watchedAt) return;
    const key = keyOf(entry);
    const existing = map.get(key);
    if (!existing || new Date(entry.watchedAt) > new Date(existing.watchedAt)) {
      map.set(key, entry);
    }
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.watchedAt) - new Date(a.watchedAt)
  );
};

const HistoryPage = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState({ movies: [], episodes: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("movies");
  const [onDevice, setOnDevice] = useState([]);

  useEffect(() => {
    const sync = () => setOnDevice(getContinueWatching());
    sync();
    return subscribeToStore(CONTINUE_KEY, sync);
  }, []);

  useEffect(() => {
    let active = true;
    if (!user?.uid) {
      setHistory({ movies: [], episodes: [] });
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    getDoc(doc(db, "history", user.uid))
      .then((snapshot) => {
        if (!active) return;
        const data = snapshot.exists() ? snapshot.data() : {};
        setHistory({
          movies: dedupe(data.movies || [], (entry) => entry.id),
          episodes: dedupe(
            data.episodes || [],
            (entry) => `${entry.tvShowId}-${entry.seasonNumber}-${entry.episodeNumber}`
          ),
        });
      })
      .catch((error) => console.error("Error loading history:", error))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [user?.uid]);

  const clearHistory = async () => {
    if (!user?.uid) return;
    try {
      await setDoc(doc(db, "history", user.uid), { movies: [], episodes: [] });
      setHistory({ movies: [], episodes: [] });
      toast.success("History cleared");
    } catch (error) {
      console.error("Error clearing history:", error);
      toast.error("Could not clear your history.");
    }
  };

  const entries = useMemo(() => {
    if (tab === "movies") {
      return history.movies.map((entry) => ({
        key: `movie-${entry.id}`,
        watchedAt: entry.watchedAt,
        media: {
          id: entry.id,
          title: entry.title,
          poster_path: entry.poster_path,
          media_type: "movie",
        },
        caption: null,
      }));
    }
    return history.episodes.map((entry) => ({
      key: `tv-${entry.tvShowId}-${entry.seasonNumber}-${entry.episodeNumber}`,
      watchedAt: entry.watchedAt,
      media: {
        id: entry.tvShowId,
        name: entry.tvShowName,
        poster_path: entry.poster_path,
        media_type: "tv",
      },
      caption: `S${entry.seasonNumber} · E${entry.episodeNumber}`,
    }));
  }, [history, tab]);

  const tabs = [
    { id: "movies", label: `Films (${history.movies.length})` },
    { id: "episodes", label: `Episodes (${history.episodes.length})` },
  ];

  return (
    <PageShell
      title="Continue watching"
      description="What you have been watching, most recent first."
      actions={
        <div className="flex flex-wrap items-center gap-2">
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
          {user && (history.movies.length > 0 || history.episodes.length > 0) && (
            <button type="button" onClick={clearHistory} className="chip hover:text-red-300">
              <FiTrash2 size={12} /> Clear
            </button>
          )}
        </div>
      }
    >
      {/* Device-local resume list: available signed out as well */}
      {onDevice.length > 0 && (
        <section className="mb-12">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="heading-lg">Pick up where you left off</h2>
            <span className="text-[11px] text-textsecondary">Saved on this device</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {onDevice.slice(0, 8).map((entry) => (
              <ContinueCard
                key={`${entry.media_type}-${entry.id}`}
                entry={entry}
                onRemove={(item) => setOnDevice(removeContinueWatching(item.media_type, item.id))}
              />
            ))}
          </div>
        </section>
      )}

      <AuthGate message="Sign in to keep your history across devices.">
        {loading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index}>
                <div className="skeleton aspect-[2/3] w-full rounded-xl" />
                <div className="skeleton mt-2.5 h-3 w-4/5 rounded" />
              </div>
            ))}
          </div>
        ) : entries.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {entries.map((entry) => (
              <div key={entry.key}>
                <MovieCard movie={entry.media} />
                <p className="mt-1.5 flex items-center gap-1.5 truncate px-0.5 text-[11px] text-textsecondary">
                  {entry.caption && <span className="text-accent">{entry.caption}</span>}
                  {entry.watchedAt && <TimeAgo date={entry.watchedAt} />}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FiClock}
            title="Nothing watched yet"
            hint="Titles you play show up here automatically."
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

export default HistoryPage;
