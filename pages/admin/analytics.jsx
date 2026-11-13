/**
 * /admin/analytics — the owner's view of how StreamSynx is used.
 *
 * Access: you must be signed in, and /api/admin/analytics only answers for the
 * owner account (see lib/server/requireAdmin.js). Anyone else sees a plain
 * "not found"; no data ever reaches their browser.
 */
import "@fontsource/dm-serif-display/400.css";
import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "../../firebase";
import { useRequireAuth } from "../../lib/auth";
import { BarList, HourBars, RhythmHeatmap, SplitBar, TrendChart, VitalCard, useSeries } from "../../components/analytics/charts";
import WorldMap from "../../components/analytics/WorldMap";
import {
  countryName,
  delta,
  fmtAgo,
  fmtCompact,
  fmtDate,
  fmtDuration,
  fmtHours,
  fmtInt,
  fmtPct,
  initials,
} from "../../components/analytics/format";

const RANGES = [
  { key: "24h", label: "24 hours" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];
const REFRESH_MS = 60 * 1000;
const THRESHOLDS = { LCP: [2500, 4000], INP: [200, 500], CLS: [0.1, 0.25], FCP: [1800, 3000], TTFB: [800, 1800] };
const MOVIE = "#B07F1F";
const TV = "#5B8DEF";

const SECTIONS = [
  ["overview", "Overview"],
  ["live", "Live"],
  ["audience", "Audience"],
  ["people", "People"],
  ["content", "Content"],
  ["rhythm", "Rhythm"],
  ["acquisition", "Acquisition"],
  ["technology", "Technology"],
  ["performance", "Performance"],
  ["accounts", "Accounts"],
  ["sessions", "Sessions"],
];

/* ------------------------------- data hook -------------------------------- */

function useAnalytics(user, range) {
  const [state, setState] = useState({ data: null, error: null, status: "idle", loadedAt: 0 });

  const load = useCallback(async () => {
    if (!user) return;
    setState((s) => ({ ...s, status: s.data ? "refreshing" : "loading" }));
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/analytics?range=${range}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ data: null, error: { status: res.status, ...body }, status: "error", loadedAt: Date.now() });
        return;
      }
      setState({ data: body, error: null, status: "ready", loadedAt: Date.now() });
    } catch (error) {
      setState((s) => ({ ...s, error: { status: 0, error: error.message }, status: "error" }));
    }
  }, [user, range]);

  useEffect(() => {
    load();
    const timer = setInterval(() => document.visibilityState === "visible" && load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  return { ...state, reload: load };
}

/* ------------------------------ small pieces ------------------------------ */

function Section({ id, index, title, note, children, aside }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-[color:var(--a-line)] pt-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] tabular-nums text-[color:var(--a-accent)]">{String(index).padStart(2, "0")}</span>
          <h2 className="font-dm-display text-[26px] leading-none text-[color:var(--a-ink)]">{title}</h2>
          {note && <span className="hidden text-xs text-[color:var(--a-muted)] sm:inline">{note}</span>}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

function Panel({ title, children, className = "" }) {
  return (
    <div className={`min-w-0 ${className}`}>
      {title && <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--a-ink-2)]">{title}</h3>}
      {children}
    </div>
  );
}

function Delta({ current, previous, invert = false }) {
  const d = delta(current, previous);
  if (d === null) return <span className="text-[11px] text-[color:var(--a-muted)]">new</span>;
  if (Math.abs(d) < 0.005) return <span className="text-[11px] text-[color:var(--a-muted)]">— flat</span>;
  const up = d > 0;
  const good = invert ? !up : up;
  return (
    <span className="text-[11px] tabular-nums" style={{ color: good ? "var(--a-good)" : "var(--a-bad)" }}>
      {up ? "▲" : "▼"} {fmtPct(Math.abs(d), Math.abs(d) < 0.1 ? 1 : 0)}
    </span>
  );
}

function Kpi({ label, value, current, previous, invert, active, onClick, hint }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={hint}
      className={`group relative min-w-0 border-t-2 pb-1 pt-3 text-left transition-colors ${
        active ? "border-[color:var(--a-accent)]" : "border-[color:var(--a-line)] hover:border-[color:var(--a-ink-2)]"
      }`}
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--a-muted)] group-hover:text-[color:var(--a-ink-2)]">{label}</div>
      <div className="mt-1.5 font-dm-display text-[34px] leading-none tabular-nums text-[color:var(--a-ink)]">{value}</div>
      <div className="mt-1.5 h-4">{previous !== undefined && <Delta current={current} previous={previous} invert={invert} />}</div>
    </Tag>
  );
}

