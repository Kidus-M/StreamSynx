import React, { useEffect, useMemo, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { FiChevronDown, FiCheck, FiPlay, FiClock } from "react-icons/fi";
import { db } from "../firebase";
import { useAuth } from "../lib/auth";
import { stillUrl } from "../lib/tmdb";

const airDateLabel = (date) => {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return date;
  }
};

const hasAired = (episode) => {
  if (!episode?.air_date) return true;
  return new Date(episode.air_date).getTime() <= Date.now();
};

const SeasonSelect = ({ seasons, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const current = seasons.find((season) => season.season_number === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="tv-focusable flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 pl-3.5 pr-2.5 text-[13px] font-medium text-textprimary transition-colors hover:border-white/20"
      >
        {current ? `Season ${current.season_number}` : "Season"}
        <FiChevronDown
          className={`h-4 w-4 text-textsecondary transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="glass-card-elevated custom-scrollbar absolute right-0 z-30 mt-2 max-h-72 w-52 overflow-y-auto p-1.5"
        >
          {seasons.map((season) => (
            <button
              key={season.id ?? season.season_number}
              type="button"
              role="option"
              aria-selected={season.season_number === value}
              onClick={() => {
                onChange(season.season_number);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                season.season_number === value
                  ? "bg-white/[0.08] text-accent"
                  : "text-textsecondary hover:bg-white/[0.05] hover:text-textprimary"
              }`}
            >
              <span>Season {season.season_number}</span>
              <span className="text-[11px] text-textsecondary/70">
                {season.episode_count ? `${season.episode_count} eps` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const EpisodeRow = ({ episode, seasonNumber, isPlaying, isWatched, onSelect }) => {
  const available = hasAired(episode);
  const still = stillUrl(episode.still_path);

  return (
    <button
      type="button"
      disabled={!available}
      onClick={() => onSelect(seasonNumber, episode.episode_number)}
      aria-current={isPlaying}
      className={`tv-focusable group flex w-full gap-3 rounded-xl p-2 text-left transition-all duration-200 sm:gap-4 ${
        isPlaying ? "bg-accent/10 ring-1 ring-inset ring-accent/30" : "hover:bg-white/[0.05]"
      } ${available ? "" : "cursor-not-allowed opacity-45"}`}
    >
      <div className="relative aspect-video w-[124px] shrink-0 overflow-hidden rounded-lg bg-secondary sm:w-[152px]">
        {still ? (
          <img src={still} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-textsecondary">
            No preview
          </div>
        )}

        {available && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-primary">
              <FiPlay className="ml-0.5 h-3.5 w-3.5" />
            </span>
          </span>
        )}

        {isPlaying && (
          <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
            <span className="h-1 w-1 animate-pulse rounded-full bg-primary" />
            Playing
          </span>
        )}

        {!available && (
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/70 py-1 text-[10px] text-white/80">
            <FiClock className="h-2.5 w-2.5" />
            {airDateLabel(episode.air_date) || "Unaired"}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tabular-nums text-textsecondary">
            E{String(episode.episode_number).padStart(2, "0")}
          </span>
          <h4
            className={`truncate text-[13.5px] font-medium ${
              isPlaying ? "text-accent" : "text-textprimary"
            }`}
          >
            {episode.name}
          </h4>
          {isWatched && !isPlaying && (
            <FiCheck className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="Watched" />
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-textsecondary">
          {episode.overview || "No description available."}
        </p>
        <p className="mt-1.5 text-[11px] text-textsecondary/70">
          {[airDateLabel(episode.air_date), episode.runtime ? `${episode.runtime} min` : ""]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </button>
  );
};

/**
 * Season picker + episode list. Watch history is read once per show instead of
 * once per episode card.
 */
const EpisodeBrowser = ({
  showId,
  seasons = [],
  episodes = [],
  loading,
  viewSeason,
  playingSeason,
  playingEpisode,
  onSeasonChange,
  onSelectEpisode,
}) => {
  const { user } = useAuth();
  const [watched, setWatched] = useState(() => new Set());

  const realSeasons = useMemo(
    () => seasons.filter((season) => season.season_number !== 0),
    [seasons]
  );

  useEffect(() => {
    let active = true;
    if (!user?.uid || !showId) {
      setWatched(new Set());
      return () => {
        active = false;
      };
    }

    getDoc(doc(db, "history", user.uid))
      .then((snapshot) => {
        if (!active) return;
        const entries = snapshot.exists() ? snapshot.data()?.episodes || [] : [];
        setWatched(
          new Set(
            entries
              .filter((entry) => Number(entry.tvShowId) === Number(showId))
              .map((entry) => `${entry.seasonNumber}-${entry.episodeNumber}`)
          )
        );
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [user?.uid, showId, playingSeason, playingEpisode]);

  return (
    <section className="space-y-4" aria-label="Episodes">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="heading-lg">Episodes</h2>
          {!loading && episodes.length > 0 && (
            <p className="mt-0.5 text-[12px] text-textsecondary">
              {episodes.length} episode{episodes.length === 1 ? "" : "s"} in this season
            </p>
          )}
        </div>
        {realSeasons.length > 0 && (
          <SeasonSelect seasons={realSeasons} value={viewSeason} onChange={onSeasonChange} />
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-[92px] w-full rounded-xl" />
          ))}
        </div>
      ) : episodes.length > 0 ? (
        <div className="custom-scrollbar max-h-none space-y-1 overflow-y-auto pr-1 lg:max-h-[560px]">
          {episodes.map((episode) => (
            <EpisodeRow
              key={episode.id ?? `${viewSeason}-${episode.episode_number}`}
              episode={episode}
              seasonNumber={viewSeason}
              isPlaying={
                playingSeason === viewSeason && playingEpisode === episode.episode_number
              }
              isWatched={watched.has(`${viewSeason}-${episode.episode_number}`)}
              onSelect={onSelectEpisode}
            />
          ))}
        </div>
      ) : (
        <p className="surface px-4 py-10 text-center text-sm text-textsecondary">
          No episodes listed for this season yet.
        </p>
      )}
    </section>
  );
};

export { hasAired };
export default EpisodeBrowser;
