import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiRefreshCw, FiChevronLeft, FiChevronRight, FiServer, FiAlertCircle } from "react-icons/fi";
import {
  PLAYER_ALLOW,
  PLAYER_SANDBOX,
  getSourcesForMedia,
  resolveEmbedSourceUrl,
} from "../lib/embeddedSources";
import { getPreferredSourceId, setPreferredSourceId } from "../lib/localStore";

const SLOW_LOAD_MS = 9000;

/**
 * One player for movies and episodes: identical frame, identical controls.
 * The server picker sits in the bar under the video and remembers the choice
 * on this device, so switching sources never moves the surrounding layout.
 */
const PlayerShell = ({
  mediaType,
  tmdbId,
  season,
  episode,
  title,
  placeholder = null,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  episodeLabel,
}) => {
  const sources = useMemo(() => getSourcesForMedia(mediaType), [mediaType]);
  const [sourceId, setSourceId] = useState(() => sources[0]?.id || "");
  const [nonce, setNonce] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const slowTimer = useRef(null);

  // Restore the visitor's preferred server after mount (keeps SSR markup stable).
  useEffect(() => {
    const preferred = getPreferredSourceId();
    if (preferred && sources.some((source) => source.id === preferred)) {
      setSourceId(preferred);
    }
  }, [sources]);

  const source = useMemo(
    () => sources.find((item) => item.id === sourceId) || sources[0],
    [sources, sourceId]
  );

  const url = useMemo(
    () => resolveEmbedSourceUrl(source, { mediaType, tmdbId, season, episode }),
    [source, mediaType, tmdbId, season, episode]
  );

  // Reset the loading state whenever what we are playing changes.
  useEffect(() => {
    setLoaded(false);
    setSlow(false);
    clearTimeout(slowTimer.current);
    slowTimer.current = setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => clearTimeout(slowTimer.current);
  }, [url, nonce]);

  const handleLoaded = useCallback(() => {
    setLoaded(true);
    setSlow(false);
    clearTimeout(slowTimer.current);
  }, []);

  const selectSource = useCallback((id) => {
    setSourceId(id);
    setPreferredSourceId(id);
  }, []);

  const showControls = Boolean(url) && !placeholder;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-lift">
      {/* Video frame */}
      <div
        className="tv-focusable tv-player-frame relative aspect-video w-full bg-black"
        role="region"
        tabIndex={0}
        aria-label={title ? `${title} player` : "Video player"}
      >
        {placeholder ? (
          placeholder
        ) : url ? (
          <>
            <iframe
              key={`${source?.id}-${tmdbId}-${season || 0}-${episode || 0}-${nonce}`}
              src={url}
              title={title || "Player"}
              onLoad={handleLoaded}
              allow={PLAYER_ALLOW}
              sandbox={PLAYER_SANDBOX}
              referrerPolicy="origin"
              allowFullScreen
              tabIndex={0}
              className="tv-player-iframe absolute inset-0 h-full w-full border-0"
            />

            {/* Loading veil - hides the provider's own flash of black/ads */}
            {!loaded && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
                <p className="text-xs text-textsecondary">
                  {slow ? "This server is slow to respond" : "Loading player..."}
                </p>
                {slow && (
                  <p className="max-w-xs text-center text-[11px] text-textsecondary/70">
                    Pick another server below if it does not start.
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
            <FiAlertCircle className="h-5 w-5 text-accent" />
            <p className="text-sm text-textprimary">No player available for this title.</p>
          </div>
        )}
      </div>

      {/* Control bar: same chrome for films and episodes */}
      {showControls && (
        <div className="flex flex-col gap-3 border-t border-white/[0.06] bg-primary-soft/90 px-3 py-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
            <span className="hidden shrink-0 items-center gap-1.5 pr-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-textsecondary sm:flex">
              <FiServer className="h-3.5 w-3.5" />
              Server
            </span>
            <div className="flex items-center gap-1.5">
              {sources.map((item, index) => {
                const active = item.id === source?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectSource(item.id)}
                    aria-pressed={active}
                    title={item.name}
                    className={`tv-focusable shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ${
                      active
                        ? "bg-accent text-primary shadow-[0_6px_18px_-8px_rgba(233,185,73,0.9)]"
                        : "bg-white/[0.05] text-textsecondary hover:bg-white/[0.1] hover:text-textprimary"
                    }`}
                  >
                    <span className="sm:hidden">{index + 1}</span>
                    <span className="hidden sm:inline">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            {episodeLabel && (
              <span className="truncate text-[12px] text-textsecondary sm:mr-1">{episodeLabel}</span>
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setNonce((value) => value + 1)}
                title="Reload player"
                aria-label="Reload player"
                className="tv-focusable flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-textsecondary transition-colors hover:bg-white/[0.1] hover:text-textprimary"
              >
                <FiRefreshCw className="h-3.5 w-3.5" />
              </button>

              {(onPrevious || onNext) && (
                <>
                  <span className="mx-0.5 h-5 w-px bg-white/10" />
                  <button
                    type="button"
                    onClick={onPrevious}
                    disabled={!hasPrevious}
                    title="Previous episode"
                    aria-label="Previous episode"
                    className="tv-focusable flex h-8 items-center gap-1 rounded-lg bg-white/[0.05] px-2.5 text-[12px] font-medium text-textsecondary transition-colors hover:bg-white/[0.1] hover:text-textprimary disabled:opacity-35 disabled:hover:bg-white/[0.05]"
                  >
                    <FiChevronLeft className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Prev</span>
                  </button>
                  <button
                    type="button"
                    onClick={onNext}
                    disabled={!hasNext}
                    title="Next episode"
                    aria-label="Next episode"
                    className="tv-focusable flex h-8 items-center gap-1 rounded-lg bg-accent px-3 text-[12px] font-semibold text-primary transition-colors hover:bg-accent-hover disabled:opacity-35"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <FiChevronRight className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerShell;
