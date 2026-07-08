import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FaExternalLinkAlt, FaPlayCircle } from "react-icons/fa";
import {
  getPreferredProviderRegion,
  normalizeWatchProviderResults,
} from "../lib/watchProviders";

const BASE_URL = "https://api.themoviedb.org/3";
const LOGO_BASE_URL = "https://image.tmdb.org/t/p/w92";

const WatchProviderPanel = ({ apiKey, mediaId, mediaType = "movie", compact = false }) => {
  const [providers, setProviders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const preferredRegion = useMemo(() => getPreferredProviderRegion(), []);
  const endpointType = mediaType === "tv" ? "tv" : "movie";

  useEffect(() => {
    if (!apiKey || !mediaId) {
      setProviders(null);
      setError("");
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const fetchProviders = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await axios.get(`${BASE_URL}/${endpointType}/${mediaId}/watch/providers`, {
          params: { api_key: apiKey },
          signal: controller.signal,
        });

        if (!isMounted) return;
        setProviders(normalizeWatchProviderResults(response.data?.results, preferredRegion));
      } catch (providerError) {
        if (providerError?.code === "ERR_CANCELED") return;
        console.error("Error fetching watch providers:", providerError);
        if (isMounted) {
          setProviders(null);
          setError("Provider availability could not be loaded.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProviders();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [apiKey, endpointType, mediaId, preferredRegion]);

  return (
    <section className={`glass-card ${compact ? "p-4" : "p-5 md:p-6"} space-y-4`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="section-label text-accent">Sources</span>
          <h2 className="mt-1 text-lg md:text-xl font-semibold text-white">Where to Watch</h2>
        </div>

        {providers?.link && (
          <a
            className="action-btn-primary self-start"
            href={providers.link}
            target="_blank"
            rel="noopener noreferrer"
            title="Open provider availability"
          >
            <FaExternalLinkAlt className="h-3.5 w-3.5" />
            <span>View Options</span>
          </a>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
        <div className="flex items-center gap-2 text-sm text-textsecondary">
          <FaPlayCircle className="h-4 w-4 text-accent" />
          <span className="font-medium text-textprimary">StreamSynx Player</span>
          <span className="text-xs">Current embedded source</span>
        </div>
      </div>

      {loading && (
        <div className="h-20 rounded-xl border border-white/[0.06] bg-white/[0.03] animate-pulse" />
      )}

      {!loading && error && (
        <p className="text-sm text-textsecondary">{error}</p>
      )}

      {!loading && !error && providers?.hasProviders && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 text-xs text-textsecondary">
            <span>Availability for {providers.region}</span>
            <span>Data from JustWatch</span>
          </div>

          {providers.groups.map((group) => (
            <div key={group.key} className="space-y-2">
              <h3 className="text-sm font-semibold text-white">{group.label}</h3>
              <div className="flex flex-wrap gap-2.5">
                {group.providers.map((provider) => (
                  <div
                    key={`${group.key}-${provider.provider_id}`}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-2.5 py-2"
                    title={provider.provider_name}
                  >
                    {provider.logo_path && (
                      <img
                        src={`${LOGO_BASE_URL}${provider.logo_path}`}
                        alt=""
                        className="h-7 w-7 rounded-md object-cover"
                        loading="lazy"
                      />
                    )}
                    <span className="max-w-[9rem] truncate text-xs font-medium text-textprimary">
                      {provider.provider_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && providers && !providers.hasProviders && (
        <p className="text-sm text-textsecondary">
          No official provider availability found for your region yet.
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-textsecondary/80">
        Provider availability is supplied by TMDB in partnership with JustWatch and may vary by country.
      </p>
    </section>
  );
};

export default WatchProviderPanel;
