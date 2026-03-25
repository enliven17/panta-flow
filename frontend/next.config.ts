import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['three'],
  experimental: {
    optimizePackageImports: [
      '@tanstack/react-query',
      'framer-motion',
      'wagmi',
      'viem',
    ],
  },
};

export default nextConfig;
