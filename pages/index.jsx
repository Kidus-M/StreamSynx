import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import Hero from "../components/Hero";
import Rail from "../components/Rail";
import MovieCard from "../components/MinimalCard";
import ContinueCard from "../components/ContinueCard";
import { tmdbGet } from "../lib/tmdb";
import {
  CONTINUE_KEY,
  getContinueWatching,
  removeContinueWatching,
  subscribeToStore,
} from "../lib/localStore";
import { useAuth } from "../lib/auth";

const withPoster = (results) => (results || []).filter((item) => item.poster_path).slice(0, 18);

const RailSkeleton = ({ title }) => (
  <section>
    <div className="mb-3 px-4 sm:px-6 lg:px-10">
      <h2 className="heading-lg">{title}</h2>
    </div>
    <div className="flex gap-3 overflow-hidden px-4 pb-2 sm:gap-4 sm:px-6 lg:px-10">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="w-[132px] shrink-0 sm:w-[150px] lg:w-[168px]">
          <div className="skeleton aspect-[2/3] w-full rounded-xl" />
          <div className="skeleton mt-2.5 h-3 w-4/5 rounded" />
          <div className="skeleton mt-1.5 h-2.5 w-1/2 rounded" />
        </div>
      ))}
    </div>
  </section>
);

export default function HomePage() {
  const { user } = useAuth();
  const [data, setData] = useState({
    hero: [],
    trendingMovies: [],
    popularMovies: [],
    topMovies: [],
    trendingShows: [],
    topShows: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [continueWatching, setContinueWatching] = useState([]);

  // Local "continue watching" list (device-only, works signed out too).
  useEffect(() => {
    const sync = () => setContinueWatching(getContinueWatching());
    sync();
    return subscribeToStore(CONTINUE_KEY, sync);
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [hero, trendingMovies, popularMovies, topMovies, trendingShows, topShows] =
          await Promise.all([
            tmdbGet("/trending/all/day"),
            tmdbGet("/trending/movie/week"),
            tmdbGet("/movie/popular"),
            tmdbGet("/discover/movie", {
              sort_by: "vote_average.desc",
              "vote_count.gte": 2000,
            }),
            tmdbGet("/trending/tv/week"),
            tmdbGet("/discover/tv", { sort_by: "vote_average.desc", "vote_count.gte": 800 }),
          ]);

        if (!active) return;
        setData({
          hero: (hero.data.results || []).filter((item) =>
            ["movie", "tv"].includes(item.media_type)
          ),
          trendingMovies: withPoster(trendingMovies.data.results),
          popularMovies: withPoster(popularMovies.data.results),
          topMovies: withPoster(topMovies.data.results),
          trendingShows: withPoster(trendingShows.data.results),
          topShows: withPoster(topShows.data.results),
        });
      } catch (err) {
        console.error("Error loading home page:", err);
        if (active) setError("We could not reach the catalogue. Check your connection and retry.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const rails = [
    { title: "Trending movies", items: data.trendingMovies },
    { title: "Popular right now", items: data.popularMovies },
    { title: "Trending series", items: data.trendingShows },
    { title: "Critically acclaimed", items: data.topMovies },
    { title: "Top rated series", items: data.topShows },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-primary text-textprimary">
      <Head>
        <title>StreamSynx — Watch movies & TV shows</title>
      </Head>

      <NavBar />

      <main className="flex-1">
        <Hero items={data.hero} loading={loading} />

        <div className="relative z-10 -mt-6 space-y-10 pb-16 pt-2 md:space-y-14">
          {error && (
            <div className="mx-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 sm:mx-6 lg:mx-10">
              {error}
            </div>
          )}

          {continueWatching.length > 0 && (
            <Rail
              title="Continue watching"
              itemClassName="w-[240px] sm:w-[280px] lg:w-[320px]"
              action={
                <span className="text-[11px] text-textsecondary">Saved on this device</span>
              }
            >
              {continueWatching.map((entry) => (
                <ContinueCard
                  key={`${entry.media_type}-${entry.id}`}
                  entry={entry}
                  onRemove={(item) =>
                    setContinueWatching(removeContinueWatching(item.media_type, item.id))
                  }
                />
              ))}
            </Rail>
          )}

          {loading
            ? rails.map((rail) => <RailSkeleton key={rail.title} title={rail.title} />)
            : rails.map((rail) => (
                <Rail key={rail.title} title={rail.title}>
                  {rail.items.map((item) => (
                    <MovieCard key={item.id} movie={item} />
                  ))}
                </Rail>
              ))}

          {/* Sign-up nudge for guests: the app is browsable without an account */}
          {!user && !loading && (
            <section className="px-4 sm:px-6 lg:px-10">
              <div className="surface flex flex-col items-start gap-5 overflow-hidden p-8 md:flex-row md:items-center md:justify-between md:p-10">
                <div className="max-w-lg">
                  <p className="section-label">Free account</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-textprimary md:text-3xl">
                    Keep your watchlist, history and buddies in sync.
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-textsecondary">
                    Browsing stays open to everyone. Sign up when you want to save titles, pick up
                    where you left off on any device, and host watch parties.
                  </p>
                </div>
                <div className="flex shrink-0 gap-3">
                  <Link href="/signup" className="btn-primary">
                    Create account
                  </Link>
                  <Link href="/login" className="btn-ghost">
                    Sign in
                  </Link>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
