/**
 * pages/api/assistant/chat.js — the assistant's only server-side piece.
 *
 * The browser sends the recent conversation plus a viewer context it built
 * from its own Firestore documents; this route:
 *
 *   1. checks the Firebase ID token so only signed-in accounts can spend the
 *      (free, rate-limited) model quota;
 *   2. asks an OpenAI-compatible chat endpoint — OpenRouter's `:free` models
 *      by default — for a JSON answer, walking down a fallback list when a
 *      free model is rate-limited or has gone away;
 *   3. resolves every suggested title against TMDB, so what goes back is a
 *      real id, poster and watch route rather than a name to search for.
 *
 * Configuration (all optional except the key):
 *   OPENROUTER_API_KEY   or AI_API_KEY — the provider key.
 *   AI_BASE_URL          defaults to https://openrouter.ai/api/v1. Any
 *                        OpenAI-compatible gateway works (e.g. Experiential
 *                        Labs: https://api.experientiallabs.ai/v1).
 *   AI_MODELS            comma-separated model ids, tried in order.
 */

const BASE_URL = (process.env.AI_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
const API_KEY = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || "";
// Same key the browser uses (lib/tmdb.js); `API_KEY` in this project is not
// a TMDB key, so it is deliberately not consulted.
const TMDB_KEY = process.env.NEXT_PUBLIC_API_KEY || process.env.TMDB_API_KEY || "";
const FIREBASE_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";

/**
 * OpenRouter's free tier changes month to month. Strong general chat models
 * first; `openrouter/free` at the end routes to whatever is free that day.
 */
const DEFAULT_MODELS = [
  // Reliable JSON in strict mode, and rarely rate-limited (Sept 2026).
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "qwen/qwen3.8-27b:free",
  "openrouter/free",
];

const MODELS = (process.env.AI_MODELS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const MODEL_TIMEOUT_MS = 45 * 1000;
/** Generous: some free models spend tokens thinking even when asked not to. */
const MAX_OUTPUT_TOKENS = 1800;
const MAX_PICKS = 5;
const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 2000;

/** Per-account throttle. In-memory, so it is per instance — a soft cap. */
const RATE_LIMIT = { max: 30, windowMs: 60 * 60 * 1000 };
const usage = new Map();

const throttled = (uid) => {
  const now = Date.now();
  const recent = (usage.get(uid) || []).filter((at) => now - at < RATE_LIMIT.windowMs);
  if (recent.length >= RATE_LIMIT.max) {
    usage.set(uid, recent);
    return true;
  }
  recent.push(now);
  usage.set(uid, recent);
  return false;
};

/* --------------------------------- Auth ----------------------------------- */

/** Validates a Firebase ID token with the Identity Toolkit REST API. */
const verifyUser = async (authorization) => {
  const token = (authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token || !FIREBASE_KEY) return null;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    }
  );
  if (!response.ok) return null;
  const data = await response.json();
  const account = data?.users?.[0];
  return account?.localId ? { uid: account.localId, email: account.email || null } : null;
};

/* -------------------------------- Prompt ---------------------------------- */

const list = (label, items) =>
  Array.isArray(items) && items.length ? `${label}: ${items.join("; ")}` : null;

const describeHabits = (habits) => {
  if (!habits) return "Viewing habits: nothing measured on this device yet.";
  const lines = [
    habits.preferredLength && `Runtime they tend to finish: ${habits.preferredLength}`,
    habits.medianSittingMin && `Typical sitting: about ${habits.medianSittingMin} min (longest ${habits.longestSittingMin} min)`,
    habits.finishRate !== null && habits.finishRate !== undefined && `Finish rate: ${habits.finishRate}% of titles watched to the end`,
    habits.episodesPerSitting && `Episodes per sitting: ~${habits.episodesPerSitting}`,
    habits.usualTime && `Usually watches in the ${habits.usualTime}`,
    list("Finished recently", habits.finishedRecently),
    list("Abandoned early", habits.abandoned),
    list("Series in progress", habits.stillWatching),
  ].filter(Boolean);
  return `Viewing habits (measured on their device):\n- ${lines.join("\n- ")}`;
};

