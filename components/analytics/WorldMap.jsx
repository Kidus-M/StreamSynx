/**
 * Where people watch from: city bubbles (area ∝ visitors) on a Natural Earth
 * landmass, with live sessions pulsing. Coordinates come from Vercel's IP geo
 * headers, so they are city-level, never precise.
 */
import { useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json";
import { useWidth } from "./charts";
import { countryName, fmtDuration } from "./format";

const LAND = feature(land110, land110.objects.land);
const RATIO = 0.5;

export default function WorldMap({ cities, live }) {
  const [ref, width] = useWidth(900);
  const [hover, setHover] = useState(null);
  const height = Math.round(width * RATIO);

  const { path, projection, graticule } = useMemo(() => {
    const proj = geoNaturalEarth1().fitExtent(
      [
        [4, 4],
        [width - 4, height - 4],
      ],
      { type: "Sphere" }
    );
    const draw = geoPath(proj);
    return { path: draw(LAND), projection: proj, graticule: draw(geoGraticule10()) };
  }, [width, height]);

  const max = Math.max(1, ...cities.map((c) => c.visitors));
  const radius = (v) => 3 + Math.sqrt(v / max) * Math.min(26, width / 36);

  const dots = cities
    .map((c) => ({ ...c, xy: projection([c.lon, c.lat]) }))
    .filter((c) => c.xy)
    // Big bubbles first so small ones stay on top and hoverable.
    .sort((a, b) => b.visitors - a.visitors);

  const liveDots = live
    .filter((s) => s.lat !== null && s.lon !== null)
    .map((s) => ({ ...s, xy: projection([s.lon, s.lat]) }))
    .filter((s) => s.xy);

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={height} role="img" aria-label="Map of visitor locations">
        <path d={graticule} fill="none" stroke="var(--a-grid)" strokeWidth="0.5" />
        <path d={path} fill="var(--a-land)" stroke="var(--a-land-edge)" strokeWidth="0.6" />
        {dots.map((c) => (
          <circle
            key={`${c.city}-${c.country}`}
            cx={c.xy[0]}
            cy={c.xy[1]}
            r={radius(c.visitors)}
            fill="var(--a-accent)"
            fillOpacity={hover && hover.city === c.city ? 0.75 : 0.35}
            stroke="var(--a-accent)"
            strokeWidth="1"
            onMouseEnter={() => setHover(c)}
            onMouseLeave={() => setHover(null)}
            className="cursor-default transition-[fill-opacity]"
          />
        ))}
        {liveDots.map((s) => (
          <g key={s.sid} transform={`translate(${s.xy[0]},${s.xy[1]})`} pointerEvents="none">
            <circle r="4" fill="var(--a-live)">
              <animate attributeName="r" values="4;14;4" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle r="3.5" fill="var(--a-live)" stroke="var(--a-surface)" strokeWidth="1.5" />
          </g>
        ))}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 min-w-[160px] rounded-md border border-[color:var(--a-line)] bg-[color:var(--a-raised)] px-3 py-2 text-xs shadow-xl"
          style={{ left: Math.min(width - 180, hover.xy[0] + 14), top: Math.max(0, hover.xy[1] - 20) }}
        >
          <div className="font-medium text-[color:var(--a-ink)]">{hover.city}</div>
          <div className="text-[color:var(--a-muted)]">
            {[hover.region, countryName(hover.country)].filter(Boolean).join(", ")}
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-x-3 tabular-nums text-[color:var(--a-ink-2)]">
            <span>Visitors</span>
            <span className="text-right">{hover.visitors}</span>
            <span>Sessions</span>
            <span className="text-right">{hover.sessions}</span>
            <span>Watched</span>
            <span className="text-right">{fmtDuration(hover.watchMs)}</span>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-4 text-[10px] uppercase tracking-[0.14em] text-[color:var(--a-muted)]">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full border border-[color:var(--a-accent)] bg-[color:var(--a-accent)]/40" />
          visitors by city
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2 w-2 rounded-full bg-[color:var(--a-live)]" />
          live now
        </span>
      </div>
    </div>
  );
}
