// lib/watchlist.js — one shared, cached view of the signed-in user's watchlist.
//
// Every poster card used to run its own getDoc("watchlists/<uid>"), so a grid of
// 24 results meant 24 identical reads. This keeps a single copy in memory, loads
// it once per user, and re-renders every subscriber together when an item moves
// in or out — so a title saved from the search palette instantly shows as saved
// on the card behind it.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/router";
import { arrayUnion, doc, getDoc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "../firebase";
import { loginHref, useAuth } from "./auth";
import { mediaTypeOf } from "./tmdb";

const EMPTY = { uid: null, items: [], loading: false };

let state = EMPTY;
const listeners = new Set();

const setState = (next) => {
  state = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;
const getServerSnapshot = () => EMPTY;

/** Fetches the watchlist once per user; later calls for the same uid are no-ops. */
function load(uid) {
  if (!uid) {
    if (state !== EMPTY) setState(EMPTY);
    return;
  }
  if (state.uid === uid) return;

  setState({ uid, items: [], loading: true });

  getDoc(doc(db, "watchlists", uid))
    .then((snapshot) => {
      if (state.uid !== uid) return;
      setState({
        uid,
        items: snapshot.exists() ? snapshot.data()?.items || [] : [],
        loading: false,
      });
    })
    .catch((error) => {
      console.error("Error loading watchlist:", error);
      if (state.uid === uid) setState({ uid, items: [], loading: false });
    });
}

const sameTitle = (a, b) => a.id === b.id && a.media_type === b.media_type;

/** The minimal record we persist: enough for the watchlist page to render a card. */
const entryFor = (media) => ({
  id: media.id,
  media_type: mediaTypeOf(media),
  ...(media.title ? { title: media.title } : {}),
  ...(media.name ? { name: media.name } : {}),
  ...(media.poster_path ? { poster_path: media.poster_path } : {}),
});

export function useWatchlist() {
  const { user } = useAuth();
  const router = useRouter();
  const uid = user?.uid || null;

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    load(uid);
  }, [uid]);

  const items = snapshot.uid === uid ? snapshot.items : EMPTY.items;

  const isSaved = useCallback(
    (media) =>
      Boolean(media?.id) &&
      items.some((item) => sameTitle(item, { id: media.id, media_type: mediaTypeOf(media) })),
    [items]
  );

  const toggle = useCallback(
    async (media) => {
      if (!uid) {
        toast("Sign in to save titles to your watchlist.");
        router.push(loginHref(router.asPath));
        return;
      }
      if (!media?.id) return;

      const entry = entryFor(media);
      const wasSaved = items.some((item) => sameTitle(item, entry));
      const previous = items;
      const next = wasSaved
        ? items.filter((item) => !sameTitle(item, entry))
        : [...items, entry];

      // Optimistic: the button flips now, Firestore catches up.
      setState({ uid, items: next, loading: false });

      try {
        const ref = doc(db, "watchlists", uid);
        // arrayUnion on add keeps a title saved on another device from being lost.
        await setDoc(ref, { items: wasSaved ? next : arrayUnion(entry) }, { merge: true });
        toast.success(wasSaved ? "Removed from watchlist" : "Added to watchlist");
      } catch (error) {
        console.error("Error updating watchlist:", error);
        toast.error("Could not update your watchlist.");
        if (state.uid === uid) setState({ uid, items: previous, loading: false });
      }
    },
    [uid, items, router]
  );

  // Signed in but the store has not settled on this uid yet still counts as
  // loading, so pages do not flash an empty state on the first render.
  const loading = Boolean(uid) && (snapshot.uid !== uid || snapshot.loading);

  return { items, loading, isSaved, toggle };
}