const describeViewer = (context = {}) => {
  const lines = [
    context.username && `Name: ${context.username}`,
    `Local time: ${context.localTime || "unknown"}, ${context.weekday || ""}`.trim(),
    list("Watched recently (films)", context.recentMovies),
    list("Watched recently (series)", context.recentShows),
    list("Continue watching", context.continueWatching),
    list("Favourite films", context.favoriteMovies),
    list("Favourite series", context.favoriteShows),
    list("Watchlist (saved, not watched yet)", context.watchlist),
    list("Taste picks — films that define them", context.tastePicks?.movies),
    list("Taste picks — series that define them", context.tastePicks?.shows),
    list("Top genres", context.topGenres),
    list("Filmmakers and actors they gravitate to", context.favouritePeople),
    list("Recurring themes", context.themes),
    list("Rated highly", context.loved),
    list("Rated poorly", context.disliked),
    list("Recent searches", context.recentSearches),
  ].filter(Boolean);
  return `About the viewer:\n- ${lines.join("\n- ")}\n\n${describeHabits(context.habits)}`;
};

const systemPrompt = (name, context) => `You are ${name}, the recommendation assistant inside StreamSynx, a site for watching films and TV series. You help one signed-in viewer decide what to watch next.

How to behave:
- Be warm, brief and specific. One or two short sentences of reply, then the picks. No lists of caveats.
- Recommend 3 to ${MAX_PICKS} real, well-known films or series that fit the request AND the viewer's history, favourites and habits below. Prefer titles they have not watched. If they ask for "more like X", lean on X.
- Size to their attention: if their habits show short sittings or a low finish rate, favour tighter runtimes or episodic series; if they binge, a series is fair game. Mention this only when it drives the choice.
- If the request is vague, still commit to picks and say what you assumed. Only ask a question when it is genuinely impossible to choose.
- Never invent titles. Use exact, searchable titles and the correct release year.
- If the message is not about what to watch, answer in one line and steer back to picks.

Output format — reply with ONLY this JSON object, no markdown fences, no text before or after. Do not narrate or think out loud; the first character of your output must be "{":
{"reply": "your short message to the viewer", "picks": [{"title": "Exact title", "year": 2014, "type": "movie" | "tv", "why": "one sentence tying it to them"}]}

${describeViewer(context)}`;

/* -------------------------------- Model ----------------------------------- */

const extractJson = (text) => {
  if (!text) return null;
  const cleaned = String(text)
    // Reasoning models sometimes think out loud in the content itself.
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
};

/**
 * One request to one model. `strict` asks for JSON mode and switches any
 * built-in reasoning off — a thinking model that narrates for 900 tokens
 * never gets to the JSON. Gateways that reject those fields answer 400, and
 * the caller retries the same model without them.
 */
const callModel = async (model, messages, origin, { strict = true } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        // OpenRouter attribution headers; harmless on other gateways.
        "HTTP-Referer": origin,
        "X-Title": "StreamSynx",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: MAX_OUTPUT_TOKENS,
        ...(strict
          ? { response_format: { type: "json_object" }, reasoning: { enabled: false, exclude: true } }
          : {}),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.error?.message || `${model} answered ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const choice = payload?.choices?.[0];
    const text = choice?.message?.content;
    if (!text) throw new Error(`${model} returned an empty answer`);
    return { text, model: payload?.model || model, finishReason: choice?.finish_reason || null };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Walks the model list until one returns an answer we can parse. A rate
 * limit, an outage, or a model that talks instead of answering all just
 * mean "next", so a busy free tier degrades to a slower model, not to an
 * error — and never to raw model output on the screen.
 */
const complete = async (messages, origin) => {
  const models = MODELS.length ? MODELS : DEFAULT_MODELS;
  let lastError = null;
  for (const model of models) {
    try {
      let answer;
      try {
        answer = await callModel(model, messages, origin, { strict: true });
      } catch (error) {
        if (error.status !== 400) throw error;
        answer = await callModel(model, messages, origin, { strict: false });
      }

      const parsed = extractJson(answer.text);
      if (!parsed || typeof parsed.reply !== "string") {
        throw new Error(
          answer.finishReason === "length"
            ? `${model} ran out of tokens before the JSON`
            : `${model} did not return JSON`
        );
      }
      return { parsed, model: answer.model };
    } catch (error) {
      lastError = error;
      console.warn(`Assistant: ${model} failed —`, error.message);
      // A bad key fails the same way on every model.
      if (error.status === 401) break;
    }
  }
  throw lastError || new Error("No model answered");
};

/* --------------------------------- TMDB ----------------------------------- */

const tmdb = async (path, params) => {
  const query = new URLSearchParams({ api_key: TMDB_KEY, language: "en-US", ...params });
  const response = await fetch(`https://api.themoviedb.org/3${path}?${query}`);
  if (!response.ok) {
    // Loud, because a bad key silently turns every answer into "no picks".
    console.warn(`Assistant: TMDB ${path} answered ${response.status}`);
    return null;
  }
  return response.json();
};

