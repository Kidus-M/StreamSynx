/**
 * Video sources used by the player. Each entry provides URL templates for
 * movies and TV episodes; the player renders them all through the same shell so
 * switching servers never changes the surrounding UI.
 */
const BUILT_IN_EMBED_SOURCES = [
  {
    id: "vidnest",
    name: "VidNest",
    movieTemplate: "https://vidnest.fun/movie/{tmdbId}",
    tvTemplate: "https://vidnest.fun/tv/{tmdbId}/{season}/{episode}",
  },
  {
    id: "vidking",
    name: "VidKing",
    movieTemplate:
      "https://www.vidking.net/embed/movie/{tmdbId}?color=e9b949&nextEpisode=true&episodeSelector=false",
    tvTemplate:
      "https://www.vidking.net/embed/tv/{tmdbId}/{season}/{episode}?color=e9b949&nextEpisode=true&episodeSelector=false",
  },
  {
    id: "vidsrc",
    name: "VidSrc",
    movieTemplate: "https://vidsrc-embed.ru/embed/movie?tmdb={tmdbId}&autoplay=1",
    tvTemplate:
      "https://vidsrc-embed.ru/embed/tv?tmdb={tmdbId}&season={season}&episode={episode}&autoplay=1",
  },
  {
    id: "vidfast",
    name: "VidFast",
    movieTemplate: "https://vidfast.vc/movie/{tmdbId}",
    tvTemplate: "https://vidfast.vc/tv/{tmdbId}/{season}/{episode}",
  },
];

const normalizeSource = (source) => {
  if (!source?.id || !source?.name) return null;

  return {
    id: String(source.id),
    name: String(source.name),
    movieTemplate: source.movieTemplate ? String(source.movieTemplate) : "",
    tvTemplate: source.tvTemplate ? String(source.tvTemplate) : "",
  };
};

export const getConfiguredEmbedSources = () => {
  const rawSources = process.env.NEXT_PUBLIC_EMBED_SOURCES;

  if (!rawSources) return BUILT_IN_EMBED_SOURCES;

  try {
    const configuredSources = JSON.parse(rawSources);
    if (!Array.isArray(configuredSources)) return BUILT_IN_EMBED_SOURCES;

    const normalizedSources = configuredSources.map(normalizeSource).filter(Boolean);

    return [...BUILT_IN_EMBED_SOURCES, ...normalizedSources].filter(
      (source, index, sources) =>
        sources.findIndex((candidate) => candidate.id === source.id) === index
    );
  } catch (error) {
    console.error("Invalid NEXT_PUBLIC_EMBED_SOURCES JSON:", error);
    return BUILT_IN_EMBED_SOURCES;
  }
};

/** Sources that can actually play the requested media type. */
export const getSourcesForMedia = (mediaType) =>
  getConfiguredEmbedSources().filter((source) =>
    mediaType === "tv" ? source.tvTemplate : source.movieTemplate
  );

export const resolveEmbedSourceUrl = (source, { mediaType, tmdbId, season, episode }) => {
  const template = mediaType === "tv" ? source?.tvTemplate : source?.movieTemplate;
  if (!template || !tmdbId) return "";

  return template
    .replaceAll("{tmdbId}", encodeURIComponent(tmdbId))
    .replaceAll("{season}", encodeURIComponent(season || "1"))
    .replaceAll("{episode}", encodeURIComponent(episode || "1"));
};

/**
 * Sandboxing the embed would block the pop-up ads these hosts inject, but the
 * providers detect the attribute and refuse to play, so it stays off by default.
 * Set NEXT_PUBLIC_PLAYER_SANDBOX=on only if a provider starts allowing it.
 */
export const PLAYER_SANDBOX =
  process.env.NEXT_PUBLIC_PLAYER_SANDBOX === "on"
    ? "allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock"
    : undefined;

export const PLAYER_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen";
