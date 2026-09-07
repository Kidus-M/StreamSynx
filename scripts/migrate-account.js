#!/usr/bin/env node
/**
 * Move one StreamSynx account's data onto another account.
 *
 * Everything in this app is keyed by Firebase Auth uid - users/{uid},
 * watchlists/{uid}, history/{uid}, favorites/{uid}, recommendations/{uid},
 * friends/{uid} - plus references to that uid held by *other* people (their
 * friends list, friend requests, rooms, recommendations they sent you) and by
 * the realtime database (room chat messages, watch-room membership). A
 * migration that only copies the six owned documents leaves all of those
 * dangling, so this script rewrites the references too.
 *
 * Two modes:
 *
 *   --mode rename   Keeps the existing account and only changes the email on
 *                   it. The uid never changes, so nothing is copied and
 *                   nothing can be missed. Use this when the personal email is
 *                   not already a StreamSynx account.
 *
 *   --mode copy     Merges the source account's data into a second, already
 *                   existing account and repoints every reference. Use this
 *                   when you have already signed in with the personal email.
 *
 * Usage:
 *   npm install --no-save firebase-admin
 *   # Firebase console > Project settings > Service accounts > Generate new
 *   # private key, save it outside git.
 *   node scripts/migrate-account.js --from old@x.com --to new@x.com --key ./serviceAccountKey.json
 *       ...prints the plan and writes a backup, changes nothing.
 *   node scripts/migrate-account.js --from old@x.com --to new@x.com --key ./serviceAccountKey.json --apply
 *       ...actually performs it.
 *
 * Flags:
 *   --mode copy|rename    default: copy
 *   --apply               perform the writes (default is a dry run)
 *   --purge-source        after a copy, delete the old account's Firestore docs
 *   --delete-source-auth  also delete the old Firebase Auth user
 *   --skip-rtdb           leave the realtime database alone
 *   --key <path>          service-account JSON (or GOOGLE_APPLICATION_CREDENTIALS)
 *   --database-url <url>  RTDB url, if not https://<projectId>-default-rtdb.firebaseio.com
 */

const fs = require("fs");
const path = require("path");

// firebase-admin v13+ dropped the single `admin.*` namespace in favour of these
// per-product entry points.
let initializeApp;
let cert;
let getAuth;
let getFirestore;
let getDatabase;
try {
  ({ initializeApp, cert } = require("firebase-admin/app"));
  ({ getAuth } = require("firebase-admin/auth"));
  ({ getFirestore } = require("firebase-admin/firestore"));
  ({ getDatabase } = require("firebase-admin/database"));
} catch (error) {
  // firebase-admin v14 leaves @opentelemetry/api as an unbundled peer of
  // firestore, so a partial install fails here rather than at the entry point.
  console.error(
    `Could not load firebase-admin: ${error.message}\n\n` +
      "Install it with:\n  npm install --no-save firebase-admin @opentelemetry/api\n"
  );
  process.exit(1);
}

// ---------------------------------------------------------------- arguments

const FLAGS = ["apply", "purge-source", "delete-source-auth", "skip-rtdb"];

const parseArgs = (argv) => {
  const out = { mode: "copy" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const name = arg.slice(2);
    if (FLAGS.includes(name)) out[name] = true;
    else out[name] = argv[++i];
  }
  return out;
};

const args = parseArgs(process.argv.slice(2));
const DRY = !args.apply;

if (!args.from || !args.to) {
  console.error("Both --from <email> and --to <email> are required.");
  process.exit(1);
}
if (!["copy", "rename"].includes(args.mode)) {
  console.error(`Unknown --mode ${args.mode}. Use "copy" or "rename".`);
  process.exit(1);
}

// ------------------------------------------------------------ admin bootstrap

const keyPath =
  args.key ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, "serviceAccountKey.json");

