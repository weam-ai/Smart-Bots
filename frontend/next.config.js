/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_API_PREFIX || '/ai-chatbot',
  assetPrefix: process.env.NEXT_PUBLIC_API_BASE_URL || '/ai-chatbot',
  output: 'standalone',
  trailingSlash: true,
  // Disable static optimization to prevent usePathname context errors
  experimental: {
    esmExternals: false,
  },
  // env: {
  //   NEXT_PUBLIC_DOMAIN_URL: process.env.NEXT_PUBLIC_DOMAIN_URL || 'http://localhost:3001',
  // },
  async rewrites() {
    return [
      // Rewrite all API routes to backend EXCEPT Next.js API routes
      {
        source: '/api/:path*',
        // destination: `${process.env.NEXT_PUBLIC_DOMAIN_URL}/api/:path*`,
        destination: `/api/:path*`,
        // Exclude Next.js API routes by using negative lookahead
        missing: [
          {
            type: 'header',
            key: 'x-nextjs-api-route',
            value: 'true',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig