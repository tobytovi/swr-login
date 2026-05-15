import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    'swr-login',
    '@swr-login/core',
    '@swr-login/react',
    '@swr-login/adapter-cookie',
  ],
};

export default nextConfig;
