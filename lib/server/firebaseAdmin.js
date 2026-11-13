/**
 * lib/server/firebaseAdmin.js — Firebase Admin SDK, server-only.
 *
 * Used by the analytics API routes: they write events without depending on
 * Firestore security rules, and verify the dashboard owner's ID token.
 *
 * Credentials come from FIREBASE_SERVICE_ACCOUNT: the service-account JSON,
 * either raw or base64-encoded (base64 survives the Vercel env UI untouched).
 * Locally, FIREBASE_SERVICE_ACCOUNT_PATH can point at the downloaded key file.
 * Never import this from a page or component.
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const readServiceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(text);
  }
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (path) {
    // eslint-disable-next-line global-require
    const fs = require("fs");
    return JSON.parse(fs.readFileSync(path, "utf8"));
  }
  return null;
};

let cached = null;

/** Returns { db, auth } or null when no credentials are configured. */
export const getAdmin = () => {
  if (cached) return cached;
  const account = readServiceAccount();
  if (!account) return null;
  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert(account),
      projectId: account.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  const db = getFirestore(app);
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    /* settings() throws if called twice on a warm instance — already applied */
  }
  cached = { db, auth: getAuth(app) };
  return cached;
};
