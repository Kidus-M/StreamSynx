import React from "react";
import { profileUrl } from "../lib/tmdb";

const CastRow = ({ cast = [], title = "Cast" }) => {
  if (!cast.length) return null;

  return (
    <div>
      <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-textsecondary">
        {title}
      </h3>
      <div className="rail flex gap-4 overflow-x-auto pb-1">
        {cast.map((person) => {
          const photo = profileUrl(person.profile_path);
          return (
            <div key={person.id ?? person.cast_id} className="w-[84px] shrink-0 text-center">
              <div className="mx-auto h-[84px] w-[84px] overflow-hidden rounded-full border border-white/[0.08] bg-secondary">
                {photo ? (
                  <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-medium text-textsecondary">
                    {person.name?.charAt(0)}
                  </div>
                )}
              </div>
              <p className="mt-2 truncate text-[12px] font-medium text-textprimary">{person.name}</p>
              <p className="truncate text-[11px] text-textsecondary">{person.character}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CastRow;