/** Models say "series", "show" or "film" as often as "tv" / "movie". */
const mediaTypeOf = (value) =>
  /^(tv|series|show|season)/i.test(String(value || "")) ? "tv" : "movie";

/** What goes back when a title cannot be matched: still a name to click on. */
const unresolvedPick = (pick, type) => ({
  id: null,
  media_type: type,
  title: String(pick?.title || pick?.name || "").trim(),
  year: Number(pick?.year) ? String(Number(pick.year)) : "",
  poster_path: null,
  vote_average: 0,
  genre_ids: [],
  overview: "",
  why: String(pick?.why || "").slice(0, 240),
});

/** Finds the TMDB record for a suggested title; the year narrows, then relaxes. */
const resolvePick = async (pick) => {
  const title = String(pick?.title || pick?.name || "").trim();
  if (!title) return null;
  const type = mediaTypeOf(pick?.type);
  const year = Number(pick?.year) || null;
  const yearParam = type === "tv" ? "first_air_date_year" : "year";

  const attempts = year ? [{ query: title, [yearParam]: year }, { query: title }] : [{ query: title }];
  for (const params of attempts) {
    const data = await tmdb(`/search/${type}`, params);
    const hit = (data?.results || []).find((item) => item.poster_path) || data?.results?.[0];
    if (hit) {
      const date = hit.release_date || hit.first_air_date || "";
      return {
        id: hit.id,
        media_type: type,
        title: hit.title || hit.name || title,
        year: date ? date.slice(0, 4) : year ? String(year) : "",
        poster_path: hit.poster_path || null,
        vote_average: hit.vote_average || 0,
        genre_ids: hit.genre_ids || [],
        overview: hit.overview || "",
        why: String(pick?.why || "").slice(0, 240),
      };
    }
  }
  return unresolvedPick(pick, type);
};

/* -------------------------------- Handler --------------------------------- */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!API_KEY) {
    res.status(503).json({ error: "The assistant is not configured yet (missing OPENROUTER_API_KEY)." });
    return;
  }

  const user = await verifyUser(req.headers.authorization).catch(() => null);
  if (!user) {
    res.status(401).json({ error: "Sign in to use the assistant." });
    return;
  }
  if (throttled(user.uid)) {
    res.status(429).json({ error: "That's a lot of asks — give it a little while and try again." });
    return;
  }

  const body = req.body || {};
  const name = String(body.name || "Cue").slice(0, 40);
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((message) => message && typeof message.content === "string" && message.content.trim())
    .slice(-MAX_MESSAGES)
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content.trim().slice(0, MAX_MESSAGE_CHARS),
    }));

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    res.status(400).json({ error: "Say something first." });
    return;
  }

  const context = body.context && typeof body.context === "object" ? body.context : {};
  const origin = req.headers.origin || `https://${req.headers.host || "streamsynx.app"}`;

  let answer;
  try {
    answer = await complete([{ role: "system", content: systemPrompt(name, context) }, ...messages], origin);
  } catch (error) {
    console.error("Assistant: every model failed —", error);
    const status = error.status === 429 ? 429 : 502;
    res.status(status).json({
      error:
        status === 429
          ? "The free models are busy right now. Try again in a minute."
          : "I couldn't get a clean answer just now. Try again, or rephrase.",
    });
    return;
  }

  const { parsed } = answer;
  const reply = String(parsed.reply || "Here's what I'd go with.").trim().slice(0, 1200);
  const rawPicks = Array.isArray(parsed.picks) ? parsed.picks.slice(0, MAX_PICKS + 2) : [];

  const seen = new Set(Array.isArray(context.seen) ? context.seen : []);
  const resolved = await Promise.all(
    rawPicks.map((pick) =>
      TMDB_KEY
        ? resolvePick(pick).catch(() => unresolvedPick(pick, mediaTypeOf(pick?.type)))
        : unresolvedPick(pick, mediaTypeOf(pick?.type))
    )
  );

  const picks = [];
  const used = new Set();
  resolved.forEach((pick) => {
    if (!pick?.title) return;
    const key = pick.id ? `${pick.media_type}:${pick.id}` : `name:${pick.title.toLowerCase()}`;
    if (used.has(key) || seen.has(key)) return;
    used.add(key);
    picks.push(pick);
  });

  res.status(200).json({ reply, picks: picks.slice(0, MAX_PICKS), model: answer.model });
}
