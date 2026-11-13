/**
 * Owner-only gate for /api/admin/* routes.
 *
 * The caller sends its Firebase ID token as `Authorization: Bearer <token>`.
 * We verify it with the Admin SDK (signature, expiry, and revocation) and
 * allow it only when the account's email is in ANALYTICS_ADMIN_EMAILS.
 * Firebase allows one account per email address, so the email identifies the
 * owner's account; signing in to it still needs that account's password.
 */
import { getAdmin } from "./firebaseAdmin";

const DEFAULT_ADMINS = "kidusmesfinteferi@gmail.com";

const adminEmails = () =>
  new Set(
    (process.env.ANALYTICS_ADMIN_EMAILS || DEFAULT_ADMINS)
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

/**
 * Resolves to { admin, user } for the owner, or sends the response itself and
 * resolves to null. Non-owners get a 404 so the route does not advertise itself.
 */
export const requireAdmin = async (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  const admin = getAdmin();
  if (!admin) {
    res.status(503).json({ error: "Analytics is not configured: set FIREBASE_SERVICE_ACCOUNT." });
    return null;
  }

  const match = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (!match) {
    res.status(401).json({ error: "Sign in required." });
    return null;
  }

  let decoded;
  try {
    decoded = await admin.auth.verifyIdToken(match[1], true);
  } catch {
    res.status(401).json({ error: "Session expired. Sign in again." });
    return null;
  }

  const email = (decoded.email || "").toLowerCase();
  if (!email || !adminEmails().has(email)) {
    res.status(404).json({ error: "Not found." });
    return null;
  }
  return { admin, user: { uid: decoded.uid, email } };
};
