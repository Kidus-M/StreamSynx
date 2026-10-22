/**
 * Placeholder numbers for the /analytics page. Nothing here is collected yet —
 * swap each export for a real query once tracking is wired up. A seeded RNG
 * keeps the "noise" identical between the server render and hydration.
 */

const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const TOTAL_USERS = 5312;

/** `offset` is hours relative to Addis Ababa (EAT, UTC+3). */
export const COUNTRIES = [
  { code: "ET", name: "Ethiopia", region: "Africa", users: 2762, offset: 0 },
  { code: "US", name: "United States", region: "North America", users: 1012, offset: -9 },
  { code: "GB", name: "United Kingdom", region: "Europe", users: 298, offset: -3 },
  { code: "DE", name: "Germany", region: "Europe", users: 241, offset: -2 },
  { code: "BR", name: "Brazil", region: "South America", users: 214, offset: -6 },
  { code: "FR", name: "France", region: "Europe", users: 176, offset: -2 },
  { code: "NL", name: "Netherlands", region: "Europe", users: 112, offset: -2 },
  { code: "AR", name: "Argentina", region: "South America", users: 112, offset: -6 },
  { code: "CO", name: "Colombia", region: "South America", users: 89, offset: -8 },
  { code: "SE", name: "Sweden", region: "Europe", users: 84, offset: -2 },
  { code: "IT", name: "Italy", region: "Europe", users: 71, offset: -2 },
  { code: "ES", name: "Spain", region: "Europe", users: 63, offset: -2 },
  { code: "CL", name: "Chile", region: "South America", users: 48, offset: -6 },
  { code: "PE", name: "Peru", region: "South America", users: 30, offset: -8 },
];

export const REGIONS = ["Africa", "Europe", "North America", "South America"].map((name) => ({
  name,
  users: COUNTRIES.filter((c) => c.region === name).reduce((sum, c) => sum + c.users, 0),
}));

export const TOP_CITIES = [
  { city: "Addis Ababa", country: "ET", users: 1689 },
  { city: "Adama", country: "ET", users: 241 },
  { city: "Washington, D.C.", country: "US", users: 214 },
  { city: "Hawassa", country: "ET", users: 198 },
  { city: "Bahir Dar", country: "ET", users: 176 },
  { city: "London", country: "GB", users: 162 },
  { city: "Dire Dawa", country: "ET", users: 139 },
  { city: "São Paulo", country: "BR", users: 131 },
];

export const KPIS = [
  { label: "Total users", value: TOTAL_USERS, delta: 8.4 },
  { label: "Active users · 30d", value: 3968, delta: 5.1 },
  { label: "New sign-ups · 30d", value: 684, delta: 12.3 },
  { label: "Watch hours · 30d", value: 41280, delta: 9.7 },
  { label: "Avg. session", value: "38m", delta: 2.2 },
  { label: "Watch parties · 30d", value: 1284, delta: -3.6 },
];

// Share of a day's activity per *local* hour: quiet overnight, lunchtime blip,
// big evening peak.
const LOCAL_PROFILE = [
  2.2, 1.4, 0.9, 0.6, 0.5, 0.6, 1.0, 1.6, 2.2, 2.6, 2.9, 3.2,
  3.8, 4.0, 3.6, 3.5, 3.9, 4.6, 5.8, 7.4, 8.9, 9.4, 8.1, 5.2,
];

/** Average active users in each EAT hour, summed across every country's local curve. */
export const HOURLY_EAT = Array.from({ length: 24 }, (_, hour) => {
  const raw = COUNTRIES.reduce(
    (sum, c) => sum + c.users * LOCAL_PROFILE[(hour + c.offset + 24) % 24],
    0
  );
  return Math.round(raw / 70);
});

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** 7×24 grid (EAT) of average active users; weekends run later and heavier. */
export const WEEK_HEATMAP = (() => {
  const rand = mulberry32(7);
  const dayFactor = [0.88, 0.86, 0.9, 0.93, 1.06, 1.24, 1.16];
  return WEEKDAYS.map((_, day) =>
    HOURLY_EAT.map((value, hour) => {
      const afternoonLift = day >= 5 && hour >= 11 && hour <= 17 ? 1.3 : 1;
      return Math.round(value * dayFactor[day] * afternoonLift * (0.9 + rand() * 0.2));
    })
  );
})();

/** Daily active users for the last 30 days, oldest first. */
export const DAILY_ACTIVE = (() => {
  const rand = mulberry32(42);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (29 - i));
    const weekday = date.getUTCDay();
    const weekend = weekday === 0 || weekday === 6 ? 1.18 : weekday === 5 ? 1.08 : 1;
    const growth = 1 + i * 0.006;
    return {
      date: date.toISOString().slice(0, 10),
      users: Math.round(1320 * weekend * growth * (0.93 + rand() * 0.14)),
    };
  });
})();

export const TOP_PAGES = [
  { path: "/", name: "Home", views: 48210, visitors: 3712, avgTime: "2m 41s" },
  { path: "/watch", name: "Movie player", views: 31870, visitors: 2894, avgTime: "47m 12s" },
  { path: "/watchTv", name: "TV player", views: 27440, visitors: 2216, avgTime: "38m 05s" },
  { path: "/search", name: "Search", views: 18960, visitors: 2481, avgTime: "1m 34s" },
  { path: "/rooms/[roomId]", name: "Watch party room", views: 9820, visitors: 1137, avgTime: "52m 30s" },
  { path: "/recommended", name: "Recommended", views: 7310, visitors: 1602, avgTime: "3m 08s" },
  { path: "/watchList", name: "Watchlist", views: 6140, visitors: 1288, avgTime: "1m 52s" },
  { path: "/history", name: "Continue watching", views: 5280, visitors: 1194, avgTime: "1m 11s" },
  { path: "/rooms", name: "Watch parties", views: 4120, visitors: 906, avgTime: "1m 26s" },
  { path: "/login", name: "Sign in", views: 3450, visitors: 1418, avgTime: "0m 48s" },
  { path: "/buddies", name: "Buddies", views: 2960, visitors: 731, avgTime: "2m 19s" },
  { path: "/favorites", name: "Favorites", views: 2410, visitors: 668, avgTime: "1m 05s" },
  { path: "/profile", name: "Profile", views: 1980, visitors: 812, avgTime: "1m 37s" },
  { path: "/download", name: "Download app", views: 1240, visitors: 1003, avgTime: "0m 39s" },
];

export const TRAFFIC_SOURCES = [
  { name: "Direct", share: 38 },
  { name: "Telegram", share: 21 },
  { name: "Google", share: 17 },
  { name: "TikTok", share: 9 },
  { name: "Shared room links", share: 7 },
  { name: "Instagram", share: 5 },
  { name: "Other", share: 3 },
];

export const DEVICES = [
  { name: "Mobile", share: 61 },
  { name: "Desktop", share: 27 },
  { name: "TV", share: 8 },
  { name: "Tablet", share: 4 },
];

export const FEATURE_USAGE = [
  { label: "Titles added to watchlists", value: 8412 },
  { label: "Watch-party chat messages", value: 22904 },
  { label: "Assistant questions asked", value: 3190 },
  { label: "Friend requests sent", value: 1067 },
];
