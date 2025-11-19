import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel handles deployment automatically - no special config needed
  // output: 'standalone', // Only needed for Firebase Functions
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
