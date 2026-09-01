// lib/buddyDiscovery.js — turns "who should I watch with?" into Firestore
// queries plus a ranking pass.
//
// Firestore cannot rank by similarity, so discovery is the classic two stage
// shape: cheaply shortlist plausible people with an indexed query, then score
// the shortlist properly in memory with lib/tasteMatch.
import { collection, doc, getDoc, getDocs, limit as fsLimit, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { readTastePicks } from "./tasteProfile";
import { rankMatches } from "./tasteMatch";

/** Ceiling on how many users we score in one run. */
const POOL_LIMIT = 150;

/** How many top matches get the extra mutual-buddy lookup. */
const SOCIAL_SHORTLIST = 24;

/** Firestore allows at most 30 values in an array-contains-any clause. */
const MAX_CONTAINS_ANY = 10;

const toCandidate = (snapshot) => {
  const data = snapshot.data();
  return { uid: snapshot.id, ...data, tastePicks: readTastePicks(data) };
};

/**
 * Stage one. People whose top genres overlap mine are the only ones with a
 * realistic shot at a good score, so shard on that first; a recency query then
 * tops the pool up so newcomers and unusual taste are not invisible.
 */
const fetchPool = async (myTopGenres) => {
  const found = new Map();

  const run = async (constraints) => {
    try {
      const snapshot = await getDocs(query(collection(db, "users"), ...constraints));
      snapshot.docs.forEach((docSnap) => {
        if (!found.has(docSnap.id)) found.set(docSnap.id, toCandidate(docSnap));
      });
    } catch (error) {
      console.error("Buddy discovery query failed:", error);
    }
  };

  if (myTopGenres.length) {
    await run([
      where("tasteProfile.topGenres", "array-contains-any", myTopGenres.slice(0, MAX_CONTAINS_ANY)),
      fsLimit(POOL_LIMIT),
    ]);
  }

  if (found.size < POOL_LIMIT) {
    await run([where("hasTastePicks", "==", true), fsLimit(POOL_LIMIT - found.size)]);
  }

  return Array.from(found.values());
};

/**
 * Mutual buddy counts for a shortlist. Reads are bounded and each failure is
 * absorbed — a locked-down friends document should cost a social nudge, not
 * the whole Discover tab.
 */
const fetchMutualCounts = async (uids, myFriendIds) => {
  if (!myFriendIds.size) return {};

  const entries = await Promise.all(
    uids.map(async (uid) => {
      try {
        const snapshot = await getDoc(doc(db, "friends", uid));
        const theirs = snapshot.exists() ? snapshot.data().friends || [] : [];
        return [uid, theirs.filter((id) => myFriendIds.has(id)).length];
      } catch {
        return [uid, 0];
      }
    })
  );

  return Object.fromEntries(entries);
};

/**
 * Ranked taste matches for the signed-in user.
 *
 * Ranking runs twice on purpose: the first pass is taste-only and picks the
 * shortlist worth spending reads on, the second folds in mutual buddies for
 * just those people. Scoring is cheap; Firestore reads are not.
 */
export const discoverBuddies = async (me, { excludeIds = new Set(), limit = 30 } = {}) => {
  if (!me?.tasteProfile) return { matches: [], needsPicks: true, poolSize: 0 };

  const pool = await fetchPool(me.tasteProfile.topGenres || []);
  const firstPass = rankMatches(me, pool, { excludeIds, limit: SOCIAL_SHORTLIST });

  if (!firstPass.length) {
    return { matches: [], needsPicks: false, poolSize: pool.length };
  }

  const myFriendIds = new Set(me.friendIds || []);
  const mutualCounts = await fetchMutualCounts(
    firstPass.map((entry) => entry.user.uid),
    myFriendIds
  );

  const shortlist = firstPass.map((entry) => entry.user);
  const matches = rankMatches(me, shortlist, { excludeIds, mutualCounts, limit });

  return { matches, needsPicks: false, poolSize: pool.length };
};

/**
 * Everything the buddy profile modal shows. Picks and public stats already
 * live on the user document, so this is a single read.
 */
export const fetchBuddyProfile = async (uid) => {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  return toCandidate(snapshot);
};

export { POOL_LIMIT, SOCIAL_SHORTLIST };
