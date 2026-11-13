/**
 * Hand-rolled SVG charts for the analytics dashboard. No chart library: each
 * piece does one job, draws thin marks on recessive axes, and has a hover
 * layer. Colors come from the CSS variables set on the dashboard root.
 */
import { useEffect, useMemo, useRef, useState } from "react";

/** Tracks an element's content width. */
export const useWidth = (initial = 600) => {
  const ref = useRef(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, entry.contentRect.width)));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
};

const niceMax = (value) => {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
};

/**
 * Single-series trend: area + 2px line, crosshair and tooltip on hover.
 * `points`: [{ t, value }]; `format` formats a value; `label` formats a t.
 */
export function TrendChart({ points, format, label, height = 260, name }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const pad = { top: 16, right: 12, bottom: 28, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const x = (i) => pad.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - (v / max) * innerH;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area = points.length
    ? `${line}L${x(points.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`
    : "";
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(innerW / 80))));

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left - pad.left;
    const i = Math.round((px / innerW) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };

  const hovered = hover !== null ? points[hover] : null;

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg width={width} height={height} role="img" aria-label={`${name} over time`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--a-accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--a-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--a-grid)" strokeDasharray={t ? "2 4" : undefined} />
            <text x={pad.left - 10} y={y(t) + 4} textAnchor="end" className="fill-[color:var(--a-muted)] text-[10px] tabular-nums">
              {format(t, true)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text key={p.t} x={x(i)} y={height - 8} textAnchor="middle" className="fill-[color:var(--a-muted)] text-[10px]">
              {label(p.t)}
            </text>
          ) : null
        )}
        <path d={area} fill="url(#trendFill)" />
        <path d={line} fill="none" stroke="var(--a-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hovered && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} stroke="var(--a-ink-2)" strokeOpacity="0.5" />
            <circle cx={x(hover)} cy={y(hovered.value)} r="5" fill="var(--a-accent)" stroke="var(--a-surface)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute top-2 z-10 rounded-md border border-[color:var(--a-line)] bg-[color:var(--a-raised)] px-3 py-2 text-xs shadow-xl"
          style={{ left: Math.min(width - 150, Math.max(0, x(hover) + 12)) }}
        >
          <div className="text-[color:var(--a-muted)]">{label(hovered.t, true)}</div>
          <div className="mt-0.5 font-medium tabular-nums text-[color:var(--a-ink)]">
            {format(hovered.value)} <span className="text-[color:var(--a-muted)]">{name}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Ranked rows with a proportional fill behind each — the Plausible/Vercel
 * pattern; reads faster than any pie. `rows`: [{ key, value, label?, hint? }].
 */
export function BarList({ rows, format = (v) => v, empty = "No data yet", max: maxRows = 8, valueLabel }) {
  const [expanded, setExpanded] = useState(false);
  if (!rows?.length) return <p className="py-6 text-sm text-[color:var(--a-muted)]">{empty}</p>;
  const top = Math.max(...rows.map((r) => r.value), 1);
  const visible = expanded ? rows : rows.slice(0, maxRows);
  return (
    <div>
      {valueLabel && (
        <div className="mb-1 flex justify-end text-[10px] uppercase tracking-[0.14em] text-[color:var(--a-muted)]">{valueLabel}</div>
      )}
      <ul className="space-y-[3px]">
        {visible.map((row) => (
          <li key={row.key} className="group relative flex h-8 items-center justify-between gap-3 px-2.5 text-[13px]" title={row.hint || undefined}>
            <span
              className="absolute inset-y-0 left-0 rounded-[3px] bg-[color:var(--a-bar)] transition-colors group-hover:bg-[color:var(--a-bar-hover)]"
              style={{ width: `${Math.max(1.5, (row.value / top) * 100)}%` }}
            />
            <span className="relative truncate text-[color:var(--a-ink)]">{row.label ?? row.key}</span>
            <span className="relative shrink-0 tabular-nums text-[color:var(--a-ink-2)]">{format(row.value)}</span>
          </li>
        ))}
      </ul>
      {rows.length > maxRows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[color:var(--a-muted)] hover:text-[color:var(--a-accent)]"
        >
          {expanded ? "Show less" : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** 7 x 24 heatmap of sessions by the visitor's local weekday/hour. Sequential gold ramp. */
export function RhythmHeatmap({ grid }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...grid.flat());
  const total = grid.flat().reduce((a, b) => a + b, 0);
  return (
    <div className="relative">
      <div className="grid grid-cols-[32px_repeat(24,minmax(0,1fr))] gap-[2px]">
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-center text-[9px] tabular-nums text-[color:var(--a-muted)]">
            {h % 3 === 0 ? h : ""}
          </span>
        ))}
        {grid.map((row, d) => [
          <span key={`l${d}`} className="pr-1 text-[10px] leading-[18px] text-[color:var(--a-muted)]">
            {DAYS[d]}
          </span>,
          ...row.map((value, h) => (
            <span
              key={`${d}-${h}`}
              onMouseEnter={() => setHover({ d, h, value })}
              onMouseLeave={() => setHover(null)}
              className="h-[18px] rounded-[2px] outline-offset-1 hover:outline hover:outline-1 hover:outline-[color:var(--a-ink-2)]"
              style={{
                background: value ? "var(--a-accent)" : "var(--a-empty)",
                opacity: value ? 0.15 + 0.85 * (value / max) : 1,
              }}
            />
          )),
        ])}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-[color:var(--a-muted)]">
        <span>
          {hover
            ? `${DAYS[hover.d]} ${String(hover.h).padStart(2, "0")}:00 — ${hover.value} session${hover.value === 1 ? "" : "s"}`
            : total
              ? "Visitor's local time. Hover a cell."
              : "No sessions yet"}
        </span>
        <span className="flex items-center gap-1.5">
          fewer
          {[0.15, 0.4, 0.65, 1].map((o) => (
            <i key={o} className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: "var(--a-accent)", opacity: o }} />
          ))}
          more
        </span>
      </div>
    </div>
  );
}

