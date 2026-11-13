// These styles apply to every route in the application
import '../styles/global.css';
import Head from 'next/head';
import { Analytics } from '@vercel/analytics/next';
import { Toaster } from 'react-hot-toast';
import { installTmdbRateLimiter } from '../lib/tmdbRateLimiter';
import TvRemoteNavigation from '../components/TvRemoteNavigation';
import NudgeHost from '../components/NudgeHost';
import AssistantHost from '../components/AssistantHost';
import { AuthProvider } from '../lib/auth';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { initAnalytics, trackPageview, trackVital } from '../lib/analytics/tracker';

installTmdbRateLimiter();

/** Next calls this with Core Web Vitals for every page load. */
export function reportWebVitals(metric) {
  trackVital(metric);
}

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // First-party analytics: visits, pages, watch time — see lib/analytics/tracker.js.
  useEffect(() => {
    initAnalytics();
    const onRoute = (url) => trackPageview(url.split('?')[0]);
    router.events.on('routeChangeComplete', onRoute);
    return () => router.events.off('routeChangeComplete', onRoute);
  }, [router.events]);

  return (
    <AuthProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>StreamSynx — Watch movies & TV shows</title>
        {/*
          Every one of these carries a `key`. That is what lets a route replace a
          default instead of appending next to it — two og:title tags in a
          document is a coin flip over which one a crawler builds its card from.
        */}
        <meta
          key="description"
          name="description"
          content="Stream trending, popular and top-rated movies and TV shows. Track your watch history, build a watchlist and share recommendations with friends on StreamSynx."
        />
        <meta name="keywords" content="movies, tv shows, streaming, trending, watchlist, recommendations, watch party" />
        <meta key="og:type" property="og:type" content="website" />
        <meta key="og:site_name" property="og:site_name" content="StreamSynx" />
        <meta key="og:title" property="og:title" content="StreamSynx — Watch movies & TV shows" />
        <meta key="og:description" property="og:description" content="A calm, fast place to find something to watch." />
        <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      </Head>

      <TvRemoteNavigation />
      <Component {...pageProps} />
      {/* Points people at taste picks, Discover and signing up — rate limited
          and dismissible; see lib/nudges.js for when it is allowed to speak. */}
      <NudgeHost />
      {/* The floating "what should I watch" pane — signed-in accounts only;
          guests get a sign-in gate. See lib/assistant.js. */}
      <AssistantHost />
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 2600,
          className:
            'bg-secondary/95 text-textprimary backdrop-blur-xl border border-white/10 text-sm',
          style: { background: 'rgba(21,21,27,0.95)', color: '#F4F4F5' },
        }}
      />
      <Analytics />
    </AuthProvider>
  );
}
