// lib/tasteMatch.js — scores how well two viewers' taste lines up.
//
// The whole file is pure functions over the profiles built in tasteProfile.js:
// no network, no Firestore. That keeps ranking cheap (a few hundred candidates
// score in a couple of milliseconds) and makes the maths easy to reason about.
//
// How a match is scored
// ---------------------
//  1. Affinity — an IDF-weighted cosine similarity over four facets (genres,
//     themes, people, decades), blended by weight. Facets that either side is
//     missing drop out and their weight is redistributed, so a user whose picks
//     have no TMDB keywords is not quietly penalised.
//  2. Overlap — the share of hand-picked titles the two have in common,
//     weighted by how rare each title is in the pool.
//  3. Combination — `affinity + (1 - affinity) * overlap`. Shared picks pull a
//     pair toward a perfect match from wherever affinity left them: they can
//     only ever help, and the effect saturates instead of running away.
//  4. Confidence — a pair where one side has filled two of eight slots is
//     guessing, so the score is damped toward the middle.
//  5. Social — a small nudge for mutual buddies, applied last.
//
// Why IDF matters here: almost everyone picks a Drama and almost everyone has
// Christopher Nolan somewhere. Weighting every shared trait by how rare it is
// in the current pool means matches are driven by what actually distinguishes
// two people, not by what everyone has in common.
import { TOTAL_PICK_SLOTS, genreName } from "./tasteProfile";

/** Relative pull of each facet before missing-facet redistribution. */
export const FACET_WEIGHTS = {
  genres: 0.46,
  keywords: 0.24,
  people: 0.18,
  decades: 0.12,
};

/** How much of the final score mutual buddies can account for. */
const SOCIAL_WEIGHT = 0.06;

/** Mutual buddies needed for the full social nudge. */
const SOCIAL_SATURATION = 3;

/** Below this, a match is too thin to show. */
export const MIN_MATCH_SCORE = 0.28;

const MATCH_TIERS = [
  { min: 0.85, label: "Uncanny match", tone: "accent" },
  { min: 0.7, label: "Strong match", tone: "accent" },
  { min: 0.55, label: "Good match", tone: "positive" },
  { min: 0.4, label: "Some overlap", tone: "neutral" },
  { min: 0, label: "Loose match", tone: "neutral" },
];

export const tierFor = (score) => MATCH_TIERS.find((tier) => score >= tier.min);

const clamp01 = (value) => Math.min(1, Math.max(0, value));

// --- Inverse document frequency --------------------------------------------

/**
 * Counts how many profiles in the pool mention each key, then turns that into
 * a rarity weight. `pick` pulls the keys out of one profile.
 */
const idfOver = (profiles, pick) => {
  const total = profiles.length || 1;
  const documentFrequency = new Map();

  profiles.forEach((profile) => {
    const keys = pick(profile);
    if (!keys) return;
    new Set(keys).forEach((key) => {
      documentFrequency.set(key, (documentFrequency.get(key) || 0) + 1);
    });
  });

  const weights = new Map();
  documentFrequency.forEach((frequency, key) => {
    weights.set(key, Math.log(1 + total / (1 + frequency)));
  });
  return weights;
};

/**
 * Builds every rarity table the scorer needs from the candidate pool itself.
 * Using the live pool rather than a maintained global index means no extra
 * writes, and the weights always describe the population being ranked.
 */
export const buildIdf = (profiles) => ({
  genres: idfOver(profiles, (profile) => Object.keys(profile?.genres || {})),
  keywords: idfOver(profiles, (profile) => Object.keys(profile?.keywords || {})),
  people: idfOver(profiles, (profile) => Object.keys(profile?.people || {})),
  decades: idfOver(profiles, (profile) => Object.keys(profile?.decades || {})),
  titles: idfOver(profiles, (profile) => profile?.titles || []),
});

/** Rarity of a key, defaulting to a neutral 1 for anything unseen. */
const rarity = (table, key) => (table?.has(key) ? table.get(key) : 1);

// --- Similarity -------------------------------------------------------------

