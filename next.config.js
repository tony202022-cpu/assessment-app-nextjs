/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep these packages as runtime dependencies (don’t inline/bundle weirdly)
    serverComponentsExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],

    // Force file tracing to include chromium’s shipped files (including bin/)
    outputFileTracingIncludes: {
      "/api/generate-pdf": ["./node_modules/@sparticuz/chromium/**"],
    },
  },

  async redirects() {
    return [
      // Legacy slugs -> new slugs
      {
        source: "/scan",
        destination: "/outdoor-scan",
        permanent: true,
      },
      {
        source: "/mri",
        destination: "/outdoor-mri",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;