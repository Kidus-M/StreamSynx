/** Number / time formatting shared by the analytics dashboard. */

export const fmtInt = (value) => Math.round(value || 0).toLocaleString("en-US");

export const fmtCompact = (value) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);

export const fmtPct = (ratio, digits = 0) => `${((ratio || 0) * 100).toFixed(digits)}%`;

/** 0 → "0m", 95s → "1m 35s", 2h 5m, 3d 4h. */
export const fmtDuration = (ms) => {
  const s = Math.round((ms || 0) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 && m < 10 ? `${m}m ${s % 60}s` : `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}d ${h % 24}h` : `${d}d`;
};

export const fmtHours = (ms) => {
  const h = (ms || 0) / 3600000;
  return h >= 100 ? `${fmtInt(h)}h` : `${h.toFixed(1)}h`;
};

export const fmtAgo = (time, now = Date.now()) => {
  if (!time) return "—";
  const s = Math.max(0, Math.round((now - time) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d < 30 ? `${d}d ago` : new Date(time).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const fmtDate = (time, step = "day") =>
  new Date(time).toLocaleString("en-US", step === "hour" ? { hour: "numeric" } : { month: "short", day: "numeric" });

const regionNames =
  typeof Intl !== "undefined" && Intl.DisplayNames ? new Intl.DisplayNames(["en"], { type: "region" }) : null;

export const countryName = (code) => {
  if (!code || code === "XX") return "Unknown";
  try {
    return regionNames?.of(code) || code;
  } catch {
    return code;
  }
};

/** Change vs. the previous period; null when there is nothing to compare to. */
export const delta = (current, previous) => {
  if (!previous) return current ? null : 0;
  return (current - previous) / previous;
};

export const initials = (name, email) =>
  (name || email || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
