import { useMemo, useRef, useState } from "react";
import Head from "next/head";
import { FiArrowDownRight, FiArrowUpRight } from "react-icons/fi";
import PageShell from "../../components/PageShell";
import {
  COUNTRIES,
  DAILY_ACTIVE,
  DEVICES,
  FEATURE_USAGE,
  HOURLY_EAT,
  KPIS,
  REGIONS,
  TOP_CITIES,
  TOP_PAGES,
  TOTAL_USERS,
  TRAFFIC_SOURCES,
  WEEKDAYS,
  WEEK_HEATMAP,
} from "../../lib/analyticsMock";

// Categorical slots for multi-series parts (regions, devices) — fixed order,
// stepped for the dark surface. Single-series charts use the gold accent.
const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500"];
const ACCENT = "#E9B949";

const fmt = (n) => (typeof n === "number" ? n.toLocaleString("en-US") : n);
const pct = (n, total) => `${((n / total) * 100).toFixed(1)}%`;
const hourLabel = (h) => `${String(h).padStart(2, "0")}:00`;

const Card = ({ title, hint, actions, className = "", children }) => (
  <section className={`surface min-w-0 p-5 sm:p-6 ${className}`}>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-textprimary">{title}</h2>
        {hint && <p className="mt-1 text-xs text-textsecondary">{hint}</p>}
      </div>
      {actions}
    </div>
    {children}
  </section>
);

/** Floating label pinned inside a `relative` chart container. */
const Tip = ({ tip }) =>
  tip ? (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-white/10 bg-secondary/95 px-2.5 py-1.5 text-xs text-textprimary shadow-lift"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      {tip.content}
    </div>
  ) : null;

const Kpi = ({ label, value, delta }) => {
  const up = delta >= 0;
  const Arrow = up ? FiArrowUpRight : FiArrowDownRight;
  return (
    <div className="surface p-4">
      <p className="text-xs text-textsecondary">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-textprimary">{fmt(value)}</p>
      <p className={`mt-1 inline-flex items-center gap-0.5 text-xs ${up ? "text-emerald-400" : "text-rose-400"}`}>
        <Arrow className="h-3.5 w-3.5" aria-hidden />
        {Math.abs(delta)}% <span className="ml-1 text-textsecondary">vs prev. 30d</span>
      </p>
    </div>
  );
};

const DailyActiveChart = () => {
  const ref = useRef(null);
  const [active, setActive] = useState(null);
  const W = 600;
  const H = 200;
  const values = DAILY_ACTIVE.map((d) => d.users);
  const max = Math.ceil(Math.max(...values) / 500) * 500;
  const x = (i) => (i / (values.length - 1)) * W;
  const y = (v) => H - (v / max) * H;
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const dateLabel = (iso) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  const onMove = (event) => {
    const rect = ref.current.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    setActive(Math.round(ratio * (values.length - 1)));
  };

  const point = active != null && {
    left: (x(active) / W) * 100,
    top: (y(values[active]) / H) * 100,
  };

  return (
    <Card title="Daily active users" hint={`Last 30 days · avg ${fmt(avg)} / day`}>
      <div className="flex gap-3">
        <div className="flex h-[200px] flex-col justify-between text-right text-[11px] tabular-nums text-textsecondary">
          {[max, max / 2, 0].map((t) => (
            <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{fmt(t)}</span>
          ))}
        </div>
        <div
          ref={ref}
          className="relative h-[200px] flex-1 cursor-crosshair"
          onMouseMove={onMove}
          onMouseLeave={() => setActive(null)}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
            <defs>
              <linearGradient id="dau-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity="0.28" />
                <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, H / 2, H].map((gy) => (
              <line key={gy} x1="0" x2={W} y1={gy} y2={gy} stroke="rgba(255,255,255,0.06)" vectorEffect="non-scaling-stroke" />
            ))}
            <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#dau-fill)" />
            <path d={line} fill="none" stroke={ACCENT} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            {point && (
              <line x1={x(active)} x2={x(active)} y1="0" y2={H} stroke="rgba(255,255,255,0.25)" vectorEffect="non-scaling-stroke" />
            )}
          </svg>
          {point && (
            <>
              <span
                className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary"
                style={{ left: `${point.left}%`, top: `${point.top}%`, background: ACCENT }}
              />
              <Tip
                tip={{
                  x: `${point.left}%`,
                  y: 0,
                  content: (
                    <>
                      <span className="text-textsecondary">{dateLabel(DAILY_ACTIVE[active].date)}</span>{" "}
                      <b className="font-semibold">{fmt(values[active])}</b> users
                    </>
                  ),
                }}
              />
            </>
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-between pl-12 text-[11px] text-textsecondary">
        {[0, 10, 20, 29].map((i) => (
          <span key={i}>{dateLabel(DAILY_ACTIVE[i].date)}</span>
        ))}
      </div>
    </Card>
  );
};

const TIMEZONES = [
  { id: "EAT", label: "Addis (EAT)", shift: 0 },
  { id: "UTC", label: "UTC", shift: -3 },
];