/**
 * Cosine similarity between two sparse weight maps, with each dimension scaled
 * by its rarity. Re-normalising inside the function is required: applying IDF
 * to vectors that were stored unit-length makes them non-unit again.
 */
export const weightedCosine = (a, b, table) => {
  const left = a || {};
  const right = b || {};
  const keys = Object.keys(left);
  if (!keys.length || !Object.keys(right).length) return 0;

  let product = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  keys.forEach((key) => {
    const weight = rarity(table, key);
    leftNorm += (left[key] * weight) ** 2;
    if (right[key]) product += left[key] * right[key] * weight * weight;
  });

  Object.keys(right).forEach((key) => {
    const weight = rarity(table, key);
    rightNorm += (right[key] * weight) ** 2;
  });

  if (!leftNorm || !rightNorm) return 0;
  return clamp01(product / Math.sqrt(leftNorm * rightNorm));
};

/**
 * The dimensions two profiles genuinely share, heaviest first. Used both to
 * explain a match and to decide which traits to surface in the UI.
 */
const sharedDimensions = (a = {}, b = {}, table, limit = 4) =>
  Object.keys(a)
    .filter((key) => b[key])
    .map((key) => ({ key, weight: a[key] * b[key] * rarity(table, key) }))
    .sort((first, second) => second.weight - first.weight)
    .slice(0, limit);

/**
 * Share of hand-picked titles in common, weighted by how rare each pick is.
 * Dividing by the smaller side's mass keeps it symmetric and lets a user with
 * three picks still reach 1.0 when all three are shared.
 */
const titleOverlap = (a = [], b = [], table) => {
  if (!a.length || !b.length) return { ratio: 0, shared: [] };

  const others = new Set(b);
  const shared = a.filter((key) => others.has(key));
  if (!shared.length) return { ratio: 0, shared: [] };

  const mass = (keys) => keys.reduce((sum, key) => sum + rarity(table, key), 0);
  const floor = Math.min(mass(a), mass(b));
  return { ratio: floor ? clamp01(mass(shared) / floor) : 0, shared };
};

/**
 * Someone with two picks has told us far less than someone with eight, so
 * their scores are pulled toward the middle rather than trusted outright.
 */
const confidenceOf = (count) =>
  0.45 + 0.55 * (Math.min(count || 0, TOTAL_PICK_SLOTS) / TOTAL_PICK_SLOTS);

// --- Scoring ----------------------------------------------------------------

/**
 * Scores one pair and explains the result.
 *
 * `mine` and `theirs` are taste profiles; `idf` comes from `buildIdf`.
 * Returns the score, a percentage for display, the tier label, the titles they
 * both picked, and ready-to-render reasons.
 */
export const scoreMatch = (mine, theirs, { idf, mutualCount = 0 } = {}) => {
  const facets = {
    genres: weightedCosine(mine.genres, theirs.genres, idf?.genres),
    keywords: weightedCosine(mine.keywords, theirs.keywords, idf?.keywords),
    people: weightedCosine(mine.people, theirs.people, idf?.people),
    decades: weightedCosine(mine.decades, theirs.decades, idf?.decades),
  };

  // Redistribute the weight of any facet neither side can speak to.
  const active = Object.keys(FACET_WEIGHTS).filter(
    (facet) => Object.keys(mine[facet] || {}).length && Object.keys(theirs[facet] || {}).length
  );
  const activeWeight = active.reduce((sum, facet) => sum + FACET_WEIGHTS[facet], 0);
  const affinity = activeWeight
    ? active.reduce((sum, facet) => sum + (FACET_WEIGHTS[facet] / activeWeight) * facets[facet], 0)
    : 0;

  const overlap = titleOverlap(mine.titles, theirs.titles, idf?.titles);

  // Shared picks lift the pair toward a perfect match from wherever affinity
  // put them — additive would let a single shared blockbuster dominate.
  const core = affinity + (1 - affinity) * overlap.ratio;

  const confidence = confidenceOf(mine.pickCount) * confidenceOf(theirs.pickCount);
  const social = Math.min(1, mutualCount / SOCIAL_SATURATION);
  const score = clamp01(core * confidence * (1 - SOCIAL_WEIGHT) + social * SOCIAL_WEIGHT);

  return {
    score,
    percent: Math.round(score * 100),
    tier: tierFor(score),
    facets,
    affinity,
    sharedTitleKeys: overlap.shared,
    sharedGenres: sharedDimensions(mine.genres, theirs.genres, idf?.genres, 3)
      .map((entry) => genreName(entry.key))
      .filter(Boolean),
    sharedPeople: sharedDimensions(mine.people, theirs.people, idf?.people, 3)
      .map((entry) => theirs.labels?.people?.[entry.key] || mine.labels?.people?.[entry.key])
      .filter(Boolean),
    sharedThemes: sharedDimensions(mine.keywords, theirs.keywords, idf?.keywords, 3)
      .map((entry) => theirs.labels?.keywords?.[entry.key] || mine.labels?.keywords?.[entry.key])
      .filter(Boolean),
    sharedDecades: sharedDimensions(mine.decades, theirs.decades, idf?.decades, 1).map(
      (entry) => entry.key
    ),
    mutualCount,
  };
};

