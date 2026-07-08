import React from "react";
import { FaServer } from "react-icons/fa";

const EmbeddedSourceSelector = ({ sources, selectedSourceId, mediaType, onSelect }) => {
  const availableSources = (sources || []).filter((source) => {
    return mediaType === "tv" ? source.tvTemplate : source.movieTemplate;
  });

  if (availableSources.length <= 1) return null;

  return (
    <section className="glass-card p-4 md:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <FaServer className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-textsecondary">
          Player Sources
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {availableSources.map((source) => {
          const isSelected = source.id === selectedSourceId;

          return (
            <button
              key={source.id}
              type="button"
              onClick={() => onSelect(source.id)}
              className={`tv-focusable rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                isSelected
                  ? "border-accent bg-accent text-primary shadow-lg shadow-accent/20"
                  : "border-white/[0.08] bg-white/[0.05] text-textsecondary hover:border-white/20 hover:text-textprimary"
              }`}
              aria-pressed={isSelected}
            >
              {source.name}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default EmbeddedSourceSelector;
