/**
 * lib/assistant.js — the client half of the "what should I watch" assistant.
 *
 * Three jobs live here:
 *   - identity: the name and copy every surface uses, in one place;
 *   - context: a compact picture of the viewer (history, favourites, taste
 *     picks, ratings, on-device viewing habits) that rides along with every
 *     message so the model can reason about *this* person;
 *   - memory: the conversation itself, kept in Firestore so it is still there
 *     on the next visit and on another device.
 *
 * The model call itself happens in pages/api/assistant/chat.js — the API key
 * never reaches the browser.
 */
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { GENRE_MAP } from "./tmdb";
import { getContinueWatching, getRecentSearches } from "./localStore";
import { readTastePicks } from "./tasteProfile";
import { summarizeWatchStats } from "./watchStats";

/** One constant to rename the assistant everywhere. */
export const ASSISTANT_NAME = "Cue";
export const ASSISTANT_TAGLINE = "Tell me the mood. I'll cue something up.";

/** Conversation openers shown while the chat is empty. */
export const ASSISTANT_PROMPTS = [
  "Something short for tonight",
  "More like the last thing I watched",
  "A series I can binge this weekend",
  "Feel-good, nothing heavy",
  "Surprise me",
];

/** Messages kept in the stored conversation and sent as model context. */
export const MAX_STORED_MESSAGES = 40;
export const MAX_CONTEXT_MESSAGES = 10;

const CHAT_COLLECTION = "assistantChats";

const RECENT_MOVIES = 15;
const RECENT_SHOWS = 10;
const LIST_CAP = 10;

/** Newest entry per key, most recent first. */
const latestBy = (entries, keyOf) => {
  const map = new Map();
  (entries || []).forEach((entry) => {
    if (!entry) return;
    const key = keyOf(entry);
    const existing = map.get(key);
    if (!existing || new Date(entry.watchedAt || 0) > new Date(existing.watchedAt || 0)) {
      map.set(key, entry);
    }
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.watchedAt || 0) - new Date(a.watchedAt || 0)
  );
};

const daysAgo = (iso) => {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days < 1 ? "today" : days === 1 ? "yesterday" : `${days}d ago`;
};

const safeGet = async (collection, uid) => {
  try {
    const snapshot = await getDoc(doc(db, collection, uid));
    return snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    console.error(`Assistant could not read ${collection}:`, error);
    return null;
  }
};

/**
 * Everything the model may know about the viewer, trimmed to what fits in a
 * prompt. Returns plain data — the server turns it into text.
 */
