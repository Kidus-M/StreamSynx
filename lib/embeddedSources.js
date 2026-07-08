const BUILT_IN_EMBED_SOURCES = [
  {
    id: "vidking",
    name: "VidKing",
    movieTemplate: "https://www.vidking.net/embed/movie/{tmdbId}?color=ffa500&nextEpisode=true&episodeSelector=true",
    tvTemplate: "https://www.vidking.net/embed/tv/{tmdbId}/{season}/{episode}?color=ffa500&nextEpisode=true&episodeSelector=true",
  },
  {
    id: "VidSrc",
    name: "VidSrc",
    movieTemplate: "https://vidsrc-embed.ru/embed/movie?tmdb={tmdbId}&autoplay=1",
    tvTemplate: "https://vidsrc-embed.ru/embed/tv?tmdb={tmdbId}&season={season}&episode={episode}&autoplay=1",
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

    const normalizedSources = configuredSources
      .map(normalizeSource)
      .filter(Boolean);

    return [...BUILT_IN_EMBED_SOURCES, ...normalizedSources].filter(
      (source, index, sources) =>
        sources.findIndex((candidate) => candidate.id === source.id) === index
    );
  } catch (error) {
    console.error("Invalid NEXT_PUBLIC_EMBED_SOURCES JSON:", error);
    return BUILT_IN_EMBED_SOURCES;
  }
};

export const resolveEmbedSourceUrl = (source, { mediaType, tmdbId, season, episode }) => {
  const template = mediaType === "tv" ? source?.tvTemplate : source?.movieTemplate;
  if (!template || !tmdbId) return "";

  return template
    .replaceAll("{tmdbId}", encodeURIComponent(tmdbId))
    .replaceAll("{season}", encodeURIComponent(season || "1"))
    .replaceAll("{episode}", encodeURIComponent(episode || "1"));
};
