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
  
  webpack: (config, { isServer }) => {
    // Exclude pages/api during static export
    if (process.env.STATIC_EXPORT && !isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/pages/api': false,
      };
    }
    return config;
  },
};

export default nextConfig;
