import axios from "axios";

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_API_KEY = process.env.NEXT_PUBLIC_API_KEY;

const IMG = "https://image.tmdb.org/t/p";

/**
 * Builds a TMDB image URL. Accepts either a bare path ("/abc.jpg") or an
 * already-absolute URL, so components stay safe when callers pre-format paths.
 */
export const tmdbImage = (path, size = "w500") => {
  if (!path) return null;
  if (typeof path !== "string") return null;
  if (path.startsWith("http")) return path;
  return `${IMG}/${size}${path.startsWith("/") ? path : `/${path}`}`;
};

export const posterUrl = (path) => tmdbImage(path, "w500");
export const stillUrl = (path) => tmdbImage(path, "w500");
export const profileUrl = (path) => tmdbImage(path, "w185");
export const backdropUrl = (path) => tmdbImage(path, "original");

export const tmdbGet = (path, params = {}) =>
  axios.get(`${TMDB_BASE_URL}${path}`, {
    params: { api_key: TMDB_API_KEY, language: "en-US", ...params },
  });

export const GENRE_MAP = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};

export const mediaTypeOf = (item) =>
  item?.media_type === "tv" || item?.media_type === "movie"
    ? item.media_type
    : item?.first_air_date || item?.name
    ? "tv"
    : "movie";

export const titleOf = (item) => item?.title || item?.name || "Untitled";

export const yearOf = (item) => {
  const date = item?.release_date || item?.first_air_date;
  return date ? String(date).substring(0, 4) : "";
};

export const genreNames = (item, limit = 2) => {
  if (Array.isArray(item?.genres) && item.genres.length) {
    return item.genres
      .map((genre) => (typeof genre === "string" ? genre : genre?.name))
      .filter(Boolean)
      .slice(0, limit);
  }
  return (item?.genre_ids || []).map((id) => GENRE_MAP[id]).filter(Boolean).slice(0, limit);
};

/** Canonical watch route for any TMDB item. */
export const watchHref = (item) => {
  const type = mediaTypeOf(item);
  return type === "tv" ? `/watchTv/${item.id}/1/1` : `/watch?movie_id=${item.id}`;
};

export const formatRuntime = (minutes) => {
  if (!minutes || minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest ? `${rest}m` : ""}`.trim() : `${rest}m`;
};
