import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      /* Avatars from Google sign-in. Add your Supabase project's storage host
         here too when photographs and uploaded avatars move there:
         { protocol: 'https', hostname: '<project-ref>.supabase.co',
           pathname: '/storage/v1/object/public/**' }                        */
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      /* Avatars and photographs in Supabase Storage. The wildcard covers the
         project ref, which differs between local, preview and production. */
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      /* Instagram serves media from these two, and which one varies by region
         and by post. Only reached when INSTAGRAM_ACCESS_TOKEN is set. */
      { protocol: 'https', hostname: '**.cdninstagram.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.fbcdn.net', pathname: '/**' },
    ],
    /* next/image refuses a quality it has not been told about from v16. */
    qualities: [70, 72, 74, 80],
  },
};

export default nextConfig;
