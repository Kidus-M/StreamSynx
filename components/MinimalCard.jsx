// components/MinimalCard.jsx — the poster card used across the app.
import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { FaPlus, FaCheck, FaStar, FaPlay } from "react-icons/fa";
import { genreNames, mediaTypeOf, posterUrl, titleOf, watchHref, yearOf } from "../lib/tmdb";
import { useWatchlist } from "../lib/watchlist";

const MovieCard = ({ movie, onClick, priority = false }) => {
  const router = useRouter();
  const { isSaved, toggle } = useWatchlist();

  const [imageLoaded, setImageLoaded] = useState(false);

  const data = useMemo(() => {
    const mediaType = mediaTypeOf(movie);
    return {
      id: movie?.id,
      title: titleOf(movie),
      poster: posterUrl(movie?.poster_path),
      rating: movie?.vote_average,
      year: yearOf(movie),
      genres: genreNames(movie, 2).join(" · "),
      mediaType,
    };
  }, [movie]);

  const isAdded = isSaved(movie);

  const toggleWatchlist = useCallback(
    (event) => {
      event.stopPropagation();
      event.preventDefault();
      toggle(movie);
    },
    [toggle, movie]
  );

  const open = useCallback(
    (event) => {
      event?.stopPropagation?.();
      if (onClick) {
        onClick(data);
        return;
      }
      if (data.id) router.push(watchHref({ id: data.id, media_type: data.mediaType }));
    },
    [onClick, data, router]
  );

  if (!movie?.id) return null;

  return (
    <div
      className="tv-focusable group relative w-full cursor-pointer outline-none"
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open(event);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${data.title}`}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-secondary border border-white/[0.06] shadow-card transition-all duration-300 ease-out-expo group-hover:border-white/20 group-hover:shadow-lift group-hover:-translate-y-1 group-focus-visible:border-accent/70">
        {data.poster ? (
          <img
            src={data.poster}
            alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            className={`h-full w-full object-cover transition-all duration-500 ease-out-expo group-hover:scale-[1.04] ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-primary px-3 text-center text-xs font-medium text-textsecondary/70">
            {data.title}
          </div>
        )}

        {!imageLoaded && data.poster && <div className="absolute inset-0 skeleton rounded-xl" />}

        {/* Hover scrim + play affordance */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 ease-out-expo group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary shadow-glow">
            <FaPlay className="ml-0.5 h-3.5 w-3.5" />
          </span>
        </div>

        {/* Rating badge */}
        {data.rating > 0 && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-lg bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold text-textprimary backdrop-blur-md">
            <FaStar className="h-2.5 w-2.5 text-accent" />
            {Number(data.rating).toFixed(1)}
          </span>
        )}

        {/* Watchlist toggle */}
        <button
          type="button"
          onClick={toggleWatchlist}
          aria-label={isAdded ? "Remove from watchlist" : "Add to watchlist"}
          title={isAdded ? "Remove from watchlist" : "Add to watchlist"}
          className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg backdrop-blur-md transition-all duration-200 ${
            isAdded
              ? "bg-accent text-primary"
              : "bg-black/60 text-textprimary opacity-0 hover:bg-accent hover:text-primary group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
          }`}
        >
          {isAdded ? <FaCheck size={11} /> : <FaPlus size={11} />}
        </button>
      </div>

      {/* Caption sits below the poster: keeps the artwork clean */}
      <div className="mt-2.5 px-0.5">
        <h3 className="truncate text-[13px] font-medium leading-snug text-textprimary transition-colors group-hover:text-accent">
          {data.title}
        </h3>
        <p className="mt-0.5 truncate text-[11px] text-textsecondary">
          {[data.year, data.mediaType === "tv" ? "Series" : "Film", data.genres]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </div>
  );
};

export default MovieCard;
