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
    size: "5.4 MB",
    href: "/tv.apk",
    primary: true,
    tagline: "Built for the remote, not squeezed onto the big screen.",
    points: [
      "Plays in a native player: adaptive streaming, a real scrub bar, resume points",
      "Provider pages are resolved off-screen, so their ads never render",
      "Full D-pad navigation with a menu rail that opens on focus",
      "On-screen keyboard for search, plus cast and episode browsing",
    ],
  },
  {
    id: "android",
    icon: FiSmartphone,
    name: "Android",
    version: "2.0.0",
    size: "55 MB",
    href: "/downloads/StreamSynx.apk",
    primary: true,
    tagline: "Now with a real player, and a rebuilt interface.",
    points: [
      "Built-in player — no more handing you off to a browser full of ads",
      "Provider pages are resolved off-screen, so their ads never render",
      "Buddies fixed: accepted requests actually show up on both sides",
      "Shared posters open the title straight in the app",
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
    body: "Confirm the install when prompted. StreamSynx TV then appears in your apps row, ready to use.",
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
              <span className="chip chip-active !py-1 text-[11px]">Version 2</span>
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
    <div className="flex min-h-screen flex-col bg-primary text-textprimary">
      <Head>
        <title>Get the app — StreamSynx</title>
        <meta
          name="description"
          content="StreamSynx for Android TV and Android. A native big-screen player that keeps provider ads off your television."
        />
      </Head>

      <NavBar />

      <main className="flex-1 px-4 pb-20 pt-24 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-6xl">
          {/* Hero */}
          <motion.header
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl"
          >
            <p className="section-label mb-3">Apps</p>
            <h1 className="heading-xl">Take StreamSynx off the browser</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-textsecondary">
              The same catalogue and the same watchlist, on the screen you actually watch on.
              The Android TV app is a native leanback client — nothing about it is a website in
              a box.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="chip">
                <FiShield className="h-3.5 w-3.5 text-accent" />
                No provider ads
              </span>
              <span className="chip">
                <FiZap className="h-3.5 w-3.5 text-accent" />
                Native player
              </span>
              <span className="chip">
                <FiMonitor className="h-3.5 w-3.5 text-accent" />
                D-pad first
              </span>
            </div>
          </motion.header>

          {/* Downloads */}
          <section className="mt-12 grid gap-5 lg:grid-cols-2">
            {APPS.map((app, index) => (
              <AppCard key={app.id} app={app} index={index} />
            ))}
          </section>

          {/* Sideload guide */}
          <section className="mt-14">
            <h2 className="heading-lg">Installing on a TV</h2>
            <p className="mt-2 max-w-2xl text-sm text-textsecondary">
              Android TV has no browser, so the file is fetched on the device itself. It takes
              about two minutes.
            </p>

            <ol className="mt-6 grid gap-4 sm:grid-cols-3">
              {TV_STEPS.map((step, index) => (
                <li key={step.title} className="surface p-5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-[12px] font-semibold text-accent">
                    {index + 1}
                  </span>
                  <h3 className="mt-3.5 text-sm font-medium text-textprimary">{step.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-textsecondary">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>

            <div className="surface mt-5 flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="section-label mb-1.5">Direct link for Downloader</p>
                <p className="font-mono text-sm text-textprimary">{TV_SHORT_LINK}</p>
              </div>
              <p className="max-w-md text-[12px] leading-relaxed text-textsecondary/80">
                Installing outside the Play Store is expected here — StreamSynx is not
                distributed through it. The file is served straight from this site.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
