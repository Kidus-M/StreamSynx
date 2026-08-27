import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { FiDownload, FiExternalLink, FiPlay, FiSmartphone } from "react-icons/fi";
import NavBar from "../../../components/NavBar";
import Footer from "../../../components/Footer";

/**
 * The landing page a shared poster points at.
 *
 * On Android with the app installed, this URL never reaches the browser — the
 * verified App Link hands it straight to StreamSynx. Everyone else lands here:
 * the title is rendered server-side so pasting the link anywhere produces a rich
 * preview, and the page offers the three things a visitor might actually want —
 * open the app, install it, or just watch on the web.
 */
const APP_SCHEME = "streamsynx://title";

/** How long to wait for the app to take over before showing the fallback CTAs. */
const HANDOFF_MS = 1200;

export default function OpenTitlePage({ title, overview, poster, backdrop, meta, type, id, watchHref }) {
  const [triedApp, setTriedApp] = useState(false);

  const openInApp = useCallback(() => {
    setTriedApp(true);
    // If the app is installed this navigation is intercepted and the page is
    // left behind; if it is not, nothing happens and the CTAs below remain.
    window.location.href = `${APP_SCHEME}/${type}/${id}`;
  }, [type, id]);

  useEffect(() => {
    // One automatic attempt on arrival, so someone with the app does not have to
    // tap anything. Deliberately not repeated — a loop would trap the visitor.
    const timer = setTimeout(() => {
      if (document.visibilityState === "visible") openInApp();
    }, HANDOFF_MS);
    return () => clearTimeout(timer);
  }, [openInApp]);

  const pageTitle = `${title} — StreamSynx`;
  const canonical = `https://streamsynx.vercel.app/open/${type}/${id}`;

  return (
    <div className="flex min-h-screen flex-col bg-primary text-textprimary">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={overview || `Watch ${title} on StreamSynx.`} />
        <link rel="canonical" href={canonical} />
        {/* Rich previews wherever the poster's link gets pasted. */}
        <meta property="og:type" content="video.other" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={overview || `Watch ${title} on StreamSynx.`} />
        <meta property="og:url" content={canonical} />
        {backdrop && <meta property="og:image" content={backdrop} />}
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <NavBar />

      <main className="flex-1 px-4 pb-20 pt-24 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-4xl">
          <div className="glass-card overflow-hidden">
            {backdrop && (
              <div className="relative h-40 w-full sm:h-56">
                <img src={backdrop} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/60 to-transparent" />
              </div>
            )}

            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:p-8">
              {poster && (
                <img
                  src={poster}
                  alt=""
                  className="h-[210px] w-[140px] shrink-0 self-start rounded-xl border border-white/[0.08] object-cover shadow-lift"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="section-label mb-2">Shared with you</p>
                <h1 className="heading-xl">{title}</h1>
                {meta && <p className="mt-2 text-sm text-textsecondary">{meta}</p>}
                {overview && (
                  <p className="mt-4 line-clamp-4 text-[15px] leading-relaxed text-textsecondary">
                    {overview}
                  </p>
                )}

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button type="button" onClick={openInApp} className="btn-primary px-5 py-3">
                    <FiSmartphone className="h-4 w-4" />
                    Open in the app
                  </button>
                  <Link href={watchHref} className="btn-ghost px-5 py-3">
                    <FiPlay className="h-4 w-4" />
                    Watch in this browser
                  </Link>
                </div>

                {triedApp && (
                  <div className="surface mt-5 p-4">
                    <p className="text-[13px] leading-relaxed text-textsecondary">
                      Nothing happened? You probably do not have StreamSynx installed yet.
                    </p>
                    <Link
                      href="/download"
                      className="mt-3 inline-flex items-center gap-2 text-[13px] font-medium text-accent hover:text-accent-hover"
                    >
                      <FiDownload className="h-3.5 w-3.5" />
                      Get it free for Android and Android TV
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="surface mt-5 flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="section-label mb-1.5">Not installed yet?</p>
              <p className="text-[13px] text-textsecondary">
                The app plays without the provider ads you get in a browser.
              </p>
            </div>
            <Link href="/download" className="btn-ghost px-4 py-2.5">
              <FiExternalLink className="h-3.5 w-3.5" />
              Get the app
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/**
 * Rendered per request so link previews always show the real title, and so a
 * bad id produces a 404 rather than an empty card.
 */
export async function getServerSideProps({ params }) {
  const { type, id } = params;
  if (!["movie", "tv"].includes(type) || !/^\d+$/.test(id)) {
    return { notFound: true };
  }

  const key = process.env.NEXT_PUBLIC_API_KEY;
  if (!key) return { notFound: true };

  const response = await fetch(
    `https://api.themoviedb.org/3/${type}/${id}?api_key=${key}&language=en-US`
  );
  if (!response.ok) return { notFound: true };

  const data = await response.json();
  const title = data.title || data.name || "Untitled";
  const date = data.release_date || data.first_air_date || "";
  const year = date ? date.slice(0, 4) : "";

  const meta = [
    type === "tv" ? "Series" : "Film",
    year,
    data.vote_average ? Number(data.vote_average).toFixed(1) : "",
    ...(data.genres || []).slice(0, 2).map((genre) => genre.name),
  ]
    .filter(Boolean)
    .join("  ·  ");

  return {
    props: {
      type,
      id,
      title,
      meta,
      overview: data.overview || "",
      poster: data.poster_path ? `https://image.tmdb.org/t/p/w342${data.poster_path}` : null,
      backdrop: data.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}`
        : null,
      watchHref: type === "tv" ? `/watchTv/${id}/1/1` : `/watch?movie_id=${id}`,
    },
  };
}