if (!fs.existsSync(keyPath)) {
  console.error(
    `No service-account key at ${keyPath}.\n` +
      "Firebase console > Project settings > Service accounts > Generate new private key,\n" +
      "then pass it with --key <path>. Keep it out of git."
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
const projectId = serviceAccount.project_id;
const databaseURL = args["database-url"] || `https://${projectId}-default-rtdb.firebaseio.com`;

const app = initializeApp({ credential: cert(serviceAccount), databaseURL });

const db = getFirestore(app);
const auth = getAuth(app);
const rtdb = getDatabase(app);

// --------------------------------------------------------------- plan / write

const steps = [];

/** Records an operation, and performs it only when --apply was passed. */
const plan = async (description, run) => {
  steps.push(description);
  console.log(`${DRY ? "[dry-run]" : "[write]  "} ${description}`);
  if (!DRY) await run();
};

// --------------------------------------------------------------- merge rules

/**
 * Identity of a saved entry, so merging two accounts does not leave two copies
 * of the same title. Mirrors what the UI dedupes on: episodes by
 * show+season+episode, favourited shows by show id, everything else by media
 * type plus tmdb id.
 */
const entryKey = (entry) => {
  if (entry === null || typeof entry !== "object") return `v:${String(entry)}`;
  if (entry.tvShowId != null && entry.seasonNumber != null) {
    return `ep:${entry.tvShowId}-${entry.seasonNumber}-${entry.episodeNumber}`;
  }
  if (entry.tvShowId != null) return `tv:${entry.tvShowId}`;
  if (entry.id != null) return `${entry.media_type || "movie"}:${entry.id}`;
  return `raw:${JSON.stringify(entry)}`;
};

/** Target's entries win on a collision; the source's extras are appended. */
const mergeArrays = (targetArr = [], sourceArr = []) => {
  const seen = new Set();
  const out = [];
  for (const entry of [...targetArr, ...sourceArr]) {
    const key = entryKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
};

/** The documents createUserDocuments() seeds for every account. */
const OWNED = [
  { collection: "watchlists", empty: { items: [] } },
  { collection: "favorites", empty: { movies: [], shows: [], episodes: [] } },
  { collection: "history", empty: { movies: [], episodes: [] } },
  { collection: "recommendations", empty: { movies: [], episodes: [] } },
  { collection: "friends", empty: { friends: [] } },
];

const mergeDocs = (targetData = {}, sourceData = {}) => {
  const merged = { ...sourceData, ...targetData };
  const fields = new Set([...Object.keys(sourceData), ...Object.keys(targetData)]);
  for (const field of fields) {
    const t = targetData[field];
    const s = sourceData[field];
    if (Array.isArray(t) || Array.isArray(s)) {
      merged[field] = mergeArrays(Array.isArray(t) ? t : [], Array.isArray(s) ? s : []);
    }
  }
  return merged;
};

// ------------------------------------------------------------------- backup

const backup = { startedAt: new Date().toISOString(), args, firestore: {}, rtdb: {} };

const remember = (label, value) => {
  backup.firestore[label] = value;
};

const writeBackup = () => {
  const dir = path.join(__dirname, "backups");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `migrate-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  return file;
};

// --------------------------------------------------------------------- steps

const readDoc = async (collection, id) => {
  const snapshot = await db.collection(collection).doc(id).get();
  return snapshot.exists ? snapshot.data() : null;
};

const usernameTaken = async (username, exceptUids) => {
  const snapshot = await db
    .collection("users")
    .where("username_lowercase", "==", username.toLowerCase())
    .get();
  return snapshot.docs.some((docSnap) => !exceptUids.includes(docSnap.id));
};

async function renameMode(sourceUser) {
  console.log(
    `\nRenaming ${sourceUser.email} (uid ${sourceUser.uid}) to ${args.to}.\n` +
      "The uid does not change, so every document stays exactly where it is.\n"
  );

  let targetExists = false;
  try {
    await auth.getUserByEmail(args.to);
    targetExists = true;
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
  }
  if (targetExists) {
    console.error(
      `${args.to} is already a Firebase Auth user, and two accounts cannot share\n` +
        "an email. Run with --mode copy instead, or delete that account first if it\n" +
        "holds nothing you want."
    );
    process.exit(1);
  }

  remember("users/source", await readDoc("users", sourceUser.uid));
  remember("authUser", sourceUser.toJSON());

  await plan(`auth: set email of ${sourceUser.uid} to ${args.to}`, () =>
    auth.updateUser(sourceUser.uid, { email: args.to, emailVerified: false })
  );
  await plan(`users/${sourceUser.uid}: email -> ${args.to}`, () =>
    db.collection("users").doc(sourceUser.uid).set({ email: args.to }, { merge: true })
  );

  if (sourceUser.providerData.some((provider) => provider.providerId === "google.com")) {
    console.log(
      "\nNote: this account has a Google provider linked to the old address. After the\n" +
        "rename, sign in with the password (use 'forgot password' on the new address if\n" +
        "you never set one), or unlink and relink Google from the new address."
    );
  }
}

async function copyMode(sourceUser, targetUser) {
  const src = sourceUser.uid;
  const dst = targetUser.uid;
  console.log(`\nCopying ${sourceUser.email} (${src}) -> ${targetUser.email} (${dst}).\n`);

  // 1. the profile document ------------------------------------------------
  const srcProfile = (await readDoc("users", src)) || {};
  const dstProfile = (await readDoc("users", dst)) || {};
  remember("users/source", srcProfile);
  remember("users/target", dstProfile);

  let username = dstProfile.username || srcProfile.username;
  if (!dstProfile.username && username && (await usernameTaken(username, [src, dst]))) {
    username = `${username}${Math.floor(Math.random() * 1000)}`;
  }
  username = username || (targetUser.email || "viewer").split("@")[0];

  const profile = {
    ...mergeDocs(dstProfile, srcProfile),
    uid: dst,
    email: targetUser.email,
    username,
    username_lowercase: username.toLowerCase(),
    createdAt: srcProfile.createdAt || dstProfile.createdAt || new Date().toISOString(),
  };
  await plan(`users/${dst}: merge profile (taste picks, taste profile, public stats)`, () =>
    db.collection("users").doc(dst).set(profile, { merge: true })
  );

  // 2. the owned per-user documents ----------------------------------------
  for (const { collection, empty } of OWNED) {
    const srcData = (await readDoc(collection, src)) || {};
    const dstData = (await readDoc(collection, dst)) || {};
    remember(`${collection}/source`, srcData);
    remember(`${collection}/target`, dstData);

    const merged = mergeDocs({ ...empty, ...dstData }, srcData);
    if (collection === "friends") {
      // A friendship with either of your own accounts is not a friendship.
      merged.friends = (merged.friends || []).filter((uid) => uid !== src && uid !== dst);
    }

    const counts = Object.entries(merged)
      .filter(([, value]) => Array.isArray(value))
      .map(([field, value]) => `${field}=${value.length}`)
      .join(" ");
    await plan(`${collection}/${dst}: merged (${counts})`, () =>
      db.collection(collection).doc(dst).set(merged, { merge: true })
    );
  }

  // 3. other people's friend lists -----------------------------------------
  const friendDocs = await db.collection("friends").get();
  for (const docSnap of friendDocs.docs) {
    if (docSnap.id === src || docSnap.id === dst) continue;
    const list = docSnap.data().friends || [];
    if (!list.includes(src)) continue;
    remember(`friends/${docSnap.id}`, docSnap.data());
    const next = Array.from(new Set(list.map((uid) => (uid === src ? dst : uid))));
    await plan(`friends/${docSnap.id}: ${src} -> ${dst} in their friends list`, () =>
      docSnap.ref.set({ friends: next }, { merge: true })
    );
  }

  // 4. friend requests ------------------------------------------------------
  const requestSnaps = [
    ...(await db.collection("friendRequests").where("fromUserId", "==", src).get()).docs,
    ...(await db.collection("friendRequests").where("toUserId", "==", src).get()).docs,
  ];
  const seenRequests = new Set();
  for (const docSnap of requestSnaps) {
    if (seenRequests.has(docSnap.id)) continue;
    seenRequests.add(docSnap.id);
    const data = docSnap.data();
    remember(`friendRequests/${docSnap.id}`, data);

    const from = data.fromUserId === src ? dst : data.fromUserId;
    const to = data.toUserId === src ? dst : data.toUserId;
    if (from === to) {
      // A pending request between the two accounts being merged is meaningless.
      await plan(`friendRequests/${docSnap.id}: delete (self-request after merge)`, () =>
        docSnap.ref.delete()
      );
      continue;
    }
    // The app derives the id from the pair, so the document has to be re-keyed.
    const newId = `${from}_${to}`;
    await plan(`friendRequests/${docSnap.id} -> ${newId}`, async () => {
      await db
        .collection("friendRequests")
        .doc(newId)
        .set({ ...data, fromUserId: from, toUserId: to }, { merge: true });
      if (newId !== docSnap.id) await docSnap.ref.delete();
    });
  }

  // 5. watch rooms ----------------------------------------------------------
  const memberRooms = await db.collection("rooms").where("members", "array-contains", src).get();
  for (const docSnap of memberRooms.docs) {
    const data = docSnap.data();
    remember(`rooms/${docSnap.id}`, data);
    const patch = {
      members: Array.from(new Set((data.members || []).map((uid) => (uid === src ? dst : uid)))),
    };
    if (data.createdBy === src) {
      patch.createdBy = dst;
      patch.createdByUsername = username;
    }
    await plan(`rooms/${docSnap.id}: membership/ownership ${src} -> ${dst}`, () =>
      docSnap.ref.set(patch, { merge: true })
    );
  }

  const ownedRooms = await db.collection("rooms").where("createdBy", "==", src).get();
  for (const docSnap of ownedRooms.docs) {
    if (memberRooms.docs.some((seen) => seen.id === docSnap.id)) continue;
    remember(`rooms/${docSnap.id}`, docSnap.data());
    await plan(`rooms/${docSnap.id}: createdBy ${src} -> ${dst}`, () =>
      docSnap.ref.set({ createdBy: dst, createdByUsername: username }, { merge: true })
    );
  }

  // 6. recommendations this account sent to other people --------------------
  const recDocs = await db.collection("recommendations").get();
  for (const docSnap of recDocs.docs) {
    if (docSnap.id === src) continue;
    const data = docSnap.data();
    const patch = {};
    for (const [field, value] of Object.entries(data)) {
      if (!Array.isArray(value)) continue;
      if (!value.some((entry) => entry && entry.recommendedBy === src)) continue;
      patch[field] = value.map((entry) =>
        entry && entry.recommendedBy === src
          ? { ...entry, recommendedBy: dst, recommendedByUsername: username }
          : entry
      );
    }
    if (!Object.keys(patch).length) continue;
    remember(`recommendations/${docSnap.id}`, data);
    await plan(`recommendations/${docSnap.id}: recommendedBy ${src} -> ${dst}`, () =>
      docSnap.ref.set(patch, { merge: true })
    );
  }

  // 7. realtime database: room chat and watch-room membership ---------------
  if (args["skip-rtdb"]) {
    console.log("[skip]     realtime database (--skip-rtdb)");
  } else {
    const chats = (await rtdb.ref("roomChats").get()).val() || {};
    backup.rtdb.roomChats = chats;
    for (const [roomId, room] of Object.entries(chats)) {
      for (const [messageId, message] of Object.entries((room && room.messages) || {})) {
        if (!message || message.userId !== src) continue;
        await plan(`rtdb roomChats/${roomId}/messages/${messageId}: author -> ${dst}`, () =>
          rtdb.ref(`roomChats/${roomId}/messages/${messageId}`).update({ userId: dst, username })
        );
      }
    }

    const watchRooms = (await rtdb.ref("watchRooms").get()).val() || {};
    backup.rtdb.watchRooms = watchRooms;
    for (const [roomId, room] of Object.entries(watchRooms)) {
      const members = (room && room.members) || {};
      if (!(src in members)) continue;
      await plan(`rtdb watchRooms/${roomId}/members: ${src} -> ${dst}`, async () => {
        await rtdb.ref(`watchRooms/${roomId}/members/${dst}`).set(members[src]);
        await rtdb.ref(`watchRooms/${roomId}/members/${src}`).remove();
      });
    }
  }

  // 8. optional cleanup -----------------------------------------------------
  if (args["purge-source"]) {
    for (const collection of ["users", ...OWNED.map((owned) => owned.collection)]) {
      await plan(`${collection}/${src}: delete (source)`, () =>
        db.collection(collection).doc(src).delete()
      );
    }
  }
  if (args["delete-source-auth"]) {
    remember("authUser", sourceUser.toJSON());
    await plan(`auth: delete user ${src} (${sourceUser.email})`, () => auth.deleteUser(src));
  }
}

async function main() {
  const sourceUser = await auth.getUserByEmail(args.from).catch((error) => {
    if (error.code === "auth/user-not-found") {
      console.error(`No Firebase Auth user for ${args.from} in project ${projectId}.`);
      process.exit(1);
    }
    throw error;
  });

  if (args.mode === "rename") {
    await renameMode(sourceUser);
  } else {
    const targetUser = await auth.getUserByEmail(args.to).catch((error) => {
      if (error.code === "auth/user-not-found") {
        console.error(
          `${args.to} is not a StreamSynx account yet.\n` +
            "Either sign in once with it (that creates the account and its documents),\n" +
            "or run this with --mode rename to move the email onto the old account."
        );
        process.exit(1);
      }
      throw error;
    });
    if (sourceUser.uid === targetUser.uid) {
      console.error("Both emails resolve to the same account - nothing to do.");
      process.exit(1);
    }
    await copyMode(sourceUser, targetUser);
  }

  const file = writeBackup();
  console.log(`\n${steps.length} operation(s) ${DRY ? "planned" : "applied"}.`);
  console.log(`Backup of everything read: ${file}`);
  if (DRY) console.log("\nDry run - nothing was written. Re-run with --apply to perform it.");
  await rtdb.goOffline();
  process.exit(0);
}

main().catch(async (error) => {
  console.error("\nMigration failed:", error);
  console.error(`Partial backup: ${writeBackup()}`);
  process.exit(1);
});
