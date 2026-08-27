import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useSwipeable } from "react-swipeable";
import { FaPlay, FaStar } from "react-icons/fa";
import { FiInfo } from "react-icons/fi";
import {
  backdropUrl,
  genreNames,
  mediaTypeOf,
  posterUrl,
  titleOf,
  watchHref,
  yearOf,
} from "../lib/tmdb";

const ROTATE_MS = 9000;

const HeroSkeleton = () => (
  <div className="relative h-[78vh] min-h-[520px] w-full overflow-hidden bg-secondary/40">
    <div className="absolute inset-x-0 bottom-0 px-4 pb-16 sm:px-6 lg:px-10">
      <div className="skeleton h-4 w-28 rounded-full" />
      <div className="skeleton mt-4 h-12 w-3/4 max-w-xl rounded-lg" />
      <div className="skeleton mt-4 h-4 w-full max-w-lg rounded" />
      <div className="skeleton mt-2 h-4 w-2/3 max-w-md rounded" />
      <div className="mt-6 flex gap-3">
        <div className="skeleton h-11 w-36 rounded-xl" />
        <div className="skeleton h-11 w-32 rounded-xl" />
      </div>
    </div>
  </div>
);

const Hero = ({ items = [], loading = false }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  const slides = useMemo(
    () => items.filter((item) => item?.backdrop_path && item?.overview).slice(0, 6),
    [items]
  );

  const go = useCallback(
    (next) => {
      if (!slides.length) return;
      setIndex((current) => (current + next + slides.length) % slides.length);
    },
    [slides.length]
  );

  useEffect(() => {
    if (paused || slides.length <= 1) return undefined;
    timerRef.current = setInterval(() => go(1), ROTATE_MS);
    return () => clearInterval(timerRef.current);
  }, [go, paused, slides.length, index]);

  const handlers = useSwipeable({
    onSwipedLeft: () => go(1),
    onSwipedRight: () => go(-1),
    trackMouse: false,
  });

  if (loading || !slides.length) return <HeroSkeleton />;

  const active = slides[index];
  const type = mediaTypeOf(active);
  const genres = genreNames(active, 3);

  return (
    <section
      {...handlers}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative h-[82vh] min-h-[540px] w-full overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Trending now"
    >
      {/* Backdrop */}
      <AnimatePresence initial={false}>
        <motion.div
          key={active.id}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.8 }, scale: { duration: 8, ease: "linear" } }}
          className="absolute inset-0"
        >
          <img
            src={backdropUrl(active.backdrop_path)}
            alt=""
            className="h-full w-full object-cover object-top"
            fetchpriority="high"
          />
        </motion.div>
      </AnimatePresence>

      {/* Scrims: bottom into the page, left for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/55 to-primary/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/35 to-transparent" />

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0">
        <div className="px-4 pb-14 sm:px-6 lg:px-10 lg:pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl"
            >
              <div className="mb-3 flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent ring-1 ring-inset ring-accent/25">
                  #{index + 1} Trending
                </span>
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-textsecondary">
                  {type === "tv" ? "Series" : "Film"}
                </span>
              </div>

              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tighter text-textprimary sm:text-5xl lg:text-6xl">
                {titleOf(active)}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-textsecondary">
                {active.vote_average > 0 && (
                  <span className="inline-flex items-center gap-1.5 font-medium text-textprimary">
                    <FaStar className="h-3 w-3 text-accent" />
                    {active.vote_average.toFixed(1)}
                  </span>
                )}
                {yearOf(active) && <span>{yearOf(active)}</span>}
                {genres.length > 0 && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-textsecondary/50" />
                    <span>{genres.join(" · ")}</span>
                  </>
                )}
              </div>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-textsecondary line-clamp-2 sm:text-[15px] md:line-clamp-3">
                {active.overview}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href={watchHref(active)} className="btn-primary px-6 py-3 text-[15px]">
                  <FaPlay className="h-3.5 w-3.5" />
                  Watch now
                </Link>
                <Link
                  href={`${watchHref(active)}${type === "tv" ? "" : ""}#details`}
                  className="btn-ghost px-5 py-3 text-[15px]"
                >
                  <FiInfo className="h-4 w-4" />
                  More info
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Slide picker: poster thumbs on desktop, progress bars on mobile */}
      <div className="absolute bottom-14 right-10 hidden items-end gap-2.5 lg:flex">
        {slides.map((slide, slideIndex) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setIndex(slideIndex)}
            aria-label={`Show ${titleOf(slide)}`}
            aria-current={slideIndex === index}
            className={`overflow-hidden rounded-lg border transition-all duration-300 ease-out-expo ${
              slideIndex === index
                ? "h-24 w-16 border-accent/70 opacity-100 shadow-glow"
                : "h-20 w-[54px] border-white/10 opacity-45 hover:opacity-80"
            }`}
          >
            <img src={posterUrl(slide.poster_path)} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      <div className="absolute inset-x-4 bottom-6 flex gap-1.5 sm:inset-x-6 lg:hidden">
        {slides.map((slide, slideIndex) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setIndex(slideIndex)}
            aria-label={`Show slide ${slideIndex + 1}`}
            className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${
              slideIndex === index ? "bg-accent" : "bg-white/20"
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;
