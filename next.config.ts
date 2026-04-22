import type { NextConfig } from "next";
import withBundleAnalyzerPkg from "@next/bundle-analyzer";

const withBundleAnalyzer = withBundleAnalyzerPkg({
  enabled: process.env.ANALYZE === "true",
});

const isDev = process.env.NODE_ENV === 'development';

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://*.googleusercontent.com https://perso.ai https://*.perso.ai https://i.ytimg.com",
  "font-src 'self'",
  "connect-src 'self' https://*.blob.core.windows.net https://*.perso.ai https://www.googleapis.com https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: cspDirectives },
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      new URL('https://*.googleusercontent.com/**'),
      new URL('https://perso.ai/**'),
      new URL('https://*.perso.ai/**'),
      new URL('https://*.ytimg.com/**'),
      new URL('https://*.ggpht.com/**'),
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
