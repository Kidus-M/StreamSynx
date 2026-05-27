import axios from "axios";

const TMDB_HOST = "api.themoviedb.org";
const DEFAULT_MAX_REQUESTS = 4;
const WINDOW_MS = 1000;

function getMaxRequests() {
  const configuredLimit = Number(
    process.env.NEXT_PUBLIC_TMDB_RATE_LIMIT_PER_SECOND
  );

  if (Number.isFinite(configuredLimit) && configuredLimit > 0) {
    return Math.floor(configuredLimit);
  }

  return DEFAULT_MAX_REQUESTS;
}

function createLimiter(maxRequests) {
  const queue = [];
  const timestamps = [];
  let timerId = null;

  const runNext = () => {
    timerId = null;

    const now = Date.now();
    while (timestamps.length && now - timestamps[0] >= WINDOW_MS) {
      timestamps.shift();
    }

    if (!queue.length) {
      return;
    }

    if (timestamps.length >= maxRequests) {
      const waitTime = Math.max(WINDOW_MS - (now - timestamps[0]), 1);
      timerId = window.setTimeout(runNext, waitTime);
      return;
    }

    const next = queue.shift();
    timestamps.push(now);

    try {
      next.resolve(next.task());
    } catch (error) {
      next.reject(error);
    }

    if (queue.length) {
      timerId = window.setTimeout(runNext, 0);
    }
  };

  return {
    schedule(task) {
      return new Promise((resolve, reject) => {
        queue.push({ task, resolve, reject });

        if (timerId === null) {
          runNext();
        }
      });
    },
  };
}

function isTmdbRequest(input) {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input?.url;

  if (!url) {
    return false;
  }

  try {
    return new URL(url, window.location.origin).hostname === TMDB_HOST;
  } catch {
    return false;
  }
}

export function installTmdbRateLimiter() {
  if (typeof window === "undefined") {
    return;
  }

  if (window.__streamSynxTmdbRateLimiterInstalled) {
    return;
  }

  window.__streamSynxTmdbRateLimiterInstalled = true;
  const limiter = createLimiter(getMaxRequests());

  axios.interceptors.request.use((config) => {
    if (!isTmdbRequest(config.url)) {
      return config;
    }

    return limiter.schedule(() => config);
  });

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (!isTmdbRequest(input)) {
      return originalFetch(input, init);
    }

    return limiter.schedule(() => originalFetch(input, init));
  };
}
