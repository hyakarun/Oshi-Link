import type { NextConfig } from "next";

if (process.env.NODE_ENV === 'development') {
  (async () => {
    try {
      const { setupDevPlatform } = await import('@cloudflare/next-on-pages/next-dev');
      await setupDevPlatform();
    } catch (e) {
      console.error('Failed to setup Cloudflare dev platform:', e);
    }
  })();
}

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com;
  style-src 'self' 'unsafe-inline' https://accounts.google.com;
  img-src 'self' blob: data: https://images.unsplash.com https://*.googleusercontent.com *;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  frame-src https://accounts.google.com;
  connect-src 'self' https://accounts.google.com;
  upgrade-insecure-requests;
`;

const nextConfig: NextConfig = {
  // @ts-ignore
  turbopack: {
    root: '.',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
