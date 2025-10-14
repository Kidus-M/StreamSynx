import React from "react";
import Link from "next/link";
import { Download, Smartphone } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
      <footer className="bg-[#121212] text-[#A0A0A0] border-t border-[#2A2A2A] relative overflow-hidden">
        {/* Decorative glow effect */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent opacity-60" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-8">

          {/* Left Section - TMDB & Info */}
          <div className="text-center md:text-left max-w-sm">
            <p className="text-[#EAEAEA] font-semibold text-lg mb-2">
              StreamSynx
            </p>
            <p className="text-sm">
              Powered by{" "}
              <a
                  href="https://www.themoviedb.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#DAA520] hover:text-[#C8941A] transition-colors"
              >
                TMDB
              </a>{" "}
              (The Movie Database).
            </p>
            <p className="text-xs mt-1 text-[#808080]">
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>

          {/* Middle Section - Download CTA */}
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2 text-[#EAEAEA] mb-2">
              <Smartphone className="w-5 h-5 text-[#DAA520]" />
              <span className="font-semibold text-base">Get the App</span>
            </div>
            <p className="text-sm mb-3 text-[#B0B0B0]">
              Enjoy StreamSynx anywhere, anytime.
            </p>
            <Link
                href="/download"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#DAA520] text-black font-semibold shadow-md hover:bg-[#C8941A] transition-all duration-300"
            >
              <Download className="w-4 h-4" />
              Download Now
            </Link>
          </div>

          {/* Right Section - Copyright */}
          <div className="text-center md:text-right text-sm">
            <p className="text-[#EAEAEA] font-medium mb-1">
              &copy; {currentYear} StreamSynx
            </p>
            <p className="text-[#777]">All rights reserved.</p>
          </div>
        </div>

        {/* Bottom accent bar */}
        {/*<div className="h-1 bg-gradient-to-r from-[#DAA520] via-[#C8941A] to-[#DAA520] opacity-60"></div>*/}
      </footer>
  );
};

export default Footer;
