import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { arrayUnion, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import PlayerShell from "../../components/PlayerShell";
import MediaActions from "../../components/MediaActions";
import CastRow from "../../components/CastRow";
import RatingStars from "../../components/RatingStars";
import Rail from "../../components/Rail";
import MovieCard from "../../components/MinimalCard";
import { db } from "../../firebase";
import { useAuth } from "../../lib/auth";
import { addContinueWatching } from "../../lib/localStore";
import { backdropUrl, formatRuntime, posterUrl, tmdbGet } from "../../lib/tmdb";

const MoviePage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const movieId = router.isReady ? router.query.movie_id || null : null;

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (!router.isReady) return undefined;
    if (!movieId) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError(null);

    tmdbGet(`/movie/${movieId}`, { append_to_response: "credits,videos,recommendations" })
      .then(({ data }) => {
        if (active) setMovie(data);
      })
      .catch((err) => {
        console.error("Error loading movie:", err);
        if (active) setError("We could not load this film.");
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [router.isReady, movieId]);

  const released = useMemo(() => {
    if (!movie?.release_date) return true;
    return new Date(movie.release_date).getTime() <= Date.now();
  }, [movie]);

  const cast = useMemo(() => (movie?.credits?.cast || []).slice(0, 12), [movie]);
  const director = useMemo(
    () => (movie?.credits?.crew || []).find((person) => person.job === "Director") || null,
    [movie]
  );
  const recommendations = useMemo(
    () => (movie?.recommendations?.results || []).filter((item) => item.poster_path).slice(0, 16),
    [movie]
  );

  // Remember locally so "continue watching" works signed out too.
  useEffect(() => {
    if (!movie?.id || !released) return;
    addContinueWatching({
      id: movie.id,
      media_type: "movie",
      title: movie.title,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      year: movie.release_date?.substring(0, 4),
      href: `/watch?movie_id=${movie.id}`,
    });
  }, [movie?.id, movie?.title, movie?.poster_path, movie?.backdrop_path, movie?.release_date, released]);

  // Cloud history for signed-in users.
  useEffect(() => {
    if (!user?.uid || !movie?.id || !released) return;

    const save = async () => {
      const ref = doc(db, "history", user.uid);
      const entry = {
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        watchedAt: new Date().toISOString(),
        type: "movie",
      };
      try {
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) {
          await setDoc(ref, { movies: [entry], episodes: [] });
          return;
        }
        const recent = (snapshot.data().movies || []).slice(-5);
        if (!recent.some((item) => item.id === movie.id)) {
          await updateDoc(ref, { movies: arrayUnion(entry) });
        }
      } catch (err) {
        console.error("Error saving history:", err);
      }
    };

    save();
  }, [user?.uid, movie?.id, movie?.title, movie?.poster_path, released]);

  // Existing rating.
  useEffect(() => {
    let active = true;
    if (!user?.uid || !movieId) {
      setRating(0);
      return () => {
        active = false;
      };
    }

    getDoc(doc(db, "ratings", user.uid))
      .then((snapshot) => {
        if (!active) return;
        const entry = (snapshot.exists() ? snapshot.data().ratings || [] : []).find(
          (item) => item.movieId === parseInt(movieId, 10)
        );
        setRating(entry?.rating || 0);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [user?.uid, movieId]);

  const saveRating = useCallback(
    async (score) => {
      if (!user?.uid || !movie?.id) {
        toast("Sign in to rate titles.");
        return;
      }
      const previous = rating;
      setRating(score);

      try {
        const ref = doc(db, "ratings", user.uid);
        const snapshot = await getDoc(ref);
        const entry = { movieId: movie.id, rating: score };

        if (snapshot.exists()) {
          const others = (snapshot.data().ratings || []).filter(
            (item) => item.movieId !== movie.id
          );
          await updateDoc(ref, { ratings: [...others, entry] });
        } else {
          await setDoc(ref, { ratings: [entry] });
        }
        toast.success(`Rated ${score}/10`);
      } catch (err) {
        console.error("Error saving rating:", err);
        toast.error("Could not save your rating.");
        setRating(previous);
      }
    },
    [user?.uid, movie?.id, rating]
  );

  if (router.isReady && !movieId) {
    return (
      <div className="flex min-h-screen flex-col bg-primary text-textprimary">
        <NavBar />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">No film selected</h1>
          <p className="text-sm text-textsecondary">Pick something from the homepage to start watching.</p>
          <Link href="/" className="btn-primary">
            Browse titles
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const title = movie?.title || (loading ? "Loading…" : "Film");
  const year = movie?.release_date?.substring(0, 4);

  return (
    <div className="flex min-h-screen flex-col bg-primary text-textprimary">
      <Head>
        <title>{movie ? `${movie.title}${year ? ` (${year})` : ""} — StreamSynx` : "Watch — StreamSynx"}</title>
        <meta
          name="description"
          content={movie?.overview ? `${movie.overview.substring(0, 155)}…` : "Watch on StreamSynx."}
        />
      </Head>

      <NavBar />

      {/* Ambient backdrop behind the player */}
      {movie?.backdrop_path && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] overflow-hidden" aria-hidden="true">
          <img
            src={backdropUrl(movie.backdrop_path)}
            alt=""
            className="h-full w-full scale-110 object-cover opacity-20 blur-3xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/85 to-primary" />
        </div>
      )}

      <main className="relative z-10 flex-1 px-4 pb-16 pt-20 sm:px-6 lg:px-10 lg:pt-24">
        <div className="mx-auto max-w-6xl space-y-8">
          <PlayerShell
            mediaType="movie"
            tmdbId={movieId}
            title={title}
            placeholder={
              movie && !released ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-secondary to-primary px-6 text-center">
                  <p className="section-label text-accent">Coming soon</p>
                  <h2 className="text-2xl font-semibold tracking-tight text-textprimary">
                    Not released yet
                  </h2>
                  <p className="text-sm text-textsecondary">
                    Releases{" "}
                    {new Date(movie.release_date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              ) : null
            }
          />

          {/* Title bar */}
          <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="section-label text-accent">Now playing</p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tighter text-textprimary md:text-4xl">
                {title}
              </h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-textsecondary">
                {year && <span>{year}</span>}
                {movie?.runtime ? (
                  <>
                    <span className="h-1 w-1 rounded-full bg-textsecondary/50" />
                    <span>{formatRuntime(movie.runtime)}</span>
                  </>
                ) : null}
                {movie?.vote_average > 0 && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-textsecondary/50" />
                    <span className="text-textprimary">{movie.vote_average.toFixed(1)} TMDB</span>
                  </>
                )}
                {(movie?.genres || []).slice(0, 3).map((genre) => (
                  <span key={genre.id} className="chip py-1">
                    {genre.name}
                  </span>
                ))}
              </div>
            </div>

            {movie && (
              <MediaActions
                media={{
                  id: movie.id,
                  type: "movie",
                  title: movie.title,
                  poster_path: movie.poster_path,
                }}
              />
            )}
          </section>

          {error && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          {/* Details */}
          <section
            id="details"
            className="grid grid-cols-1 gap-8 border-t border-white/[0.06] pt-8 lg:grid-cols-[220px_minmax(0,1fr)]"
          >
            <div className="flex gap-5 lg:flex-col">
              <img
                src={posterUrl(movie?.poster_path) || "/placeholder.jpg"}
                alt=""
                className="w-28 shrink-0 rounded-xl border border-white/[0.08] object-cover shadow-card lg:w-full"
              />
              <div className="surface flex flex-1 items-center justify-center p-4">
                <RatingStars value={rating} onRate={saveRating} />
              </div>
            </div>

            <div className="space-y-7">
              {loading ? (
                <div className="space-y-2">
                  <div className="skeleton h-4 w-full rounded" />
                  <div className="skeleton h-4 w-11/12 rounded" />
                  <div className="skeleton h-4 w-2/3 rounded" />
                </div>
              ) : (
                <div>
                  <h2 className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-textsecondary">
                    Overview
                  </h2>
                  <p className="max-w-3xl text-[15px] leading-relaxed text-textsecondary">
                    {movie?.overview || "No overview available for this title."}
                  </p>
                </div>
              )}

              {director && (
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-textsecondary">
                    Director
                  </h3>
                  <p className="text-sm text-textprimary">{director.name}</p>
                </div>
              )}

              <CastRow cast={cast} />
            </div>
          </section>

          {recommendations.length > 0 && (
            <section className="border-t border-white/[0.06] pt-8">
              <div className="-mx-4 sm:-mx-6 lg:-mx-10">
                <Rail title="More like this">
                  {recommendations.map((item) => (
                    <MovieCard key={item.id} movie={{ ...item, media_type: "movie" }} />
                  ))}
                </Rail>
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MoviePage;
