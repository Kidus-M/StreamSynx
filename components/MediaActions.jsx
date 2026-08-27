import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import { FiHeart, FiLink, FiSend, FiCheck } from "react-icons/fi";
import { arrayUnion, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "../firebase";
import { loginHref, useAuth } from "../lib/auth";

/**
 * Favourite / share / recommend controls shared by the film and episode pages.
 * Movies live under `movies`, shows under `episodes` in Firestore - that shape
 * predates this redesign, so it is preserved here.
 */
const MediaActions = ({ media }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [friends, setFriends] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const pickerRef = useRef(null);

  const isTv = media?.type === "tv";
  const field = isTv ? "episodes" : "movies";
  const matches = useCallback(
    (entry) => (isTv ? entry.tvShowId === media.id : entry.id === media.id),
    [isTv, media?.id]
  );

  useEffect(() => {
    let active = true;
    if (!user?.uid || !media?.id) {
      setIsFavorite(false);
      return () => {
        active = false;
      };
    }

    getDoc(doc(db, "favorites", user.uid))
      .then((snapshot) => {
        if (!active) return;
        const entries = snapshot.exists() ? snapshot.data()?.[field] || [] : [];
        setIsFavorite(entries.some(matches));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [user?.uid, media?.id, field, matches]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const requireAuth = () => {
    if (user) return true;
    toast("Sign in to use this.");
    router.push(loginHref(router.asPath));
    return false;
  };

  const toggleFavorite = async () => {
    if (!requireAuth() || !media?.id) return;

    const wasFavorite = isFavorite;
    setIsFavorite(!wasFavorite);

    const entry = isTv
      ? {
          tvShowId: media.id,
          tvShowName: media.title,
          poster_path: media.poster_path || null,
          type: "tv",
          favoritedAt: new Date().toISOString(),
        }
      : { id: media.id, title: media.title, poster_path: media.poster_path || null };

    try {
      const ref = doc(db, "favorites", user.uid);
      const snapshot = await getDoc(ref);
      const entries = snapshot.exists() ? snapshot.data()?.[field] || [] : [];

      if (wasFavorite) {
        await setDoc(ref, { [field]: entries.filter((item) => !matches(item)) }, { merge: true });
        toast.success("Removed from favorites");
      } else {
        await setDoc(ref, { [field]: arrayUnion(entry) }, { merge: true });
        toast.success("Added to favorites");
      }
    } catch (error) {
      console.error("Error updating favorites:", error);
      toast.error("Could not update favorites.");
      setIsFavorite(wasFavorite);
    }
  };

  const openPicker = async () => {
    if (!requireAuth()) return;
    setPickerOpen((open) => !open);

    if (friends.length) return;
    try {
      const snapshot = await getDoc(doc(db, "friends", user.uid));
      const ids = snapshot.exists() ? snapshot.data()?.friends || [] : [];
      const people = await Promise.all(
        ids.map(async (uid) => {
          const profile = await getDoc(doc(db, "users", uid));
          return profile.exists() ? { uid, username: profile.data().username } : null;
        })
      );
      setFriends(people.filter(Boolean));
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const recommend = async (friend) => {
    if (!user || !media?.id) return;
    setSending(true);

    const payload = isTv
      ? {
          tvShowId: media.id,
          tvShowName: media.title,
          poster_path: media.poster_path || null,
          type: "tv",
          recommendedBy: user.uid,
          recommendedByUsername: user.displayName || "Anonymous",
          recommendedAt: new Date().toISOString(),
        }
      : {
          id: media.id,
          title: media.title,
          poster_path: media.poster_path || null,
          type: "movie",
          recommendedBy: user.uid,
          recommendedByUsername: user.displayName || "Anonymous",
          recommendedAt: new Date().toISOString(),
        };

    try {
      await setDoc(
        doc(db, "recommendations", friend.uid),
        { [field]: arrayUnion(payload) },
        { merge: true }
      );
      toast.success(`Sent to ${friend.username}`);
      setPickerOpen(false);
    } catch (error) {
      console.error("Error sending recommendation:", error);
      toast.error("Could not send that recommendation.");
    } finally {
      setSending(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleFavorite}
        className={`btn px-3.5 py-2.5 border ${
          isFavorite
            ? "border-accent/30 bg-accent/15 text-accent"
            : "border-white/[0.08] bg-white/[0.05] text-textsecondary hover:bg-white/[0.09] hover:text-textprimary"
        }`}
        aria-pressed={isFavorite}
      >
        <FiHeart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
        <span className="hidden sm:inline">{isFavorite ? "Favorited" : "Favorite"}</span>
      </button>

      <button type="button" onClick={copyLink} className="btn-ghost px-3.5 py-2.5">
        {copied ? <FiCheck className="h-4 w-4 text-accent" /> : <FiLink className="h-4 w-4" />}
        <span className="hidden sm:inline">Copy link</span>
      </button>

      <div className="relative" ref={pickerRef}>
        <button type="button" onClick={openPicker} className="btn-ghost px-3.5 py-2.5">
          <FiSend className="h-4 w-4" />
          <span className="hidden sm:inline">Recommend</span>
        </button>

        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.16 }}
              className="glass-card-elevated absolute right-0 z-40 mt-2 w-64 p-1.5"
            >
              <p className="section-label px-3 py-2">Send to a buddy</p>
              <div className="custom-scrollbar max-h-56 overflow-y-auto">
                {friends.length ? (
                  friends.map((friend) => (
                    <button
                      key={friend.uid}
                      type="button"
                      disabled={sending}
                      onClick={() => recommend(friend)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-textsecondary transition-colors hover:bg-white/[0.06] hover:text-textprimary disabled:opacity-50"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
                        {friend.username?.charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate">{friend.username}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-4 text-center text-[12px] text-textsecondary">
                    Add buddies first to share titles with them.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MediaActions;
