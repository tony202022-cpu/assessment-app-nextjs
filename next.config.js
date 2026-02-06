/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  output: process.env.CI ? "standalone" : undefined,

  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
