import Head from "next/head";
import { motion } from "framer-motion";
import {
  FiCheck,
  FiDownload,
  FiMonitor,
  FiShield,
  FiSmartphone,
  FiTv,
  FiZap,
} from "react-icons/fi";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";

/** Short link the Downloader app on Android TV can actually be typed into. */
const TV_SHORT_LINK = "streamsynx.vercel.app/tv.apk";

const APPS = [
  {
    id: "tv",
    icon: FiTv,
    name: "Android TV",
    version: "2.0.0",
    size: "5.8 MB",
    href: "/tv.apk",
    primary: true,
    tagline: "Built for the remote, not squeezed onto the big screen.",
    points: [
      "Native player with adaptive streaming, a real scrub bar and resume points",
      "Ads, pop-ups and redirects blocked on every source",
      "Full D-pad navigation with a collapsing menu rail",
      "Search without a keyboard, cast and episode browsing built in",
    ],
  },
  {
    id: "android",
    icon: FiSmartphone,
    name: "Android",
    version: "1.0.0",
    size: "51 MB",
    href: "/downloads/StreamSynx.apk",
    primary: false,
    tagline: "Your watchlist, favourites and buddies in your pocket.",
    points: [
      "Everything from the web app, offline-aware",
      "Watchlists and history stay in sync with your account",
      "Watch parties and buddy activity",
    ],
  },
];

const TV_STEPS = [
  {
    title: "Allow unknown sources",
    body: "On the TV, open Settings → Device Preferences → Security & restrictions, and allow installs from the app you will download with.",
  },
  {
    title: "Open Downloader",
    body: (
      <>
        Install <span className="text-textprimary">Downloader by AFTVnews</span> from the Play
        Store, then type <span className="text-accent">{TV_SHORT_LINK}</span> into its address
        bar.
      </>
    ),
  },
  {
    title: "Install and open",
    body: "Confirm the install when prompted. StreamSynx TV then appears in your apps row, ready to sign in to.",
  },
];

const AppCard = ({ app, index }) => {
  const Icon = app.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className={`glass-card flex flex-col p-6 sm:p-7 ${
        app.primary ? "border-accent/25 shadow-glow" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            app.primary ? "bg-accent text-primary" : "bg-white/[0.06] text-accent"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="heading-lg">{app.name}</h2>
            {app.primary && (
              <span className="chip chip-active !py-1 text-[11px]">Just rebuilt</span>
            )}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-textsecondary">{app.tagline}</p>
        </div>
      </div>

      <ul className="mt-6 space-y-2.5">
        {app.points.map((point) => (
          <li key={point} className="flex items-start gap-2.5">
            <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span className="text-[13px] leading-relaxed text-textsecondary">{point}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-7">
        <a
          href={app.href}
          download
          className={`${app.primary ? "btn-primary" : "btn-ghost"} w-full py-3`}
        >
          <FiDownload className="h-4 w-4" />
          Download APK
        </a>
        <p className="mt-3 text-center text-[12px] text-textsecondary/70">
          Version {app.version} · {app.size} · Android 6.0 and later
        </p>
      </div>
    </motion.div>
  );
};

export default function DownloadPage() {
    return (
        <main className="min-h-screen bg-primary text-textprimary flex flex-col items-center justify-center">
            {/* Animated Hero Section */}
            <NavBar />
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="text-center space-y-4 my-20"
            >
                <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="flex items-center justify-center gap-3"
                >
                    <Smartphone className="text-accent w-8 h-8" />
                    <h1 className="text-4xl font-semibold">StreamSynx App</h1>
                </motion.div>
                <p className="text-textsecondary max-w-md mx-auto">
                    Take your watchlists, favorites, and buddies anywhere.
                    Stream your world, now on Android and Android TV.
                </p>
            </motion.div>

            {/* Animated Download Buttons */}
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <motion.a
                    href="/downloads/StreamSynx.apk"
                    download
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="flex items-center justify-center gap-3 px-6 py-3 rounded-2xl bg-accent text-primary font-medium shadow-lg hover:bg-accent-hover transition-colors"
                >
                    <Download className="w-5 h-5" />
                    Download for Android
                </motion.a>

                <motion.a
                    href="https://streamsynx.vercel.app/tv.apk"
                    download
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="flex items-center justify-center gap-3 px-6 py-3 rounded-2xl border border-accent/60 text-accent font-medium shadow-lg hover:bg-accent hover:text-primary transition-colors"
                >
                    <Tv className="w-5 h-5" />
                    Download for Android TV
                </motion.a>
            </div>
          </section>
        </div>
      </main>

            {/* Optional Preview / QR Code Section */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-12 text-center space-y-3"
            >
                <img
                    src="/images/app-preview.png"
                    alt="App Preview"
                    className="w-75 h-auto rounded-2xl shadow-lg mx-auto"
                />
                <p className="text-textsecondary text-sm">
                    For Downloader on Android TV, enter streamsynx.vercel.app/tv.apk directly.
                </p>
            </motion.div>

            <Footer />
        </main>
    );
}
