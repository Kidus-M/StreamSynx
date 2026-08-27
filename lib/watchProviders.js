const REGION_FALLBACK = "US";

export const WATCH_PROVIDER_GROUPS = [
  { key: "flatrate", label: "Stream" },
  { key: "free", label: "Free" },
  { key: "ads", label: "With Ads" },
  { key: "rent", label: "Rent" },
  { key: "buy", label: "Buy" },
];

export const getPreferredProviderRegion = () => {
  if (typeof navigator === "undefined") return REGION_FALLBACK;

  const locale = navigator.languages?.[0] || navigator.language || "";
  const region = locale.split("-")[1];

  return region?.length === 2 ? region.toUpperCase() : REGION_FALLBACK;
};

export const normalizeWatchProviderResults = (results, preferredRegion = REGION_FALLBACK) => {
  if (!results) {
    return {
      region: preferredRegion,
      link: "",
      groups: [],
      hasProviders: false,
    };
  }

  const availableRegions = Object.keys(results);
  const region = results[preferredRegion]
    ? preferredRegion
    : results[REGION_FALLBACK]
      ? REGION_FALLBACK
      : availableRegions[0] || preferredRegion;

  const regionData = results[region] || {};
  const groups = WATCH_PROVIDER_GROUPS.map((group) => ({
    ...group,
    providers: regionData[group.key] || [],
  })).filter((group) => group.providers.length > 0);

  return {
    region,
    link: regionData.link || "",
    groups,
    hasProviders: groups.length > 0,
  };
};
