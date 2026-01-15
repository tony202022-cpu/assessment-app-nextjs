// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    // Force Next/Vercel to bundle Chromium binaries for Puppeteer
    outputFileTracingIncludes: {
      "/api/generate-pdf": [
        "./node_modules/**/@sparticuz/chromium/bin/**",
        "./node_modules/**/@sparticuz/chromium/**/*.br",
      ],
    },
  },
};

module.exports = nextConfig;
