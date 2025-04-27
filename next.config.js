/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true, // Or whatever your existing config is
    // Add or modify the 'images' configuration below:
    images: {
      remotePatterns: [ // Recommended over 'domains' for more control
        {
          protocol: 'https',
          hostname: 'image.tmdb.org',
          port: '',
          pathname: '/t/p/**', // Allow all paths under /t/p/
        },
         // Add other domains if needed, e.g., for Gravatar avatars:
        {
          protocol: 'https',
          hostname: 'www.gravatar.com',
          port: '',
          pathname: '/avatar/**',
        },
      ],
      // --- OR ---
      // domains: ['image.tmdb.org', 'www.gravatar.com'], // Deprecated but might still work
    },
    // ... any other configurations you might have
  };
  
  module.exports = nextConfig;