export const buildViewerContext = async (uid) => {
  const [history, favorites, watchlist, userDoc, ratings] = await Promise.all([
    safeGet("history", uid),
    safeGet("favorites", uid),
    safeGet("watchlists", uid),
    safeGet("users", uid),
    safeGet("ratings", uid),
  ]);

  const movies = latestBy(history?.movies, (entry) => entry.id);
  const episodes = latestBy(history?.episodes, (entry) => entry.tvShowId);

  const movieTitleById = new Map(movies.map((entry) => [entry.id, entry.title]));
  const showTitleById = new Map(episodes.map((entry) => [entry.tvShowId, entry.tvShowName]));

  const ratedMovies = (ratings?.ratings || [])
    .filter((entry) => entry?.movieId && entry?.rating)
    .map((entry) => ({ title: movieTitleById.get(entry.movieId) || `movie #${entry.movieId}`, rating: entry.rating }));
  const ratedShows = (ratings?.episodes || [])
    .filter((entry) => entry?.tvShowId && entry?.rating)
    .map((entry) => ({ title: showTitleById.get(entry.tvShowId) || `series #${entry.tvShowId}`, rating: entry.rating }));
  const rated = [...ratedMovies, ...ratedShows];

  const picks = readTastePicks(userDoc);
  const profile = userDoc?.tasteProfile || null;
  const topGenres = profile?.genres
    ? Object.keys(profile.genres).map((id) => GENRE_MAP[Number(id)]).filter(Boolean).slice(0, 6)
    : [];
  const favouritePeople = profile?.labels?.people ? Object.values(profile.labels.people).slice(0, 8) : [];
  const themes = profile?.labels?.keywords ? Object.values(profile.labels.keywords).slice(0, 10) : [];

  const seen = new Set([
    ...movies.map((entry) => `movie:${entry.id}`),
    ...episodes.map((entry) => `tv:${entry.tvShowId}`),
  ]);

  const now = new Date();

  return {
    username: userDoc?.username || null,
    localTime: now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    weekday: now.toLocaleDateString([], { weekday: "long" }),
    recentMovies: movies.slice(0, RECENT_MOVIES).map((entry) => `${entry.title} (${daysAgo(entry.watchedAt)})`),
    recentShows: episodes
      .slice(0, RECENT_SHOWS)
      .map((entry) => `${entry.tvShowName} — S${entry.seasonNumber}E${entry.episodeNumber} (${daysAgo(entry.watchedAt)})`),
    favoriteMovies: (favorites?.movies || []).slice(-LIST_CAP).map((entry) => entry.title).filter(Boolean),
    favoriteShows: (favorites?.episodes || []).slice(-LIST_CAP).map((entry) => entry.tvShowName).filter(Boolean),
    watchlist: (watchlist?.items || [])
      .slice(-LIST_CAP)
      .map((entry) => `${entry.title || entry.name}${entry.media_type === "tv" ? " (series)" : ""}`)
      .filter(Boolean),
    tastePicks: {
      movies: picks.movies.map((pick) => `${pick.title}${pick.year ? ` (${pick.year})` : ""}`),
      shows: picks.shows.map((pick) => `${pick.title}${pick.year ? ` (${pick.year})` : ""}`),
    },
    topGenres,
    favouritePeople,
    themes,
    loved: rated.filter((entry) => entry.rating >= 8).slice(0, 8).map((entry) => `${entry.title} (${entry.rating}/10)`),
    disliked: rated.filter((entry) => entry.rating <= 4).slice(0, 6).map((entry) => `${entry.title} (${entry.rating}/10)`),
    continueWatching: getContinueWatching()
      .slice(0, 6)
      .map((entry) => `${entry.title}${entry.media_type === "tv" ? ` (S${entry.season}E${entry.episode})` : ""}`),
    recentSearches: getRecentSearches().slice(0, 6).map((entry) => entry.query),
    habits: summarizeWatchStats(),
    // Titles to keep out of the suggestions; resolved ids, not names.
    seen: Array.from(seen),
  };
};

/* ---------------------------------- Memory --------------------------------- */

const cleanMessage = (message) => ({
  role: message.role === "assistant" ? "assistant" : "user",
  content: String(message.content || "").slice(0, 4000),
  at: message.at || new Date().toISOString(),
  ...(Array.isArray(message.picks) && message.picks.length ? { picks: message.picks } : {}),
});

export const loadConversation = async (uid) => {
  const data = await safeGet(CHAT_COLLECTION, uid);
  const messages = Array.isArray(data?.messages) ? data.messages : [];
  return messages.filter((message) => message?.content).map(cleanMessage);
};

export const saveConversation = async (uid, messages) => {
  const trimmed = messages.map(cleanMessage).slice(-MAX_STORED_MESSAGES);
  try {
    await setDoc(
      doc(db, CHAT_COLLECTION, uid),
      { messages: trimmed, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (error) {
    console.error("Assistant could not save the conversation:", error);
  }
  return trimmed;
};

export const clearConversation = async (uid) => {
  try {
    await setDoc(doc(db, CHAT_COLLECTION, uid), { messages: [], updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Assistant could not clear the conversation:", error);
  }
};

/* ----------------------------------- API ----------------------------------- */

/**
 * Sends the conversation to the server. `messages` is the full thread; only
 * the recent tail goes over the wire.
 */
export const askAssistant = async ({ user, messages, context }) => {
  const idToken = await user.getIdToken();
  const response = await fetch("/api/assistant/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      name: ASSISTANT_NAME,
      messages: messages.slice(-MAX_CONTEXT_MESSAGES).map(({ role, content }) => ({ role, content })),
      context,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error || "The assistant is unavailable right now.");
    error.status = response.status;
    throw error;
  }
  return payload;
};
