/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_API_PREFIX || '',
  assetPrefix: process.env.NEXT_PUBLIC_API_PREFIX || '',
  // env: {
  //   NEXT_PUBLIC_DOMAIN_URL: process.env.NEXT_PUBLIC_DOMAIN_URL || 'http://localhost:3001',
  // },
  // async redirects() {
  //   return [
  //     // Redirect trailing slash to non-trailing slash
  //     {
  //       source: '/ai-chatbot/',
  //       destination: '/ai-chatbot',
  //       permanent: true,
  //     },
  //     // Redirect base path to a sub-path to trigger middleware
  //     {
  //       source: '/ai-chatbot',
  //       destination: '/ai-chatbot/dashboard',
  //       permanent: false,
  //     },
  //   ]
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