const HourlyChart = () => {
  const [tz, setTz] = useState(TIMEZONES[0]);
  const [tip, setTip] = useState(null);
  const ref = useRef(null);

  // Re-key the EAT series to the chosen zone: index = hour in that zone.
  const hours = useMemo(
    () => Array.from({ length: 24 }, (_, h) => HOURLY_EAT[(h - tz.shift + 24) % 24]),
    [tz]
  );
  const max = Math.max(...hours);
  const peak = hours.indexOf(max);
  const quiet = hours.indexOf(Math.min(...hours));

  const show = (event, h) => {
    const box = ref.current.getBoundingClientRect();
    const bar = event.currentTarget.getBoundingClientRect();
    setTip({
      x: bar.left - box.left + bar.width / 2,
      y: bar.bottom - box.top - (hours[h] / max) * 180,
      content: (
        <>
          <span className="text-textsecondary">{hourLabel(h)}</span> <b className="font-semibold">{fmt(hours[h])}</b> active
        </>
      ),
    });
  };

  return (
    <Card
      title="Active hours"
      hint={`Avg. users online per hour · peak ${hourLabel(peak)}, quietest ${hourLabel(quiet)}`}
      actions={
        <div className="flex gap-1.5">
          {TIMEZONES.map((zone) => (
            <button
              key={zone.id}
              type="button"
              onClick={() => setTz(zone)}
              className={`chip ${tz.id === zone.id ? "chip-active" : ""}`}
            >
              {zone.label}
            </button>
          ))}
        </div>
      }
    >
      <div ref={ref} className="relative" onMouseLeave={() => setTip(null)}>
        <div className="flex h-[180px] items-end gap-[2px]">
          {hours.map((value, h) => (
            <div
              key={h}
              className="group flex h-full flex-1 cursor-default items-end"
              onMouseEnter={(event) => show(event, h)}
            >
              <div
                className="w-full rounded-t-[4px] transition-opacity group-hover:opacity-100"
                style={{
                  height: `${(value / max) * 100}%`,
                  background: ACCENT,
                  opacity: h === peak ? 1 : 0.45,
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex text-[11px] text-textsecondary">
          {hours.map((_, h) => (
            <span key={h} className="flex-1 text-center">
              {h % 6 === 0 ? hourLabel(h) : ""}
            </span>
          ))}
        </div>
        <Tip tip={tip} />
      </div>
    </Card>
  );
};

const WeekHeatmap = () => {
  const [tip, setTip] = useState(null);
  const ref = useRef(null);
  const max = Math.max(...WEEK_HEATMAP.flat());

  const show = (event, day, hour) => {
    const box = ref.current.getBoundingClientRect();
    const cell = event.currentTarget.getBoundingClientRect();
    setTip({
      x: cell.left - box.left + cell.width / 2,
      y: cell.top - box.top,
      content: (
        <>
          <span className="text-textsecondary">
            {WEEKDAYS[day]} {hourLabel(hour)}
          </span>{" "}
          <b className="font-semibold">{fmt(WEEK_HEATMAP[day][hour])}</b> active
        </>
      ),
    });
  };

  return (
    <Card title="Activity by day & hour" hint="Avg. users online · Addis time (EAT)">
      <div className="-mx-1 overflow-x-auto px-1">
        <div ref={ref} className="relative min-w-[560px]" onMouseLeave={() => setTip(null)}>
          {WEEK_HEATMAP.map((row, day) => (
            <div key={day} className="mb-[2px] flex items-center gap-2">
              <span className="w-8 shrink-0 text-[11px] text-textsecondary">{WEEKDAYS[day]}</span>
              <div className="grid flex-1 gap-[2px]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                {row.map((value, hour) => (
                  <div
                    key={hour}
                    className="h-6 rounded-[3px] ring-white/40 hover:ring-1"
                    style={{ background: ACCENT, opacity: 0.06 + 0.94 * (value / max) }}
                    onMouseEnter={(event) => show(event, day, hour)}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="mt-1 flex gap-2 text-[11px] text-textsecondary">
            <span className="w-8 shrink-0" />
            <div className="flex flex-1">
              {Array.from({ length: 24 }).map((_, h) => (
                <span key={h} className="flex-1">
                  {h % 6 === 0 ? hourLabel(h) : ""}
                </span>
              ))}
            </div>
          </div>
          <Tip tip={tip} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-textsecondary">
        Fewer
        <span
          className="h-2 w-28 rounded-full"
          style={{ background: `linear-gradient(90deg, rgba(233,185,73,0.06), ${ACCENT})` }}
        />
        More
      </div>
    </Card>
  );
};

/** One stacked bar + legend for a part-to-whole split over the 4 series slots. */
const SplitBar = ({ items, total, valueOf }) => (
  <>
    <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
      {items.map((item, i) => (
        <div
          key={item.name}
          title={`${item.name}: ${pct(valueOf(item), total)}`}
          style={{ width: `${(valueOf(item) / total) * 100}%`, background: SERIES[i] }}
        />
      ))}
    </div>
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
      {items.map((item, i) => (
        <li key={item.name} className="flex items-center gap-1.5 text-textsecondary">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i] }} />
          {item.name}
          <span className="font-medium tabular-nums text-textprimary">{pct(valueOf(item), total)}</span>
        </li>
      ))}
    </ul>
  </>
);

/** Ranked horizontal bars; the label row sits above each bar. */
const BarList = ({ rows }) => {
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key ?? row.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-textprimary">{row.label}</span>
            <span className="shrink-0 tabular-nums text-textsecondary">{row.display ?? fmt(row.value)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.05]">
            <div className="h-full rounded-full" style={{ width: `${(row.value / max) * 100}%`, background: ACCENT }} />
          </div>
        </li>
      ))}
    </ul>
  );
};

const CountryCode = ({ code }) => (
  <span className="mr-2 inline-block w-7 rounded bg-white/[0.06] py-0.5 text-center text-[10px] font-semibold text-textsecondary">
    {code}
  </span>
);

const Geography = () => (
  <Card title="Where users are from" hint={`${COUNTRIES.length} countries · ${fmt(TOTAL_USERS)} users`} className="lg:col-span-2">
    <SplitBar items={REGIONS} total={TOTAL_USERS} valueOf={(r) => r.users} />
    <div className="mt-6 grid gap-8 md:grid-cols-2">
      <div>
        <p className="section-label mb-3">Countries</p>
        <BarList
          rows={COUNTRIES.map((c) => ({
            key: c.code,
            label: (
              <>
                <CountryCode code={c.code} />
                {c.name}
              </>
            ),
            value: c.users,
            display: `${fmt(c.users)} · ${pct(c.users, TOTAL_USERS)}`,
          }))}
        />
      </div>
      <div>
        <p className="section-label mb-3">Top cities</p>
        <BarList
          rows={TOP_CITIES.map((c) => ({
            key: c.city,
            label: (
              <>
                <CountryCode code={c.country} />
                {c.city}
              </>
            ),
            value: c.users,
          }))}
        />
      </div>
    </div>
  </Card>
);

const TopPages = () => {
  const max = TOP_PAGES[0].views;
  return (
    <Card title="Most visited pages" hint="Last 30 days" className="lg:col-span-2">
      <div className="-mx-5 overflow-x-auto sm:-mx-6">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-textsecondary">
              <th className="px-5 pb-3 font-medium sm:px-6">Page</th>
              <th className="pb-3 pr-4 text-right font-medium">Views</th>
              <th className="pb-3 pr-4 text-right font-medium">Visitors</th>
              <th className="pb-3 pr-5 text-right font-medium sm:pr-6">Avg. time</th>
            </tr>
          </thead>
          <tbody>
            {TOP_PAGES.map((page) => (
              <tr key={page.path} className="border-t border-white/[0.05]">
                <td className="relative px-5 py-2.5 sm:px-6">
                  <div
                    className="absolute inset-y-1 left-3 rounded-md bg-accent/10 sm:left-4"
                    style={{ width: `calc(${(page.views / max) * 100}% - 1.5rem)` }}
                  />
                  <div className="relative">
                    <span className="text-textprimary">{page.name}</span>
                    <span className="ml-2 font-mono text-xs text-textsecondary">{page.path}</span>
                  </div>
                </td>
                <td className="pr-4 text-right tabular-nums text-textprimary">{fmt(page.views)}</td>
                <td className="pr-4 text-right tabular-nums text-textsecondary">{fmt(page.visitors)}</td>
                <td className="pr-5 text-right tabular-nums text-textsecondary sm:pr-6">{page.avgTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const AnalyticsPage = () => (
  <PageShell
    title="Analytics"
    eyebrow="Internal"
    description="Who uses StreamSynx, where they are and when they watch. Every number on this page is sample data until tracking is wired up."
    actions={<span className="chip chip-active">Sample data · last 30 days</span>}
  >
    <Head>
      <meta name="robots" content="noindex" />
    </Head>

    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {KPIS.map((kpi) => (
        <Kpi key={kpi.label} {...kpi} />
      ))}
    </div>

    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <DailyActiveChart />
      <HourlyChart />
      <div className="min-w-0 lg:col-span-2">
        <WeekHeatmap />
      </div>
      <Geography />
      <TopPages />

      <Card title="Traffic sources" hint="Share of sessions">
        <BarList rows={TRAFFIC_SOURCES.map((s) => ({ label: s.name, value: s.share, display: `${s.share}%` }))} />
      </Card>

      <div className="flex min-w-0 flex-col gap-4">
        <Card title="Devices" hint="Share of sessions">
          <SplitBar items={DEVICES} total={100} valueOf={(d) => d.share} />
        </Card>
        <Card title="Feature usage" hint="Last 30 days">
          <div className="grid grid-cols-2 gap-3">
            {FEATURE_USAGE.map((f) => (
              <div key={f.label} className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-xl font-semibold tracking-tight text-textprimary">{fmt(f.value)}</p>
                <p className="mt-1 text-xs text-textsecondary">{f.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  </PageShell>
);

export default AnalyticsPage;
