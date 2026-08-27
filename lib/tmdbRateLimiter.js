import axios from "axios";

const TMDB_HOST = "api.themoviedb.org";
const DEFAULT_MAX_REQUESTS = 40;
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

  const enqueue = (item) => {
    const insertAt = queue.findIndex((queuedItem) => queuedItem.priority < item.priority);
    if (insertAt === -1) {
      queue.push(item);
      return;
    }

    queue.splice(insertAt, 0, item);
  };

  const runNext = () => {
    timerId = null;

    const now = Date.now();
    while (timestamps.length && now - timestamps[0] >= WINDOW_MS) {
      timestamps.shift();
    }

    while (queue.length && timestamps.length < maxRequests) {
      const next = queue.shift();
      timestamps.push(Date.now());

      try {
        next.resolve(next.task());
      } catch (error) {
        next.reject(error);
      }
    }

    if (queue.length) {
      const waitTime = Math.max(WINDOW_MS - (Date.now() - timestamps[0]), 1);
      timerId = window.setTimeout(runNext, waitTime);
    }
  };

  return {
    schedule(task, priority = 0) {
      return new Promise((resolve, reject) => {
        enqueue({ task, resolve, reject, priority });

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

    const priority = config.streamSynxPriority ?? (config.params?.append_to_response ? 5 : 0);
    return limiter.schedule(() => config, priority);
  });

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (!isTmdbRequest(input)) {
      return originalFetch(input, init);
    }

    return limiter.schedule(() => originalFetch(input, init));
  };
}
