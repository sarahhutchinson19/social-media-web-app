/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow server-side fetches to innago.com for article metadata
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

module.exports = nextConfig;
