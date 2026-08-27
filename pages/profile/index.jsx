import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { FiEdit2, FiCheck, FiLogOut, FiX } from "react-icons/fi";
import PageShell from "../../components/PageShell";
import { auth, db } from "../../firebase";
import { loginHref, useAuth } from "../../lib/auth";
import { tmdbGet } from "../../lib/tmdb";

const EMPTY_STATS = {
  buddies: 0,
  moviesWatched: 0,
  episodesWatched: 0,
  favoriteMovies: 0,
  favoriteShows: 0,
  watchlist: 0,
};

/** How many titles to look up when working out favourite genres. */
const GENRE_SAMPLE = 12;

/**
 * History entries only store id/title/poster, so genres have to come from TMDB.
 * We sample the most recent titles and tally the genres they belong to.
 */
const computeTopGenres = async ({ movieIds, showIds }) => {
  const requests = [
    ...movieIds.slice(0, GENRE_SAMPLE).map((id) => tmdbGet(`/movie/${id}`)),
    ...showIds.slice(0, GENRE_SAMPLE).map((id) => tmdbGet(`/tv/${id}`)),
  ];
  if (!requests.length) return [];

  const responses = await Promise.allSettled(requests);
  const counts = new Map();

  responses.forEach((response) => {
    if (response.status !== "fulfilled") return;
    (response.value.data?.genres || []).forEach((genre) => {
      if (!genre?.name) return;
      counts.set(genre.name, (counts.get(genre.name) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));
};

const StatTile = ({ label, value }) => (
  <div className="surface p-4">
    <p className="text-[11px] uppercase tracking-[0.14em] text-textsecondary">{label}</p>
    <p className="mt-1.5 text-2xl font-semibold tracking-tight text-textprimary tabular-nums">
      {value}
    </p>
  </div>
);

export default function Profile() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();

  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [topGenres, setTopGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.replace(loginHref("/profile"));
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [profile, history, favorites, friends, watchlist] = await Promise.all([
          getDoc(doc(db, "users", currentUser.uid)),
          getDoc(doc(db, "history", currentUser.uid)),
          getDoc(doc(db, "favorites", currentUser.uid)),
          getDoc(doc(db, "friends", currentUser.uid)),
          getDoc(doc(db, "watchlists", currentUser.uid)),
        ]);

        if (!active) return;

        if (profile.exists()) {
          setUserData(profile.data());
          setUsername(profile.data().username || "");
        }

        const historyData = history.exists() ? history.data() : {};
        const favoritesData = favorites.exists() ? favorites.data() : {};
        const watchedMovies = historyData.movies || [];
        const watchedEpisodes = historyData.episodes || [];

        setStats({
          buddies: (friends.exists() ? friends.data().friends || [] : []).length,
          moviesWatched: new Set(watchedMovies.map((item) => item.id)).size,
          episodesWatched: watchedEpisodes.length,
          favoriteMovies: (favoritesData.movies || []).length,
          favoriteShows: (favoritesData.episodes || []).length,
          watchlist: (watchlist.exists() ? watchlist.data().items || [] : []).length,
        });

        // Newest first, de-duplicated, so the sample reflects recent taste.
        const byRecency = (entries, key) =>
          Array.from(
            new Set(
              entries
                .slice()
                .sort((a, b) => new Date(b.watchedAt || 0) - new Date(a.watchedAt || 0))
                .map((entry) => entry[key])
                .filter(Boolean)
            )
          );

        const movieIds = byRecency(
          [...watchedMovies, ...(favoritesData.movies || [])],
          "id"
        );
        const showIds = byRecency(
          [...watchedEpisodes, ...(favoritesData.episodes || [])],
          "tvShowId"
        );

        if (movieIds.length || showIds.length) {
          setGenresLoading(true);
          const genres = await computeTopGenres({ movieIds, showIds });
          if (active) setTopGenres(genres);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        if (active) setError("We could not load your profile right now.");
      } finally {
        if (active) {
          setLoading(false);
          setGenresLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [currentUser, authLoading, router]);

  const handleSave = useCallback(async () => {
    const trimmed = username.trim();
    if (!currentUser || !trimmed) {
      toast.error("Username cannot be empty.");
      return;
    }

    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        username: trimmed,
        username_lowercase: trimmed.toLowerCase(),
      });
      setUserData((previous) => ({ ...previous, username: trimmed }));
      setIsEditing(false);
      toast.success("Username updated");
    } catch (err) {
      console.error("Error updating username:", err);
      toast.error("Could not update your username.");
    }
  }, [currentUser, username]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out");
      router.push("/");
    } catch {
      toast.error("Sign out failed. Please try again.");
    }
  };

  const displayName = userData?.username || currentUser?.email?.split("@")[0] || "You";

  return (
    <PageShell title="Profile" description="Your account and viewing stats.">
      {error && (
        <p className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Identity card */}
        <div className="surface flex flex-col items-center p-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15 text-2xl font-semibold text-accent ring-1 ring-inset ring-accent/25">
            {userData?.avatar ? (
              <img
                src={userData.avatar}
                alt=""
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          {isEditing ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 w-full space-y-3">
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="input text-center"
                placeholder="New username"
              />
              <div className="flex gap-2">
                <button type="button" onClick={handleSave} className="btn-primary flex-1">
                  <FiCheck className="h-4 w-4" /> Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setUsername(userData?.username || "");
                  }}
                  className="btn-ghost"
                  aria-label="Cancel"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              <h2 className="mt-4 text-lg font-semibold tracking-tight text-textprimary">
                {displayName}
              </h2>
              <p className="mt-0.5 truncate text-sm text-textsecondary">{currentUser?.email}</p>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="btn-ghost mt-5 w-full"
              >
                <FiEdit2 className="h-3.5 w-3.5" /> Edit username
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="btn mt-2 w-full border border-red-500/25 bg-red-500/5 px-4 py-2.5 text-red-200 hover:bg-red-500/15"
          >
            <FiLogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>

        {/* Stats */}
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-textsecondary">
              Your stats
            </h2>
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="skeleton h-[86px] rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatTile label="Films watched" value={stats.moviesWatched} />
                <StatTile label="Episodes watched" value={stats.episodesWatched} />
                <StatTile label="On watchlist" value={stats.watchlist} />
                <StatTile label="Favorite films" value={stats.favoriteMovies} />
                <StatTile label="Favorite series" value={stats.favoriteShows} />
                <StatTile label="Buddies" value={stats.buddies} />
              </div>
            )}
          </section>

          <section className="surface p-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-textsecondary">
              Genres you watch most
            </h2>

            {genresLoading ? (
              <div className="mt-3 flex gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="skeleton h-8 w-28 rounded-full" />
                ))}
              </div>
            ) : topGenres.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {topGenres.map((genre, index) => (
                  <span
                    key={genre.name}
                    className={`chip ${index === 0 ? "chip-active" : ""}`}
                    title={`${genre.count} title${genre.count === 1 ? "" : "s"}`}
                  >
                    {genre.name}
                    <span className="text-[10px] opacity-70">{genre.count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-textsecondary">
                Watch a few titles and your top genres will show up here.{" "}
                <Link href="/" className="text-accent hover:text-accent-hover">
                  Find something to watch
                </Link>
                .
              </p>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}
