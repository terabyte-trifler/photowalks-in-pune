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
    ],
  },
};

export default nextConfig;
