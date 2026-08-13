import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    // Add a host here only when photographs move to a CDN or Supabase Storage.
    remotePatterns: [],
  },
};

export default nextConfig;
