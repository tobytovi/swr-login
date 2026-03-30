import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@swr-login/core',
    '@swr-login/react',
    '@swr-login/adapter-jwt',
    '@swr-login/adapter-cookie',
    '@swr-login/plugin-password',
    '@swr-login/plugin-oauth-google',
    '@swr-login/plugin-oauth-github',
    '@swr-login/plugin-passkey',
  ],
};

export default nextConfig;
