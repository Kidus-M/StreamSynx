import React from "react";
import Link from "next/link";
import { Download, Smartphone } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
      <footer className="bg-primary text-textsecondary border-t border-white/[0.06] relative overflow-hidden">
        {/* Decorative glow effect */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-secondary/30 via-transparent to-transparent" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-8">

          {/* Left Section - TMDB & Info */}
          <div className="text-center md:text-left max-w-sm">
            <p className="text-textprimary font-semibold text-lg mb-2 tracking-tight">
              Stream<span className="text-accent">Synx</span>
            </p>
            <p className="text-sm">
              Powered by{" "}
              <a
                  href="https://www.themoviedb.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-hover transition-colors font-medium"
              >
                TMDB
              </a>{" "}
              (The Movie Database).
            </p>
            <p className="text-xs mt-1 text-textsecondary/60">
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>

          {/* Middle Section - Download CTA */}
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2 text-textprimary mb-2">
              <Smartphone className="w-5 h-5 text-accent" />
              <span className="font-semibold text-base">Get the App</span>
            </div>
            <p className="text-sm mb-3 text-textsecondary/80">
              Enjoy StreamSynx anywhere, anytime.
            </p>
            <Link
                href="/download"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-primary font-semibold shadow-lg shadow-accent/20 hover:bg-accent-hover hover:shadow-accent/30 transition-all duration-300"
            >
              <Download className="w-4 h-4" />
              Download Now
            </Link>
          </div>

          {/* Right Section - Copyright */}
          <div className="text-center md:text-right text-sm">
            <p className="text-textprimary font-medium mb-1">
              &copy; {currentYear} StreamSynx
            </p>
            <p className="text-textsecondary/60">All rights reserved.</p>
          </div>
        </div>
      </footer>
  );
};

export default Footer;
