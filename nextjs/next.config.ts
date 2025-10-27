import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Support both static export and server mode
  output: process.env.STATIC_EXPORT ? 'export' : undefined,
  
  reactStrictMode: false,
  
  // In server mode, rewrite /db/* to /api/images/* for dynamic file serving
  async rewrites() {
    // Only add rewrite in server mode (not static export)
    if (!process.env.STATIC_EXPORT) {
      return [
        {
          source: '/db/:filename',
          destination: '/api/images/:filename',
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
