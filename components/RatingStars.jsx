import React, { useState } from "react";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";

/**
 * Five stars mapped to a 0-10 score. Each star has two hit areas: the left half
 * gives the odd score (1, 3, 5, 7, 9), the right half the even one.
 */
const RatingStars = ({ value = 0, onRate, disabled = false }) => {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
        role="group"
        aria-label="Your rating out of 10"
      >
        {[1, 2, 3, 4, 5].map((step) => {
          const full = step * 2;
          const half = full - 1;
          const Icon = shown >= full ? FaStar : shown >= half ? FaStarHalfAlt : FaRegStar;

          return (
            <span key={step} className="relative inline-flex">
              <Icon
                className={`h-6 w-6 transition-colors duration-150 ${
                  shown >= half ? "text-accent" : "text-white/15"
                }`}
                aria-hidden="true"
              />

              {/* Left half = odd score */}
              <button
                type="button"
                disabled={disabled}
                onMouseEnter={() => setHover(half)}
                onFocus={() => setHover(half)}
                onClick={() => onRate?.(half)}
                aria-label={`Rate ${half} out of 10`}
                className="tv-focusable absolute inset-y-0 left-0 w-1/2 cursor-pointer disabled:cursor-not-allowed"
              />
              {/* Right half = even score */}
              <button
                type="button"
                disabled={disabled}
                onMouseEnter={() => setHover(full)}
                onFocus={() => setHover(full)}
                onClick={() => onRate?.(full)}
                aria-label={`Rate ${full} out of 10`}
                className="tv-focusable absolute inset-y-0 right-0 w-1/2 cursor-pointer disabled:cursor-not-allowed"
              />
            </span>
          );
        })}
      </div>

      <span className="text-[11px] text-textsecondary">
        {hover
          ? `Rate ${hover}/10`
          : value
          ? `You rated ${value}/10`
          : "Rate this title"}
      </span>
    </div>
  );
};

export default RatingStars;
