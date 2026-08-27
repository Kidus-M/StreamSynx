import React from "react";
import Link from "next/link";
import { FiDownload, FiSmartphone, FiTv } from "react-icons/fi";
import { useAuth } from "../lib/auth";

const BROWSE_LINKS = [
  { name: "Home", href: "/" },
  { name: "Search", href: "/search" },
  { name: "Watch parties", href: "/rooms" },
  { name: "Get the app", href: "/download" },
];

const LIBRARY_LINKS = [
  { name: "Watchlist", href: "/watchList" },
  { name: "Continue watching", href: "/history" },
  { name: "Favorites", href: "/favorites" },
  { name: "Recommended", href: "/recommended" },
];

const Footer = () => {
  const { user } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/[0.06] bg-primary">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="text-[17px] font-semibold tracking-tight text-textprimary transition-colors hover:text-accent"
            >
              Stream<span className="text-accent">Synx</span>
            </Link>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-textsecondary">
              A calm, fast place to find something to watch — films, series and everything in
              between.
            </p>
          </div>

          {/* Browse */}
          <nav aria-label="Browse">
            <h2 className="section-label mb-3">Browse</h2>
            <ul className="space-y-2.5">
              {BROWSE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-textsecondary transition-colors hover:text-textprimary"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Library */}
          <nav aria-label="Your library">
            <h2 className="section-label mb-3">Your library</h2>
            <ul className="space-y-2.5">
              {LIBRARY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-textsecondary transition-colors hover:text-textprimary"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
              {!user && (
                <li>
                  <Link
                    href="/signup"
                    className="text-[13px] text-accent transition-colors hover:text-accent-hover"
                  >
                    Create an account
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          {/* Apps */}
          <div className="col-span-2 md:col-span-1">
            <h2 className="section-label mb-3">Apps</h2>
            <div className="space-y-2">
              <Link
                href="/download"
                className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 transition-colors hover:border-white/20"
              >
                <FiSmartphone className="h-4 w-4 shrink-0 text-accent" />
                <span className="flex-1 text-[13px] font-medium text-textprimary">Android</span>
                <FiDownload className="h-3.5 w-3.5 text-textsecondary transition-colors group-hover:text-textprimary" />
              </Link>
              <Link
                href="/download"
                className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 transition-colors hover:border-white/20"
              >
                <FiTv className="h-4 w-4 shrink-0 text-accent" />
                <span className="flex-1 text-[13px] font-medium text-textprimary">Android TV</span>
                <FiDownload className="h-3.5 w-3.5 text-textsecondary transition-colors group-hover:text-textprimary" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col-reverse items-start justify-between gap-4 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center">
          <p className="text-[12px] text-textsecondary/70">
            &copy; {year} StreamSynx. All rights reserved.
          </p>
          <p className="text-[12px] text-textsecondary/70">
            Metadata from{" "}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-textsecondary transition-colors hover:text-accent"
            >
              TMDB
            </a>
            . This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
