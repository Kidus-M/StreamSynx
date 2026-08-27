import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { posterUrl, tmdbGet } from "../lib/tmdb";

const PosterColumn = ({ posters, direction, className = "" }) => (
  <div className={`flex flex-col gap-3 ${className}`}>
    <div className={direction === "up" ? "marquee-up" : "marquee-down"}>
      <div className="flex flex-col gap-3">
        {[...posters, ...posters].map((path, index) => (
          <img
            key={`${path}-${index}`}
            src={posterUrl(path)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="aspect-[2/3] w-full rounded-xl object-cover"
          />
        ))}
      </div>
    </div>
  </div>
);

/**
 * Shared shell for /login and /signup: form on the left, a slow poster wall on
 * the right so the page feels like part of the product rather than a gate.
 */
const AuthLayout = ({ title, subtitle, eyebrow, children, footer, pageTitle }) => {
  const [posters, setPosters] = useState([]);

  useEffect(() => {
    let active = true;
    tmdbGet("/movie/popular")
      .then(({ data }) => {
        if (!active) return;
        setPosters(
          (data.results || []).filter((item) => item.poster_path).map((item) => item.poster_path)
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const columns = [posters.slice(0, 6), posters.slice(6, 12), posters.slice(12, 18)];

  return (
    <div className="min-h-screen bg-primary text-textprimary lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Head>
        <title>{pageTitle || `${title} — StreamSynx`}</title>
        <meta name="robots" content="noindex" />
      </Head>

      {/* Form side */}
      <div className="relative flex min-h-screen flex-col px-5 py-8 sm:px-10 lg:py-10">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-[17px] font-semibold tracking-tight text-textprimary transition-colors hover:text-accent"
          >
            Stream<span className="text-accent">Synx</span>
          </Link>
          <Link
            href="/"
            className="text-[13px] text-textsecondary transition-colors hover:text-textprimary"
          >
            Back to browsing
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px] animate-fade-up">
            {eyebrow && <p className="section-label mb-3">{eyebrow}</p>}
            <h1 className="text-3xl font-semibold tracking-tighter text-textprimary">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-textsecondary">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-textsecondary">{footer}</div>}
          </div>
        </div>

        <p className="text-center text-[11px] text-textsecondary/60">
          Movie and series data provided by TMDB.
        </p>
      </div>

      {/* Poster wall */}
      <div className="relative hidden overflow-hidden border-l border-white/[0.06] bg-primary-soft lg:block">
        <div className="absolute inset-0 grid grid-cols-3 gap-3 p-3 opacity-40">
          <PosterColumn posters={columns[0]} direction="up" />
          <PosterColumn posters={columns[1]} direction="down" />
          <PosterColumn posters={columns[2]} direction="up" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/30 to-primary" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-transparent to-primary/40" />

        <div className="relative flex h-full items-end p-12">
          <div className="max-w-md">
            <p className="text-2xl font-semibold leading-snug tracking-tight text-textprimary">
              Thousands of films and series, one calm place to find them.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-textsecondary">
              Your watchlist, history and recommendations follow you across devices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
