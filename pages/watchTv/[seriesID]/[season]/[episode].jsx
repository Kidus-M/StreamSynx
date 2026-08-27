import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { arrayUnion, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import NavBar from "../../../../components/NavBar";
import Footer from "../../../../components/Footer";
import PlayerShell from "../../../../components/PlayerShell";
import MediaActions from "../../../../components/MediaActions";
import CastRow from "../../../../components/CastRow";
import RatingStars from "../../../../components/RatingStars";
import Rail from "../../../../components/Rail";
import MovieCard from "../../../../components/MinimalCard";
import EpisodeBrowser, { hasAired } from "../../../../components/EpisodeBrowser";
import { db } from "../../../../firebase";
import { useAuth } from "../../../../lib/auth";
import { addContinueWatching, setLastEpisode } from "../../../../lib/localStore";
import { backdropUrl, posterUrl, tmdbGet } from "../../../../lib/tmdb";

/** Episodes for one season, with request cancellation on fast switching. */
const useSeasonEpisodes = (showId, season) => {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showId || !season) {
      setEpisodes([]);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setEpisodes([]);

    tmdbGet(`/tv/${showId}/season/${season}`)
      .then(({ data }) => {
        if (active) setEpisodes(data.episodes || []);
      })
      .catch((error) => {
        console.error("Error loading season:", error);
        if (active) setEpisodes([]);
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [showId, season]);

  return { episodes, loading };
};

const EpisodePage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { seriesID, season, episode } = router.query;

  const showId = router.isReady ? seriesID || null : null;
  const playingSeason = Number(season) || 1;
  const playingEpisode = Number(episode) || 1;

  const [show, setShow] = useState(null);
  const [loadingShow, setLoadingShow] = useState(true);
  const [viewSeason, setViewSeason] = useState(playingSeason);
  const [rating, setRating] = useState(0);

  useEffect(() => setViewSeason(playingSeason), [playingSeason]);

  useEffect(() => {
    if (!showId) return undefined;
    let active = true;
    setLoadingShow(true);

    tmdbGet(`/tv/${showId}`, { append_to_response: "credits,recommendations" })
      .then(({ data }) => active && setShow(data))
      .catch((error) => console.error("Error loading show:", error))
      .finally(() => active && setLoadingShow(false));

    return () => {
      active = false;
    };
  }, [showId]);

  const { episodes: viewEpisodes, loading: loadingEpisodes } = useSeasonEpisodes(
    showId,
    viewSeason
  );
  const { episodes: playingSeasonEpisodes } = useSeasonEpisodes(
    showId,
    viewSeason === playingSeason ? null : playingSeason
  );

  const currentSeasonEpisodes =
    viewSeason === playingSeason ? viewEpisodes : playingSeasonEpisodes;

  const currentEpisode = useMemo(
    () => currentSeasonEpisodes.find((item) => item.episode_number === playingEpisode) || null,
    [currentSeasonEpisodes, playingEpisode]
  );

  const airedEpisodes = useMemo(
    () =>
      currentSeasonEpisodes
        .filter(hasAired)
        .sort((a, b) => a.episode_number - b.episode_number),
    [currentSeasonEpisodes]
  );

  const positionInSeason = airedEpisodes.findIndex(
    (item) => item.episode_number === playingEpisode
  );

  const seasonList = useMemo(
    () => (show?.seasons || []).filter((item) => item.season_number > 0 && item.episode_count > 0),
    [show]
  );

  const hasPrevious =
    positionInSeason > 0 || seasonList.some((item) => item.season_number < playingSeason);
  const hasNext =
    (positionInSeason >= 0 && positionInSeason < airedEpisodes.length - 1) ||
    seasonList.some((item) => item.season_number > playingSeason);

  const goToEpisode = useCallback(
    (nextSeason, nextEpisode) => {
      router.push(`/watchTv/${showId}/${nextSeason}/${nextEpisode}`, undefined, {
        shallow: true,
        scroll: false,
      });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [router, showId]
  );

  const step = useCallback(
    async (direction) => {
      const target = positionInSeason + direction;
      if (positionInSeason >= 0 && target >= 0 && target < airedEpisodes.length) {
        goToEpisode(playingSeason, airedEpisodes[target].episode_number);
        return;
      }

      // Cross into the neighbouring season, skipping ones with nothing aired.
      const candidates =
        direction > 0
          ? seasonList
              .filter((item) => item.season_number > playingSeason)
              .sort((a, b) => a.season_number - b.season_number)
          : seasonList
              .filter((item) => item.season_number < playingSeason)
              .sort((a, b) => b.season_number - a.season_number);

      for (const candidate of candidates) {
        try {
          const { data } = await tmdbGet(`/tv/${showId}/season/${candidate.season_number}`);
          const aired = (data.episodes || [])
            .filter(hasAired)
            .sort((a, b) => a.episode_number - b.episode_number);
          if (!aired.length) continue;

          const target = direction > 0 ? aired[0] : aired[aired.length - 1];
          goToEpisode(candidate.season_number, target.episode_number);
          return;
        } catch (error) {
          console.error("Error looking up the next season:", error);
        }
      }

      toast(direction > 0 ? "That was the latest episode." : "This is the first episode.");
    },
    [positionInSeason, airedEpisodes, playingSeason, seasonList, showId, goToEpisode]
  );

  const selectEpisode = useCallback(
    (nextSeason, nextEpisode) => {
      const target = viewEpisodes.find((item) => item.episode_number === nextEpisode);
      if (target && !hasAired(target)) {
        toast("That episode has not aired yet.");
        return;
      }
      goToEpisode(nextSeason, nextEpisode);
    },
    [viewEpisodes, goToEpisode]
  );

  // Local resume point (works signed out).
  useEffect(() => {
    if (!show?.id) return;
    setLastEpisode(show.id, playingSeason, playingEpisode);
    addContinueWatching({
      id: show.id,
      media_type: "tv",
      title: show.name,
      poster_path: show.poster_path,
      backdrop_path: currentEpisode?.still_path || show.backdrop_path,
      season: playingSeason,
      episode: playingEpisode,
      episodeName: currentEpisode?.name || "",
      href: `/watchTv/${show.id}/${playingSeason}/${playingEpisode}`,
    });
  }, [show?.id, show?.name, show?.poster_path, show?.backdrop_path, playingSeason, playingEpisode, currentEpisode?.name, currentEpisode?.still_path]);

  // Cloud history.
  useEffect(() => {
    if (!user?.uid || !show?.id) return;

    const save = async () => {
      const ref = doc(db, "history", user.uid);
      const entry = {
        tvShowId: show.id,
        tvShowName: show.name,
        seasonNumber: playingSeason,
        episodeNumber: playingEpisode,
        watchedAt: new Date().toISOString(),
        poster_path: show.poster_path,
      };
      try {
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) {
          await setDoc(ref, { movies: [], episodes: [entry] });
          return;
        }
        const recent = (snapshot.data().episodes || []).slice(-10);
        const exists = recent.some(
          (item) =>
            item.tvShowId === show.id &&
            item.seasonNumber === playingSeason &&
            item.episodeNumber === playingEpisode
        );
        if (!exists) await updateDoc(ref, { episodes: arrayUnion(entry) });
      } catch (error) {
        console.error("Error saving history:", error);
      }
    };

    save();
  }, [user?.uid, show?.id, show?.name, show?.poster_path, playingSeason, playingEpisode]);

  // Existing show rating.
  useEffect(() => {
    let active = true;
    if (!user?.uid || !showId) {
      setRating(0);
      return () => {
        active = false;
      };
    }

    getDoc(doc(db, "ratings", user.uid))
      .then((snapshot) => {
        if (!active) return;
        const entry = (snapshot.exists() ? snapshot.data().episodes || [] : []).find(
          (item) => item.tvShowId === parseInt(showId, 10)
        );
        setRating(entry?.rating || 0);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [user?.uid, showId]);

  const saveRating = useCallback(
    async (score) => {
      if (!user?.uid || !show?.id) {
        toast("Sign in to rate titles.");
        return;
      }
      const previous = rating;
      setRating(score);

      const entry = {
        tvShowId: show.id,
        tvShowName: show.name,
        rating: score,
        type: "tv",
        poster_path: show.poster_path,
        ratedAt: new Date().toISOString(),
      };

      try {
        const ref = doc(db, "ratings", user.uid);
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) {
          const others = (snapshot.data().episodes || []).filter(
            (item) => item.tvShowId !== show.id
          );
          await updateDoc(ref, { episodes: [...others, entry] });
        } else {
          await setDoc(ref, { episodes: [entry] });
        }
        toast.success(`Rated ${score}/10`);
      } catch (error) {
        console.error("Error saving rating:", error);
        toast.error("Could not save your rating.");
        setRating(previous);
      }
    },
    [user?.uid, show?.id, show?.name, show?.poster_path, rating]
  );

  const cast = useMemo(() => (show?.credits?.cast || []).slice(0, 12), [show]);
  const recommendations = useMemo(
    () => (show?.recommendations?.results || []).filter((item) => item.poster_path).slice(0, 16),
    [show]
  );

  if (router.isReady && !showId) {
    return (
      <div className="flex min-h-screen flex-col bg-primary text-textprimary">
        <NavBar />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">No series selected</h1>
          <Link href="/" className="btn-primary">
            Browse titles
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const title = show?.name || (loadingShow ? "Loading…" : "Series");
  const episodeLabel = `S${playingSeason} · E${playingEpisode}`;

  return (
    <div className="flex min-h-screen flex-col bg-primary text-textprimary">
      <Head>
        <title>{show ? `${show.name} — ${episodeLabel} — StreamSynx` : "Watch — StreamSynx"}</title>
        <meta
          name="description"
          content={show?.overview ? `${show.overview.substring(0, 155)}…` : "Watch on StreamSynx."}
        />
      </Head>

      <NavBar />

      {show?.backdrop_path && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] overflow-hidden" aria-hidden="true">
          <img
            src={backdropUrl(show.backdrop_path)}
            alt=""
            className="h-full w-full scale-110 object-cover opacity-20 blur-3xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/85 to-primary" />
        </div>
      )}

      <main className="relative z-10 flex-1 px-4 pb-16 pt-20 sm:px-6 lg:px-10 lg:pt-24">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-10">
            {/* Player + details */}
            <div className="space-y-8">
              <PlayerShell
                mediaType="tv"
                tmdbId={showId}
                season={playingSeason}
                episode={playingEpisode}
                title={`${title} ${episodeLabel}`}
                episodeLabel={currentEpisode?.name ? `Now: ${currentEpisode.name}` : episodeLabel}
                onPrevious={() => step(-1)}
                onNext={() => step(1)}
                hasPrevious={hasPrevious}
                hasNext={hasNext}
              />

              <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="section-label text-accent">Now playing</p>
                  <h1 className="mt-1.5 text-2xl font-semibold tracking-tighter text-textprimary md:text-4xl">
                    {title}
                  </h1>
                  <p className="mt-2 text-[13px] text-textsecondary">
                    <span className="font-medium text-textprimary">
                      Season {playingSeason} · Episode {playingEpisode}
                    </span>
                    {currentEpisode?.name ? ` — ${currentEpisode.name}` : ""}
                  </p>
                  {(show?.genres || []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {show.genres.slice(0, 4).map((genre) => (
                        <span key={genre.id} className="chip py-1">
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {show && (
                  <MediaActions
                    media={{
                      id: show.id,
                      type: "tv",
                      title: show.name,
                      poster_path: show.poster_path,
                    }}
                  />
                )}
              </section>

              <section
                id="details"
                className="grid grid-cols-1 gap-8 border-t border-white/[0.06] pt-8 lg:grid-cols-[200px_minmax(0,1fr)]"
              >
                <div className="flex gap-5 lg:flex-col">
                  <img
                    src={posterUrl(show?.poster_path) || "/placeholder.jpg"}
                    alt=""
                    className="w-28 shrink-0 rounded-xl border border-white/[0.08] object-cover shadow-card lg:w-full"
                  />
                  <div className="surface flex flex-1 items-center justify-center p-4">
                    <RatingStars value={rating} onRate={saveRating} />
                  </div>
                </div>

                <div className="space-y-7">
                  <div>
                    <h2 className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-textsecondary">
                      {currentEpisode?.overview ? "This episode" : "About the series"}
                    </h2>
                    <p className="max-w-3xl text-[15px] leading-relaxed text-textsecondary">
                      {currentEpisode?.overview || show?.overview || "No description available."}
                    </p>
                  </div>

                  <CastRow cast={cast} />
                </div>
              </section>
            </div>

            {/* Episode browser */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <EpisodeBrowser
                showId={showId}
                seasons={show?.seasons || []}
                episodes={viewEpisodes}
                loading={loadingEpisodes || loadingShow}
                viewSeason={viewSeason}
                playingSeason={playingSeason}
                playingEpisode={playingEpisode}
                onSeasonChange={setViewSeason}
                onSelectEpisode={selectEpisode}
              />
            </aside>
          </div>

          {recommendations.length > 0 && (
            <section className="mt-12 border-t border-white/[0.06] pt-8">
              <div className="-mx-4 sm:-mx-6 lg:-mx-10">
                <Rail title="More like this">
                  {recommendations.map((item) => (
                    <MovieCard key={item.id} movie={{ ...item, media_type: "tv" }} />
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

export default EpisodePage;
