import React, { useState } from "react";
import { FaStar } from "react-icons/fa";

/** Five stars mapped to a 0-10 score, with hover preview. */
const RatingStars = ({ value = 0, onRate, disabled = false }) => {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((step) => {
          const score = step * 2;
          return (
            <button
              key={step}
              type="button"
              disabled={disabled}
              onMouseEnter={() => setHover(score)}
              onClick={() => onRate?.(score)}
              aria-label={`Rate ${score} out of 10`}
              className="tv-focusable p-0.5 transition-transform duration-150 hover:scale-110 active:scale-95 disabled:cursor-not-allowed"
            >
              <FaStar
                className={`h-[18px] w-[18px] transition-colors duration-150 ${
                  score <= shown ? "text-accent" : "text-white/15"
                }`}
              />
            </button>
          );
        })}
      </div>
      <span className="text-[11px] text-textsecondary">
        {value ? `You rated ${value}/10` : "Rate this title"}
      </span>
    </div>
  );
};

export default RatingStars;
