// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    outputFileTracingIncludes: {
      "/api/generate-pdf": [
        "./node_modules/**/@sparticuz/chromium-min/**",
        "./node_modules/.pnpm/**/@sparticuz+chromium-min@*/node_modules/@sparticuz/chromium-min/**",
      ],
    },
  },
};

module.exports = nextConfig;
