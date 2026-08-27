import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="bg-primary">
      <Head>
        {/* Typeface: Inter (variable) loaded from Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* TMDB images come from a single host - warm the connection early */}
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="dns-prefetch" href="https://api.themoviedb.org" />

        {/* Brand mark. The .ico covers browsers that request /favicon.ico directly. */}
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-192x192.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="theme-color" content="#0B0B0E" />
      </Head>
      <body className="bg-primary text-textprimary antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