/** Two-part share bar with direct labels (movie vs TV). */
export function SplitBar({ parts, format }) {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  if (!total) return <p className="text-sm text-[color:var(--a-muted)]">Nothing watched yet</p>;
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
        {parts.map((p) =>
          p.value ? <span key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} /> : null
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-2 text-[color:var(--a-ink-2)]">
            <i className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.label}
            <b className="font-medium tabular-nums text-[color:var(--a-ink)]">{format(p.value)}</b>
            <span className="tabular-nums text-[color:var(--a-muted)]">{Math.round((p.value / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** 24 tiny bars: when in the day a person is around. */
export function HourBars({ hours }) {
  const max = Math.max(1, ...hours);
  return (
    <div>
      <div className="flex h-12 items-end gap-[2px]">
        {hours.map((v, h) => (
          <span
            key={h}
            title={`${h}:00`}
            className="flex-1 rounded-t-[2px]"
            style={{ height: `${Math.max(4, (v / max) * 100)}%`, background: v ? "var(--a-accent)" : "var(--a-empty)" }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[9px] tabular-nums text-[color:var(--a-muted)]">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </div>
  );
}

const STATUS = {
  good: { color: "var(--a-good)", label: "Good", glyph: "●" },
  needs: { color: "var(--a-warn)", label: "Needs work", glyph: "▲" },
  poor: { color: "var(--a-bad)", label: "Poor", glyph: "■" },
};

/** One Core Web Vital: p75 headline, status glyph + label, distribution bar. */
export function VitalCard({ name, label, data, thresholds, unit }) {
  const fmt = (v) => (v === null || v === undefined ? "—" : unit === "" ? v.toFixed(3) : v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${Math.round(v)}ms`);
  const status = data.p75 === null ? null : data.p75 <= thresholds[0] ? "good" : data.p75 <= thresholds[1] ? "needs" : "poor";
  const total = data.good + data.needs + data.poor;
  return (
    <div className="border-t border-[color:var(--a-line)] pt-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--a-ink-2)]">{name}</span>
        {status && (
          <span className="text-[11px]" style={{ color: STATUS[status].color }}>
            {STATUS[status].glyph} {STATUS[status].label}
          </span>
        )}
      </div>
      <div className="mt-1 font-dm-display text-3xl tabular-nums text-[color:var(--a-ink)]">{fmt(data.p75)}</div>
      <div className="text-[11px] text-[color:var(--a-muted)]">
        {label} · p75 of {data.samples}
      </div>
      {total > 0 && (
        <div className="mt-3 flex h-1.5 gap-[2px] overflow-hidden rounded-full">
          {["good", "needs", "poor"].map((k) =>
            data[k] ? <span key={k} title={`${STATUS[k].label}: ${data[k]}`} style={{ width: `${(data[k] / total) * 100}%`, background: STATUS[k].color }} /> : null
          )}
        </div>
      )}
    </div>
  );
}

/** Memoized helper so charts don't recompute on every live refresh. */
export const useSeries = (points, key) => useMemo(() => points.map((p) => ({ t: p.t, value: p[key] })), [points, key]);
