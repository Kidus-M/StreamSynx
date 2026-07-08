const DEFAULT_EMBED_SOURCE = {
  id: "streamsynx",
  name: "StreamSynx",
  movieTemplate: "https://vidsrc-embed.ru/embed/movie?tmdb={tmdbId}&autoplay=1",
  tvTemplate: "https://vidsrc-embed.ru/embed/tv?tmdb={tmdbId}&season={season}&episode={episode}&autoplay=1",
};

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

  if (!rawSources) return [DEFAULT_EMBED_SOURCE];

  try {
    const configuredSources = JSON.parse(rawSources);
    if (!Array.isArray(configuredSources)) return [DEFAULT_EMBED_SOURCE];

    const normalizedSources = configuredSources
      .map(normalizeSource)
      .filter(Boolean);

    return [DEFAULT_EMBED_SOURCE, ...normalizedSources];
  } catch (error) {
    console.error("Invalid NEXT_PUBLIC_EMBED_SOURCES JSON:", error);
    return [DEFAULT_EMBED_SOURCE];
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
