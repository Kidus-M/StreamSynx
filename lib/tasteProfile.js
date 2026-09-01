// lib/tasteProfile.js — the "four films, four series" taste picks and the
// derived vector that buddy matching runs on.
//
// Picks are what a user shows the world; the taste profile is the compact,
// denormalised summary we score against. Building it costs a handful of TMDB
// calls, but only when someone edits their picks — matching itself is pure
// arithmetic over profiles we already hold in memory.
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { GENRE_MAP, tmdbGet } from "./tmdb";

export const MAX_PICKS_PER_TYPE = 4;
export const TASTE_PROFILE_VERSION = 1;

/** Slots a fully filled profile has (4 films + 4 series). */
export const TOTAL_PICK_SLOTS = MAX_PICKS_PER_TYPE * 2;

const KEYWORDS_PER_TITLE = 8;
const CAST_PER_TITLE = 3;

/** Keep stored vectors small: they are read for every candidate on every run. */
const VECTOR_CAP = { genres: 24, keywords: 64, people: 40, decades: 8 };

/** Names are only needed for the entries a match explanation can mention. */
const LABEL_CAP = 16;

/** Top genres double as the shard key used to shortlist candidates. */
export const TOP_GENRE_COUNT = 6;

export const EMPTY_TASTE_PICKS = { movies: [], shows: [] };

export const genreName = (id) => GENRE_MAP[Number(id)] || null;

/** Names for a list of genre ids, skipping ids TMDB has no label for. */
export const genreNamesFor = (ids = []) => ids.map(genreName).filter(Boolean);

/**
 * The subset of a TMDB result we keep on the profile. Everything the picks
 * grid renders has to live here — we never re-fetch titles just to draw them.
 */
export const normalizePick = (item, type) => {
  const mediaType = type || (item?.media_type === "tv" ? "tv" : "movie");
  const date = item?.release_date || item?.first_air_date || "";
  return {
    id: Number(item.id),
    type: mediaType,
    title: item.title || item.name || "Untitled",
    poster_path: item.poster_path || null,
    year: date ? String(date).slice(0, 4) : "",
  };
};

export const pickKey = (pick) => `${pick.type}:${pick.id}`;

/** Reads a stored picks map back into the {movies, shows} shape, defensively. */
export const readTastePicks = (data) => {
  const picks = data?.tastePicks || {};
  const clean = (list, type) =>
    (Array.isArray(list) ? list : [])
      .filter((entry) => entry && entry.id)
      .slice(0, MAX_PICKS_PER_TYPE)
      .map((entry) => normalizePick(entry, type));
  return { movies: clean(picks.movies, "movie"), shows: clean(picks.shows, "tv") };
};

export const countPicks = (picks) =>
  (picks?.movies?.length || 0) + (picks?.shows?.length || 0);

// --- Vector maths -----------------------------------------------------------

/** Adds `weight` to `key`, mutating the accumulator. */
const bump = (map, key, weight) => {
  if (key === null || key === undefined || !weight) return;
  const id = String(key);
  map[id] = (map[id] || 0) + weight;
};

/**
 * Trims a raw weight map to its heaviest entries and L2-normalises it, so
 * cosine similarity between two profiles is a plain dot product later on.
 */
