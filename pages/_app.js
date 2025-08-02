// These styles apply to every route in the application
import '../styles/global.css'
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  
  return <>
  <Head>
        {/* Favicon Links */}
        <link rel="icon" href="/favicon-16x16.png" sizes="any" /> {/* Standard ICO */}
        <link rel="icon" href="/favicon-16x16.png" type="image/svg+xml" /> {/* Optional SVG */}
        <link rel="apple-touch-icon" href="/favicon-16x16.png" /> {/* iOS */}
        <link rel="manifest" href="favicon-16x16.png" /> {/* Optional Manifest */}
        {/* Add other sizes if needed, e.g., 16x16, 32x32 */}
        {/* Theme Color for browser UI */}
        <meta name="theme-color" content="#121212" /> {/* Your primary dark color */}

          <title>StreamSynx | Discover Movies & TV Shows</title>
          <meta name="description" content="Discover trending, popular, and top-rated movies and TV shows. Track your watch history, create a watchlist, and share recommendations with friends on StreamSynx." />
          <meta name="keywords" content="movies, tv shows, trending, popular, watchlist, recommendations, stream, watch party" />

          {/* Open Graph / Facebook */}
          <meta property="og:type" content="website" />

      </Head>
  <Component {...pageProps} /></>
}