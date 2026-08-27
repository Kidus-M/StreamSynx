/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'www.gravatar.com',
        port: '',
        pathname: '/avatar/**',
      },
    ],
  },
  async redirects() {
    return [
      // The landing page is now the homepage; keep old links working.
      { source: '/home', destination: '/', permanent: true },
      { source: '/movie/:id', destination: '/watch?movie_id=:id', permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/tv.apk',
        destination: '/api/download-apk?type=tv',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/downloads/StreamSynx.apk',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/vnd.android.package-archive',
          },
          {
            key: 'Content-Disposition',
            value: 'attachment; filename="StreamSynx.apk"',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;