function Avatar({ name, email, photo, size = 28 }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[color:var(--a-raised)] text-[10px] font-semibold text-[color:var(--a-ink-2)] ring-1 ring-[color:var(--a-line)]"
      style={{ width: size, height: size }}
    >
      {initials(name, email)}
    </span>
  );
}

const deviceLabel = (device) =>
  device ? `${device.app && device.app !== "Web" ? device.app : device.browser} · ${device.os}` : "—";

const Stat = ({ label, value, sub }) => (
  <div className="border-l border-[color:var(--a-line)] pl-4">
    <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--a-muted)]">{label}</div>
    <div className="mt-1 font-dm-display text-2xl tabular-nums text-[color:var(--a-ink)]">{value}</div>
    {sub && <div className="text-[11px] text-[color:var(--a-muted)]">{sub}</div>}
  </div>
);

/* ------------------------------ person drawer ----------------------------- */

function PersonDrawer({ person, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!person) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Details for ${person.name || person.email}`}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="relative h-full w-full max-w-[460px] overflow-y-auto border-l border-[color:var(--a-line)] bg-[color:var(--a-surface)] p-6">
        <button type="button" onClick={onClose} className="absolute right-5 top-5 text-xs uppercase tracking-[0.14em] text-[color:var(--a-muted)] hover:text-[color:var(--a-ink)]">
          Close ✕
        </button>
        <div className="flex items-center gap-3">
          <Avatar name={person.name} email={person.email} photo={person.photo} size={44} />
          <div className="min-w-0">
            <div className="truncate font-dm-display text-2xl text-[color:var(--a-ink)]">{person.name || person.email.split("@")[0]}</div>
            <div className="truncate text-xs text-[color:var(--a-muted)]">{person.email}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-y-5">
          <Stat label="Watched" value={fmtDuration(person.watchMs)} sub={`${fmtDuration(person.lifetime.watchMs)} all time`} />
          <Stat label="Time on site" value={fmtDuration(person.activeMs)} sub={`${fmtDuration(person.lifetime.activeMs)} all time`} />
          <Stat label="Sessions" value={person.sessions} sub={`${person.lifetime.sessions} all time`} />
          <Stat label="Pages" value={person.pageviews} sub={person.createdAt ? `joined ${fmtAgo(person.createdAt)}` : ""} />
        </div>

        <dl className="mt-6 grid grid-cols-[110px_1fr] gap-y-2 text-sm">
          <dt className="text-[color:var(--a-muted)]">Usually from</dt>
          <dd className="text-[color:var(--a-ink)]">{person.place || "—"}</dd>
          <dt className="text-[color:var(--a-muted)]">Usually on</dt>
          <dd className="text-[color:var(--a-ink)]">{person.device || "—"}</dd>
          <dt className="text-[color:var(--a-muted)]">Last seen</dt>
          <dd className="text-[color:var(--a-ink)]">{fmtAgo(person.lastSeenAt)}</dd>
        </dl>

        <div className="mt-7">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--a-ink-2)]">When they show up (local time)</h4>
          <HourBars hours={person.hours} />
        </div>

        <div className="mt-7">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--a-ink-2)]">What they watched</h4>
          <BarList
            rows={person.titles.map((t) => ({
              key: `${t.mt}_${t.id}`,
              label: (
                <span>
                  {t.title || `#${t.id}`}{" "}
                  <span className="text-[color:var(--a-muted)]">{t.mt === "tv" ? `TV${t.episodes ? ` · ${t.episodes} ep` : ""}` : "Film"}</span>
                </span>
              ),
              value: t.ms,
            }))}
            format={fmtDuration}
            empty="No watch time in this range"
          />
        </div>

        <div className="mt-7">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--a-ink-2)]">Recent sessions</h4>
          <ul className="divide-y divide-[color:var(--a-line)] text-[13px]">
            {person.recent.map((s) => (
              <li key={`${s.startedAt}-${s.activeMs}`} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="text-[color:var(--a-ink)]">{new Date(s.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                  <span className="block truncate text-[11px] text-[color:var(--a-muted)]">
                    {[s.city, countryName(s.country)].filter(Boolean).join(", ")} · {deviceLabel(s.device)}
                  </span>
                </span>
                <span className="shrink-0 text-right tabular-nums text-[color:var(--a-ink-2)]">
                  {fmtDuration(s.activeMs)}
                  {s.watchMs > 0 && <span className="block text-[11px] text-[color:var(--a-accent)]">▶ {fmtDuration(s.watchMs)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

/* --------------------------------- gates ---------------------------------- */

function Gate({ title, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0B0E] px-6 text-center text-[#F4F4F5]">
      <div className="max-w-sm">
        <h1 className="font-dm-display text-4xl">{title}</h1>
        <div className="mt-3 text-sm text-[#9B9BA5]">{children}</div>
      </div>
    </div>
  );
}

function ErrorGate({ error, onRetry }) {
  const [sent, setSent] = useState(false);
  if (error.status === 404) {
    return (
      <Gate title="Not found">
        There is nothing here. <Link href="/" className="text-[#E9B949] underline-offset-4 hover:underline">Back to StreamSynx</Link>
      </Gate>
    );
  }
  if (error.code === "unverified") {
    return (
      <Gate title="Verify your email">
        <p>Analytics opens only for the owner account with a verified email address.</p>
        <button
          type="button"
          disabled={sent}
          onClick={async () => {
            if (auth.currentUser) await sendEmailVerification(auth.currentUser).catch(() => {});
            setSent(true);
          }}
          className="mt-5 rounded-full bg-[#E9B949] px-5 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          {sent ? "Sent — check your inbox, then sign in again" : "Send verification email"}
        </button>
      </Gate>
    );
  }
  return (
    <Gate title="Couldn’t load analytics">
      <p className="break-words">{error.error || "Something went wrong."}</p>
      <button type="button" onClick={onRetry} className="mt-5 rounded-full border border-white/15 px-5 py-2 text-sm hover:border-[#E9B949]">
        Try again
      </button>
    </Gate>
  );
}

/* --------------------------------- page ----------------------------------- */

const METRICS = {
  visitors: { name: "visitors", key: "visitors", format: (v, axis) => (axis ? fmtCompact(v) : fmtInt(v)) },
  users: { name: "signed-in users", key: "users", format: (v, axis) => (axis ? fmtCompact(v) : fmtInt(v)) },
  sessions: { name: "sessions", key: "sessions", format: (v, axis) => (axis ? fmtCompact(v) : fmtInt(v)) },
  watch: { name: "watched", key: "watchMs", format: (v, axis) => (axis ? fmtHours(v) : fmtDuration(v)) },
  pageviews: { name: "page views", key: "pageviews", format: (v, axis) => (axis ? fmtCompact(v) : fmtInt(v)) },
  signups: { name: "sign-ups", key: "signups", format: (v, axis) => (axis ? fmtCompact(v) : fmtInt(v)) },
};

export default function AnalyticsPage() {
  const { user, loading } = useRequireAuth();
  const [range, setRange] = useState("7d");
  const [metric, setMetric] = useState("visitors");
  const [person, setPerson] = useState(null);
  const [peopleView, setPeopleView] = useState("range");
  const [now, setNow] = useState(Date.now());
  const { data, error, status, loadedAt, reload } = useAnalytics(user, range);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const m = METRICS[metric];
  const series = useSeries(data?.series.points || [], m.key);
  const step = data?.series.step || "day";

  const countryRows = useMemo(
    () =>
      (data?.geo.countries || []).map((c) => ({
        key: c.code,
        label: (
          <span className="flex items-center gap-2">
            <span className="w-6 font-mono text-[10px] text-[color:var(--a-muted)]">{c.code}</span>
            {countryName(c.code)}
          </span>
        ),
        value: c.visitors,
        hint: `${c.sessions} sessions · ${fmtDuration(c.watchMs)} watched · ${c.users} signed in`,
      })),
    [data]
  );

  if (loading || (!data && !error)) {
    return (
      <Gate title="Analytics">
        <span className="inline-block animate-pulse">Loading…</span>
      </Gate>
    );
  }
  if (!user) return null;
  if (error && !data) return <ErrorGate error={error} onRetry={reload} />;

  const s = data.summary;
  const p = data.previous;
  const leaders = peopleView === "range" ? data.people : data.lifetimeLeaders;
  const topUser = data.people[0];

  return (
    <div
      className="min-h-screen bg-[color:var(--a-bg)] text-[color:var(--a-ink)] antialiased"
      style={{
        "--a-bg": "#0B0B0E",
        "--a-surface": "#101015",
        "--a-raised": "#17171E",
        "--a-line": "rgba(255,255,255,0.08)",
        "--a-grid": "rgba(255,255,255,0.07)",
        "--a-ink": "#F4F4F5",
        "--a-ink-2": "#B9B9C3",
        "--a-muted": "#7C7C88",
        "--a-accent": "#E9B949",
        "--a-bar": "rgba(233,185,73,0.13)",
        "--a-bar-hover": "rgba(233,185,73,0.22)",
        "--a-empty": "rgba(255,255,255,0.04)",
        "--a-land": "#1A1A21",
        "--a-land-edge": "#2A2A33",
        "--a-live": "#4ADE80",
        "--a-good": "#4CC38A",
        "--a-warn": "#F0A44B",
        "--a-bad": "#F2685E",
      }}
    >
      <Head>
        <title>Analytics · StreamSynx</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-[color:var(--a-line)] bg-[rgba(11,11,14,0.9)] backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="font-semibold tracking-tight text-[color:var(--a-ink)]">
              StreamSynx
            </Link>
            <span className="text-[color:var(--a-muted)]">/</span>
            <span className="text-[color:var(--a-ink-2)]">Analytics</span>
            <span className="ml-2 flex items-center gap-1.5 rounded-full border border-[color:var(--a-line)] px-2.5 py-0.5 text-xs">
              <span className="relative flex h-2 w-2">
                {data.live.length > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--a-live)] opacity-60" />}
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: data.live.length ? "var(--a-live)" : "var(--a-muted)" }} />
              </span>
              <span className="tabular-nums">{data.live.length}</span>
              <span className="text-[color:var(--a-muted)]">live</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[11px] text-[color:var(--a-muted)] md:inline">
              {status === "refreshing" ? "Refreshing…" : `Updated ${fmtAgo(loadedAt, now)}`}
            </span>
            <div className="flex rounded-full border border-[color:var(--a-line)] p-0.5 text-xs" role="tablist" aria-label="Date range">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  role="tab"
                  aria-selected={range === r.key}
                  onClick={() => setRange(r.key)}
                  className={`rounded-full px-3 py-1 transition-colors ${
                    range === r.key ? "bg-[color:var(--a-accent)] font-medium text-black" : "text-[color:var(--a-ink-2)] hover:text-[color:var(--a-ink)]"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1440px] gap-10 px-4 pb-24 sm:px-8">
        {/* Section rail */}
        <nav className="sticky top-20 hidden h-max w-36 shrink-0 pt-10 lg:block" aria-label="Sections">
          <ol className="space-y-1.5 text-[13px]">
            {SECTIONS.map(([id, label], i) => (
              <li key={id}>
                <a href={`#${id}`} className="flex gap-2.5 text-[color:var(--a-muted)] hover:text-[color:var(--a-ink)]">
                  <span className="font-mono text-[10px] leading-5 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <main className="min-w-0 flex-1 space-y-14 pt-8">
          {/* Masthead */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--a-muted)]">
              {RANGES.find((r) => r.key === range)?.label} · compared with the {RANGES.find((r) => r.key === range)?.label} before
            </p>
            <h1 className="mt-2 max-w-3xl font-dm-display text-4xl leading-[1.1] text-[color:var(--a-ink)] sm:text-5xl">
              {fmtInt(s.visitors)} people dropped in and watched <span className="text-[color:var(--a-accent)]">{fmtHours(s.watchMs)}</span>.
            </h1>
            {topUser && (
              <p className="mt-3 text-sm text-[color:var(--a-ink-2)]">
                Most devoted:{" "}
                <button type="button" className="text-[color:var(--a-ink)] underline decoration-[color:var(--a-accent)] underline-offset-4" onClick={() => setPerson(topUser)}>
                  {topUser.name || topUser.email}
                </button>{" "}
                — {fmtDuration(topUser.activeMs)} on StreamSynx, {fmtDuration(topUser.watchMs)} of it watching, over {topUser.sessions} session{topUser.sessions === 1 ? "" : "s"}.
                {data.truncated && " (Range capped at the newest 15,000 sessions.)"}
              </p>
            )}
          </div>

          {/* 01 Overview */}
          <Section id="overview" index={1} title="Overview" note="Click a number to chart it">
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 xl:grid-cols-8">
              <Kpi label="Visitors" value={fmtCompact(s.visitors)} current={s.visitors} previous={p.visitors} active={metric === "visitors"} onClick={() => setMetric("visitors")} hint="Unique browsers" />
              <Kpi label="Signed in" value={fmtCompact(s.users)} current={s.users} previous={p.users} active={metric === "users"} onClick={() => setMetric("users")} hint="Unique accounts" />
              <Kpi label="Sessions" value={fmtCompact(s.sessions)} current={s.sessions} previous={p.sessions} active={metric === "sessions"} onClick={() => setMetric("sessions")} />
              <Kpi label="Watch time" value={fmtHours(s.watchMs)} current={s.watchMs} previous={p.watchMs} active={metric === "watch"} onClick={() => setMetric("watch")} hint="Visible player time" />
              <Kpi label="Page views" value={fmtCompact(s.pageviews)} current={s.pageviews} previous={p.pageviews} active={metric === "pageviews"} onClick={() => setMetric("pageviews")} />
              <Kpi label="Sign-ups" value={fmtInt(s.signups)} current={s.signups} previous={p.signups} active={metric === "signups"} onClick={() => setMetric("signups")} />
              <Kpi label="Median visit" value={fmtDuration(s.medianSessionMs)} current={s.medianSessionMs} previous={p.medianSessionMs} hint="Visible time per session" />
              <Kpi label="Bounce" value={fmtPct(s.bounceRate)} current={s.bounceRate} previous={p.bounceRate} invert hint="One page, under 30s, nothing watched" />
            </div>
            <div className="mt-8">
              <TrendChart points={series} format={m.format} label={(t, long) => (long && step === "hour" ? new Date(t).toLocaleString("en-US", { weekday: "short", hour: "numeric" }) : fmtDate(t, step))} name={m.name} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
              <Stat label="Watch rate" value={fmtPct(s.watchRate)} sub="sessions that played ≥1 min" />
              <Stat label="Pages / visit" value={s.viewsPerSession.toFixed(1)} />
              <Stat label="Returning" value={fmtPct(data.loyalty.returningRate)} sub="visitors with 2+ sessions" />
              <Stat label="Stickiness" value={fmtPct(data.loyalty.stickiness)} sub="avg daily ÷ range users" />
            </div>
          </Section>

          {/* 02 Live */}
          <Section id="live" index={2} title="Live now" note="Active in the last two minutes · refreshes every minute">
            {data.live.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-[13px]">
                  <thead className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--a-muted)]">
                    <tr>
                      <th className="pb-2 font-normal">Who</th>
                      <th className="pb-2 font-normal">Where</th>
                      <th className="pb-2 font-normal">On</th>
                      <th className="pb-2 font-normal">Doing</th>
                      <th className="pb-2 text-right font-normal">Here for</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--a-line)]">
                    {data.live.map((v) => (
                      <tr key={v.sid}>
                        <td className="py-2.5 pr-4">{v.name || v.email || <span className="text-[color:var(--a-muted)]">Guest</span>}</td>
                        <td className="py-2.5 pr-4 text-[color:var(--a-ink-2)]">{[v.city, countryName(v.country)].filter(Boolean).join(", ")}</td>
                        <td className="py-2.5 pr-4 text-[color:var(--a-ink-2)]">{deviceLabel(v.device)}</td>
                        <td className="py-2.5 pr-4">
                          {v.watching ? <span className="text-[color:var(--a-accent)]">▶ {v.watching}</span> : <span className="font-mono text-xs text-[color:var(--a-ink-2)]">{v.path}</span>}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-[color:var(--a-ink-2)]">{fmtDuration(v.activeMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[color:var(--a-muted)]">Nobody is on the site right now.</p>
            )}
          </Section>

          {/* 03 Audience */}
          <Section id="audience" index={3} title="Audience" note={`${data.geo.countries.filter((c) => c.code !== "XX").length} countries · ${data.geo.cities.length} cities`}>
            <div className="grid gap-10 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <WorldMap cities={data.geo.cities} live={data.live} />
              <Panel title="Countries">
                <BarList rows={countryRows} format={fmtInt} valueLabel="Visitors" max={9} />
              </Panel>
            </div>
            <div className="mt-10 grid gap-10 md:grid-cols-2">
              <Panel title="Cities">
                <BarList
                  rows={data.geo.cities.map((c) => ({
                    key: `${c.city}|${c.country}`,
                    label: (
                      <span>
                        {c.city} <span className="text-[color:var(--a-muted)]">{countryName(c.country)}</span>
                      </span>
                    ),
                    value: c.visitors,
                    hint: `${c.sessions} sessions · ${fmtDuration(c.watchMs)} watched`,
                  }))}
                  format={fmtInt}
                  valueLabel="Visitors"
                />
              </Panel>
              <Panel title="Watch time by country">
                <BarList
                  rows={data.geo.countries.filter((c) => c.watchMs > 0).map((c) => ({ key: c.code, label: countryName(c.code), value: c.watchMs })).sort((a, b) => b.value - a.value)}
                  format={fmtDuration}
                  empty="Nothing watched yet"
                  valueLabel="Watched"
                />
              </Panel>
            </div>
          </Section>

          {/* 04 People */}
          <Section
            id="people"
            index={4}
            title="People"
            note="Signed-in accounts, ranked by total time on StreamSynx"
            aside={
              <div className="flex rounded-full border border-[color:var(--a-line)] p-0.5 text-xs">
                {[
                  ["range", "This range"],
                  ["lifetime", "All time"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPeopleView(key)}
                    className={`rounded-full px-3 py-1 ${peopleView === key ? "bg-[color:var(--a-raised)] text-[color:var(--a-ink)]" : "text-[color:var(--a-muted)]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            }
          >
            {leaders.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-[13px]">
                  <thead className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--a-muted)]">
                    <tr>
                      <th className="w-8 pb-2 font-normal">#</th>
                      <th className="pb-2 font-normal">Account</th>
                      <th className="w-[26%] pb-2 font-normal">Time spent</th>
                      <th className="pb-2 text-right font-normal">Watched</th>
                      <th className="pb-2 text-right font-normal">Sessions</th>
                      <th className="pb-2 pl-6 font-normal">From</th>
                      <th className="pb-2 text-right font-normal">Last seen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--a-line)]">
                    {leaders.slice(0, 50).map((u, i) => {
                      const top = Math.max(1, ...leaders.slice(0, 50).map((x) => x.activeMs));
                      const clickable = peopleView === "range";
                      return (
                        <tr
                          key={u.uid}
                          onClick={clickable ? () => setPerson(u) : undefined}
                          className={clickable ? "cursor-pointer hover:bg-white/[0.02]" : ""}
                        >
                          <td className="py-2.5 font-mono text-[11px] tabular-nums text-[color:var(--a-muted)]">{i + 1}</td>
                          <td className="py-2.5 pr-4">
                            <span className="flex items-center gap-2.5">
                              <Avatar name={u.name} email={u.email} photo={u.photo} />
                              <span className="min-w-0">
                                <span className="block truncate text-[color:var(--a-ink)]">{u.name || u.email.split("@")[0]}</span>
                                <span className="block truncate text-[11px] text-[color:var(--a-muted)]">{u.email}</span>
                              </span>
                            </span>
                          </td>
                          <td className="py-2.5 pr-4">
                            <span className="flex items-center gap-3">
                              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--a-empty)]">
                                <span className="block h-full rounded-full bg-[color:var(--a-accent)]" style={{ width: `${(u.activeMs / top) * 100}%` }} />
                              </span>
                              <span className="w-16 text-right tabular-nums">{fmtDuration(u.activeMs)}</span>
                            </span>
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-[color:var(--a-accent)]">{u.watchMs ? `▶ ${fmtDuration(u.watchMs)}` : "—"}</td>
                          <td className="py-2.5 text-right tabular-nums text-[color:var(--a-ink-2)]">{u.sessions}</td>
                          <td className="max-w-[180px] truncate py-2.5 pl-6 text-[color:var(--a-ink-2)]">{u.place || "—"}</td>
                          <td className="py-2.5 text-right text-[color:var(--a-ink-2)]">{fmtAgo(u.lastSeenAt, now)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {peopleView === "range" && <p className="mt-3 text-[11px] text-[color:var(--a-muted)]">Click a row for what they watched, when they show up and where from.</p>}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--a-muted)]">No signed-in activity in this range yet.</p>
            )}
          </Section>

          {/* 05 Content */}
          <Section id="content" index={5} title="Content" note={`${data.content.distinctTitles} titles played`}>
            <div className="mb-8 max-w-xl">
              <SplitBar
                parts={[
                  { label: "Films", value: data.content.split.movieMs, color: MOVIE },
                  { label: "TV", value: data.content.split.tvMs, color: TV },
                ]}
                format={fmtDuration}
              />
            </div>
            {data.content.titles.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-[13px]">
                  <thead className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--a-muted)]">
                    <tr>
                      <th className="w-8 pb-2 font-normal">#</th>
                      <th className="pb-2 font-normal">Title</th>
                      <th className="w-[34%] pb-2 font-normal">Watch time</th>
                      <th className="pb-2 text-right font-normal">Viewers</th>
                      <th className="pb-2 text-right font-normal">Plays</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--a-line)]">
                    {data.content.titles.map((t, i) => (
                      <tr key={`${t.mt}_${t.id}`}>
                        <td className="py-2.5 font-mono text-[11px] tabular-nums text-[color:var(--a-muted)]">{i + 1}</td>
                        <td className="py-2.5 pr-4">
                          <Link href={t.mt === "tv" ? `/watchTv?tv_id=${t.id}` : `/watch?movie_id=${t.id}`} className="hover:text-[color:var(--a-accent)]">
                            {t.title || `#${t.id}`}
                          </Link>
                          <span className="ml-2 text-[10px] uppercase tracking-[0.14em]" style={{ color: t.mt === "tv" ? TV : MOVIE }}>
                            {t.mt === "tv" ? "TV" : "Film"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className="flex items-center gap-3">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--a-empty)]">
                              <span className="block h-full rounded-full bg-[color:var(--a-accent)]" style={{ width: `${(t.watchMs / data.content.titles[0].watchMs) * 100}%` }} />
                            </span>
                            <span className="w-16 text-right tabular-nums">{fmtDuration(t.watchMs)}</span>
                          </span>
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-[color:var(--a-ink-2)]">{t.viewers}</td>
                        <td className="py-2.5 text-right tabular-nums text-[color:var(--a-ink-2)]">{t.sessions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[color:var(--a-muted)]">Nothing played in this range yet.</p>
            )}
          </Section>

          {/* 06 Rhythm */}
          <Section id="rhythm" index={6} title="Rhythm" note="When sessions start, in each visitor's local time">
            <RhythmHeatmap grid={data.rhythm} />
          </Section>

          {/* 07 Acquisition */}
          <Section id="acquisition" index={7} title="Acquisition">
            <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-3">
              <Panel title="Sources">
                <BarList rows={data.acquisition.sources} format={fmtInt} valueLabel="Sessions" />
              </Panel>
              <Panel title="Top pages">
                <BarList rows={data.acquisition.pages.map((r) => ({ ...r, label: <span className="font-mono text-xs">{r.key}</span> }))} format={fmtInt} valueLabel="Views" />
              </Panel>
              <Panel title="Entry pages">
                <BarList rows={data.acquisition.entries.map((r) => ({ ...r, label: <span className="font-mono text-xs">{r.key}</span> }))} format={fmtInt} valueLabel="Sessions" />
              </Panel>
              <Panel title="Exit pages">
                <BarList rows={data.acquisition.exits.map((r) => ({ ...r, label: <span className="font-mono text-xs">{r.key}</span> }))} format={fmtInt} valueLabel="Sessions" />
              </Panel>
              <Panel title="Campaigns (utm)">
                <BarList rows={data.acquisition.campaigns} format={fmtInt} empty="No tagged links yet — add ?utm_campaign= to shared links" />
              </Panel>
              <Panel title="New vs returning">
                <BarList
                  rows={[
                    { key: "new", label: "First visit", value: Math.round(s.newVisitorRate * s.sessions) },
                    { key: "ret", label: "Returning", value: s.sessions - Math.round(s.newVisitorRate * s.sessions) },
                  ]}
                  format={fmtInt}
                  valueLabel="Sessions"
                />
              </Panel>
            </div>
          </Section>

          {/* 08 Technology */}
          <Section id="technology" index={8} title="Technology">
            <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-3">
              <Panel title="App surface">
                <BarList rows={data.tech.surfaces} format={fmtInt} valueLabel="Sessions" />
              </Panel>
              <Panel title="Device">
                <BarList rows={data.tech.devices.map((r) => ({ ...r, label: r.key[0].toUpperCase() + r.key.slice(1) }))} format={fmtInt} valueLabel="Sessions" />
              </Panel>
              <Panel title="Browser">
                <BarList rows={data.tech.browsers} format={fmtInt} valueLabel="Sessions" />
              </Panel>
              <Panel title="Operating system">
                <BarList rows={data.tech.os} format={fmtInt} valueLabel="Sessions" />
              </Panel>
              <Panel title="Screen">
                <BarList rows={data.tech.screens.map((r) => ({ ...r, label: <span className="font-mono text-xs">{r.key}</span> }))} format={fmtInt} valueLabel="Sessions" />
              </Panel>
              <Panel title="Language">
                <BarList rows={data.tech.languages} format={fmtInt} valueLabel="Sessions" />
              </Panel>
            </div>
          </Section>

          {/* 09 Performance */}
          <Section id="performance" index={9} title="Performance" note="Real-user Core Web Vitals and client errors">
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-3 xl:grid-cols-5">
              <VitalCard name="LCP" label="Largest paint" data={data.vitals.LCP} thresholds={THRESHOLDS.LCP} unit="ms" />
              <VitalCard name="INP" label="Interaction delay" data={data.vitals.INP} thresholds={THRESHOLDS.INP} unit="ms" />
              <VitalCard name="CLS" label="Layout shift" data={data.vitals.CLS} thresholds={THRESHOLDS.CLS} unit="" />
              <VitalCard name="FCP" label="First paint" data={data.vitals.FCP} thresholds={THRESHOLDS.FCP} unit="ms" />
              <VitalCard name="TTFB" label="Server response" data={data.vitals.TTFB} thresholds={THRESHOLDS.TTFB} unit="ms" />
            </div>
            <div className="mt-10">
              <Panel title={`Errors · ${data.errors.total} in range`}>
                {data.errors.groups.length ? (
                  <ul className="divide-y divide-[color:var(--a-line)]">
                    {data.errors.groups.map((e) => (
                      <li key={`${e.message}|${e.source}`} className="flex items-start justify-between gap-4 py-3 text-[13px]">
                        <span className="min-w-0">
                          <span className="block break-words font-mono text-xs text-[color:var(--a-bad)]">{e.message}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-[color:var(--a-muted)]">
                            {e.source || "unknown source"} · {e.paths.join(", ")}
                          </span>
                        </span>
                        <span className="shrink-0 text-right tabular-nums">
                          {e.count}×<span className="block text-[11px] text-[color:var(--a-muted)]">{e.sessions} sessions · {fmtAgo(e.lastAt, now)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[color:var(--a-muted)]">No client errors reported. ✓</p>
                )}
              </Panel>
            </div>
          </Section>

          {/* 10 Accounts */}
          <Section id="accounts" index={10} title="Accounts" note="From Firebase Auth">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
              <Stat label="Total accounts" value={fmtInt(data.accounts.total)} />
              <Stat label="New in range" value={fmtInt(data.accounts.newInRange)} />
              <Stat label="Dormant" value={fmtInt(data.accounts.dormant)} sub="no sign-in for 30 days" />
              <Stat label="Tracked" value={fmtInt(data.accounts.tracked)} sub="seen by analytics" />
              <Stat label="Watch rooms" value={data.accounts.rooms === null ? "—" : fmtInt(data.accounts.rooms)} />
            </div>
            <div className="mt-8 max-w-md">
              <Panel title="Sign-in method">
                <BarList
                  rows={data.accounts.providers.map((r) => ({ ...r, label: r.key === "password" ? "Email & password" : r.key.replace(".com", "") }))}
                  format={fmtInt}
                />
              </Panel>
            </div>
          </Section>

          {/* 11 Sessions */}
          <Section id="sessions" index={11} title="Recent sessions" note="Newest 60">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-[13px]">
                <thead className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--a-muted)]">
                  <tr>
                    <th className="pb-2 font-normal">Started</th>
                    <th className="pb-2 font-normal">Who</th>
                    <th className="pb-2 font-normal">Where</th>
                    <th className="pb-2 font-normal">On</th>
                    <th className="pb-2 font-normal">Came from</th>
                    <th className="pb-2 font-normal">Watched</th>
                    <th className="pb-2 text-right font-normal">Pages</th>
                    <th className="pb-2 text-right font-normal">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--a-line)]">
                  {data.recent.map((r) => (
                    <tr key={r.sid}>
                      <td className="whitespace-nowrap py-2.5 pr-4 text-[color:var(--a-ink-2)]">{fmtAgo(r.startedAt, now)}</td>
                      <td className="max-w-[180px] truncate py-2.5 pr-4">
                        {r.name || r.email || <span className="text-[color:var(--a-muted)]">Guest{r.newVisitor ? " · new" : ""}</span>}
                      </td>
                      <td className="max-w-[180px] truncate py-2.5 pr-4 text-[color:var(--a-ink-2)]">{[r.city, countryName(r.country)].filter(Boolean).join(", ")}</td>
                      <td className="whitespace-nowrap py-2.5 pr-4 text-[color:var(--a-ink-2)]">{deviceLabel(r.device)}</td>
                      <td className="max-w-[140px] truncate py-2.5 pr-4 text-[color:var(--a-ink-2)]">{r.source}</td>
                      <td className="max-w-[220px] truncate py-2.5 pr-4 text-[color:var(--a-accent)]">{r.titles.join(", ")}</td>
                      <td className="py-2.5 text-right tabular-nums text-[color:var(--a-ink-2)]">{r.pageviews}</td>
                      <td className="py-2.5 text-right tabular-nums text-[color:var(--a-ink-2)]">{fmtDuration(r.activeMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </main>
      </div>

      <PersonDrawer person={person} onClose={() => setPerson(null)} />
    </div>
  );
}
