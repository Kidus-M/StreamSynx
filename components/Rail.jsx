import React, { useCallback, useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

/**
 * Horizontal content rail: snap scrolling, faded edges and arrows that only
 * appear when there is somewhere to go.
 */
const Rail = ({ title, action, children, itemClassName = "w-[132px] sm:w-[150px] lg:w-[168px]" }) => {
  const scrollerRef = useRef(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const { scrollLeft, scrollWidth, clientWidth } = node;
    setEdges({
      start: scrollLeft > 8,
      end: scrollLeft + clientWidth < scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    measure();
    const node = scrollerRef.current;
    if (!node) return undefined;

    node.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      node.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure, children]);

  const scrollBy = (direction) => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(node.clientWidth * 0.8, 240), behavior: "smooth" });
  };

  const items = React.Children.toArray(children);
  if (!items.length) return null;

  return (
    <section className="group/rail relative">
      {(title || action) && (
        <div className="mb-3 flex items-end justify-between gap-4 px-4 sm:px-6 lg:px-10">
          {title && <h2 className="heading-lg">{title}</h2>}
          {action}
        </div>
      )}

      <div className="relative">
        <div
          ref={scrollerRef}
          className="rail flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 sm:px-6 lg:px-10"
        >
          {items.map((child, index) => (
            <div key={child.key ?? index} className={`shrink-0 snap-start ${itemClassName}`}>
              {child}
            </div>
          ))}
          <div className="w-1 shrink-0" aria-hidden="true" />
        </div>

        {/* Edge fades */}
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-primary to-transparent transition-opacity duration-300 ${
            edges.start ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        />
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-primary to-transparent transition-opacity duration-300 ${
            edges.end ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        />

        {/* Arrows (pointer devices only) */}
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll left"
          className={`absolute left-1 top-[38%] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-primary/80 text-textprimary backdrop-blur-md transition-all duration-200 hover:bg-primary hover:border-white/25 md:flex ${
            edges.start ? "opacity-0 group-hover/rail:opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <FiChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Scroll right"
          className={`absolute right-1 top-[38%] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-primary/80 text-textprimary backdrop-blur-md transition-all duration-200 hover:bg-primary hover:border-white/25 md:flex ${
            edges.end ? "opacity-0 group-hover/rail:opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <FiChevronRight size={20} />
        </button>
      </div>
    </section>
  );
};

export default Rail;
