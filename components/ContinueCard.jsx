import React from "react";
import { useRouter } from "next/router";
import { FaPlay } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import { tmdbImage } from "../lib/tmdb";

/** Wide card for the locally stored "continue watching" rail. */
const ContinueCard = ({ entry, onRemove }) => {
  const router = useRouter();
  const image = tmdbImage(entry.backdrop_path || entry.poster_path, "w780");

  const subtitle =
    entry.media_type === "tv" && entry.season && entry.episode
      ? `S${entry.season} · E${entry.episode}${entry.episodeName ? ` — ${entry.episodeName}` : ""}`
      : entry.year || "Film";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(entry.href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(entry.href);
        }
      }}
      className="tv-focusable group relative cursor-pointer"
      aria-label={`Resume ${entry.title}`}
    >
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/[0.06] bg-secondary shadow-card transition-all duration-300 ease-out-expo group-hover:-translate-y-1 group-hover:border-white/20 group-hover:shadow-lift">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out-expo group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-primary text-xs text-textsecondary">
            {entry.title}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary shadow-glow">
            <FaPlay className="ml-0.5 h-3.5 w-3.5" />
          </span>
        </div>

        <button
          type="button"
          aria-label={`Remove ${entry.title} from continue watching`}
          onClick={(event) => {
            event.stopPropagation();
            onRemove?.(entry);
          }}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-textprimary opacity-0 backdrop-blur-md transition-all hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <FiX size={13} />
        </button>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="truncate text-sm font-medium text-white">{entry.title}</p>
          <p className="mt-0.5 truncate text-[11px] text-white/60">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export default ContinueCard;
