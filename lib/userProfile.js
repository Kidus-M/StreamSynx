import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "../firebase";

const isUsernameTaken = async (username) => {
  const snapshot = await getDocs(
    query(collection(db, "users"), where("username_lowercase", "==", username.toLowerCase()))
  );
  return !snapshot.empty;
};

/** Creates the per-user documents the rest of the app expects to exist. */
export const createUserDocuments = async (user, username) => {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    username,
    username_lowercase: username.toLowerCase(),
    email: user.email,
    avatar: user.photoURL || null,
    createdAt: new Date().toISOString(),
  });

  await Promise.all([
    setDoc(doc(db, "friends", user.uid), { friends: [] }),
    setDoc(doc(db, "favorites", user.uid), { movies: [], shows: [], episodes: [] }),
    setDoc(doc(db, "history", user.uid), { movies: [], episodes: [] }),
    setDoc(doc(db, "watchlists", user.uid), { items: [] }),
    setDoc(doc(db, "recommendations", user.uid), { recommendations: [] }),
  ]);
};

export { isUsernameTaken };

/**
 * After a Google sign-in, make sure the account has a profile. Returns the
 * username plus whether it was just created, so callers can pick a message.
 */
export const ensureUserProfile = async (user) => {
  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    return { username: snapshot.data().username, created: false };
  }

  const base = user.displayName?.replace(/\s+/g, "") || user.email?.split("@")[0] || "viewer";
  const username = (await isUsernameTaken(base))
    ? `${base}${Math.floor(Math.random() * 1000)}`
    : base;

  await createUserDocuments(user, username);
  return { username, created: true };
};