const finalize = (map, cap) => {
  const entries = Object.entries(map)
    .filter(([, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, cap);

  const norm = Math.sqrt(entries.reduce((sum, [, weight]) => sum + weight * weight, 0));
  if (!norm) return {};

  return entries.reduce((out, [key, weight]) => {
    out[key] = Math.round((weight / norm) * 10000) / 10000;
    return out;
  }, {});
};

// --- TMDB enrichment --------------------------------------------------------

const decadeOf = (date) => {
  const year = Number(String(date || "").slice(0, 4));
  return year ? String(Math.floor(year / 10) * 10) : null;
};

/**
 * Pulls the facets a pick contributes: genres, themes (TMDB keywords), the
 * people behind it, and its decade. One request per title, thanks to
 * append_to_response.
 */
const fetchFacets = async (pick) => {
  const path = pick.type === "tv" ? `/tv/${pick.id}` : `/movie/${pick.id}`;
  const { data } = await tmdbGet(path, { append_to_response: "keywords,credits" });

  const keywords = data.keywords?.keywords || data.keywords?.results || [];
  const crew = data.credits?.crew || [];
  const cast = data.credits?.cast || [];

  // Directors for film, creators for series — the strongest authorship signal.
  const authorPeople =
    pick.type === "tv"
      ? data.created_by || []
      : crew.filter((member) => member.job === "Director");

  const topKeywords = keywords.slice(0, KEYWORDS_PER_TITLE);
  const topCast = cast.slice(0, CAST_PER_TITLE);

  return {
    genres: (data.genres || []).map((genre) => genre.id),
    keywords: topKeywords.map((keyword) => keyword.id),
    authors: authorPeople.map((person) => person.id),
    cast: topCast.map((member) => member.id),
    decade: decadeOf(data.release_date || data.first_air_date),
    // Labels ride along so match explanations ("both into Christopher Nolan")
    // never need a second round of TMDB lookups at scoring time.
    labels: {
      keywords: Object.fromEntries(topKeywords.map((k) => [String(k.id), k.name])),
      people: Object.fromEntries(
        [...authorPeople, ...topCast].filter((p) => p?.id && p?.name).map((p) => [String(p.id), p.name])
      ),
    },
  };
};

/**
 * Builds the scoring vector for a set of picks.
 *
 * Every pick carries the same total mass regardless of how many genres or
 * keywords TMDB lists for it, so an eight-genre epic cannot outvote a tightly
 * tagged indie. When someone has not filled all eight slots, the leftover mass
 * is covered by `fallbackGenreIds` (the genres they actually watch), which
 * keeps Discover useful before anyone has picked anything.
 */
export const buildTasteProfile = async (picks, { fallbackGenreIds = [] } = {}) => {
  const all = [...(picks.movies || []), ...(picks.shows || [])];
  const settled = await Promise.allSettled(all.map(fetchFacets));

  const genres = {};
  const keywords = {};
  const people = {};
  const decades = {};
  const labels = { keywords: {}, people: {} };

  settled.forEach((result) => {
    if (result.status !== "fulfilled") return;
    const facets = result.value;

    facets.genres.forEach((id) => bump(genres, id, 1 / facets.genres.length));
    facets.keywords.forEach((id) => bump(keywords, id, 1 / facets.keywords.length));
    // Creators count double: sharing a favourite director says more than
    // sharing a supporting actor who turns up in everything.
    facets.authors.forEach((id) => bump(people, id, 2));
    facets.cast.forEach((id) => bump(people, id, 1));
    if (facets.decade) bump(decades, facets.decade, 1);

    Object.assign(labels.keywords, facets.labels.keywords);
    Object.assign(labels.people, facets.labels.people);
  });

  // Sparse profiles lean on watch history to cover the empty slots.
  const filled = Math.min(all.length, TOTAL_PICK_SLOTS);
  const fallbackMass = TOTAL_PICK_SLOTS - filled;
  if (fallbackMass > 0 && fallbackGenreIds.length) {
    const share = (fallbackMass * 0.4) / fallbackGenreIds.length;
    fallbackGenreIds.forEach((id) => bump(genres, id, share));
  }

  const genreVector = finalize(genres, VECTOR_CAP.genres);
  const keywordVector = finalize(keywords, VECTOR_CAP.keywords);
  const peopleVector = finalize(people, VECTOR_CAP.people);

  /** Only keep labels for ids that survived the vector cap. */
  const keepLabels = (source, vector, cap) =>
    Object.keys(vector)
      .slice(0, cap)
      .reduce((out, id) => {
        if (source[id]) out[id] = source[id];
        return out;
      }, {});

  return {
    version: TASTE_PROFILE_VERSION,
    genres: genreVector,
    keywords: keywordVector,
    people: peopleVector,
    decades: finalize(decades, VECTOR_CAP.decades),
    labels: {
      keywords: keepLabels(labels.keywords, keywordVector, LABEL_CAP),
      people: keepLabels(labels.people, peopleVector, LABEL_CAP),
    },
    titles: all.map(pickKey),
    // Denormalised shard key: Firestore has no vector search, so we shortlist
    // candidates with array-contains-any before ranking them properly.
    topGenres: Object.keys(genreVector).slice(0, TOP_GENRE_COUNT),
    pickCount: all.length,
    updatedAt: new Date().toISOString(),
  };
};

// --- Persistence ------------------------------------------------------------

/**
 * Saves picks and the profile derived from them in one write. Returns the
 * profile so callers can refresh local state without a re-read.
 */
export const saveTastePicks = async (uid, picks, options = {}) => {
  const trimmed = {
    movies: (picks.movies || []).slice(0, MAX_PICKS_PER_TYPE),
    shows: (picks.shows || []).slice(0, MAX_PICKS_PER_TYPE),
  };
  const profile = await buildTasteProfile(trimmed, options);

  await setDoc(
    doc(db, "users", uid),
    {
      tastePicks: { ...trimmed, updatedAt: profile.updatedAt },
      tasteProfile: profile,
      hasTastePicks: profile.pickCount > 0,
    },
    { merge: true }
  );

  return profile;
};

/**
 * Mirrors the counts the profile page already computes onto the public user
 * document, so buddies can see someone's stats without read access to their
 * private history, favourites and watchlist documents.
 */
export const savePublicStats = async (uid, stats) => {
  await setDoc(
    doc(db, "users", uid),
    { publicStats: { ...stats, updatedAt: new Date().toISOString() } },
    { merge: true }
  );
};

export const fetchUserTaste = async (uid) => {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return { uid, ...data, tastePicks: readTastePicks(data) };
};
