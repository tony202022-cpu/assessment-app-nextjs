/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is CRITICAL for PDF generation
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  },
};

module.exports = nextConfig;
