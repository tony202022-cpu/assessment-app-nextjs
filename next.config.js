/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min'],
    //                                                    ^^^^^^^^^^^^^^^^^^^^
    //                                                    Fixed: Added "-min"
  },
};

module.exports = nextConfig;