/** Sentence fragments a card can show under a match, best signal first. */
export const explainMatch = (match, { sharedTitles = [] } = {}) => {
  const reasons = [];

  if (sharedTitles.length) {
    const names = sharedTitles.slice(0, 2).map((pick) => pick.title);
    const extra = sharedTitles.length - names.length;
    reasons.push({
      kind: "titles",
      text: `Both picked ${names.join(" and ")}${extra > 0 ? ` +${extra} more` : ""}`,
    });
  }
  if (match.sharedPeople.length) {
    reasons.push({ kind: "people", text: `Both into ${match.sharedPeople.slice(0, 2).join(" and ")}` });
  }
  if (match.sharedGenres.length) {
    reasons.push({ kind: "genres", text: match.sharedGenres.slice(0, 3).join(" · ") });
  }
  if (match.sharedThemes.length) {
    reasons.push({ kind: "themes", text: match.sharedThemes.slice(0, 2).join(" · ") });
  }
  if (match.mutualCount > 0) {
    reasons.push({
      kind: "social",
      text: `${match.mutualCount} mutual ${match.mutualCount === 1 ? "buddy" : "buddies"}`,
    });
  }
  if (match.sharedDecades.length && reasons.length < 2) {
    reasons.push({ kind: "era", text: `Both drawn to the ${match.sharedDecades[0]}s` });
  }

  return reasons;
};

/**
 * Ranks a pool of candidates against the signed-in user.
 *
 * `candidates` are user documents carrying a `tasteProfile`. `excludeIds` drops
 * existing buddies and anyone with a request already in flight. `mutualCounts`
 * is optional — the caller can rank once without it to get a shortlist, then
 * re-rank the shortlist once mutual-buddy counts have been fetched.
 */
export const rankMatches = (
  me,
  candidates,
  { excludeIds = new Set(), mutualCounts = {}, minScore = MIN_MATCH_SCORE, limit = 40 } = {}
) => {
  const mine = me?.tasteProfile;
  if (!mine) return [];

  const pool = candidates.filter(
    (candidate) =>
      candidate.uid && candidate.uid !== me.uid && !excludeIds.has(candidate.uid) && candidate.tasteProfile
  );

  const idf = buildIdf([mine, ...pool.map((candidate) => candidate.tasteProfile)]);
  const myPicksByKey = new Map(
    [...(me.tastePicks?.movies || []), ...(me.tastePicks?.shows || [])].map((pick) => [
      `${pick.type}:${pick.id}`,
      pick,
    ])
  );

  return pool
    .map((candidate) => {
      const match = scoreMatch(mine, candidate.tasteProfile, {
        idf,
        mutualCount: mutualCounts[candidate.uid] || 0,
      });
      const sharedTitles = match.sharedTitleKeys
        .map((key) => myPicksByKey.get(key))
        .filter(Boolean);

      return {
        user: candidate,
        ...match,
        sharedTitles,
        reasons: explainMatch(match, { sharedTitles }),
      };
    })
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score || b.affinity - a.affinity)
    .slice(0, limit);
};
