import type { NextConfig } from "next";

const dev = process.env.NODE_ENV === "development";
// Vercel onizleme dagitimlarinda Vercel araç çubuğu (vercel.live) sayfaya eklenir; production'da yok.
const onizleme = process.env.VERCEL_ENV === "preview";
const live = onizleme ? " https://vercel.live" : "";
const indexable = process.env.SITE_INDEXABLE === "true";

// Nonce'lu CSP cacheComponents (PPR) ile uyumsuz; Next'in kendi inline scriptleri icin
// 'unsafe-inline' gerekir. Sayfada kullanici girdisi olmadigi icin kabul edilebilir.
// Fontlar next/font ile kendi alanimizdan gelir, Google'a istek gitmez.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}${live}`,
  `style-src 'self' 'unsafe-inline'${live}`,
  `img-src 'self' data: blob:${onizleme ? " https://vercel.live https://vercel.com" : ""}`,
  `font-src 'self'${onizleme ? " https://vercel.live https://assets.vercel.com" : ""}`,
  `connect-src 'self'${dev ? " ws:" : ""}${onizleme ? " https://vercel.live wss://ws-us3.pusher.com" : ""}`,
  `frame-src ${onizleme ? "https://vercel.live" : "'none'"}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const guvenlik = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
  // Onizleme Google'a girmesin; alan adinda SITE_INDEXABLE=true ile kalkar (bkz. src/lib/site.ts)
  ...(indexable ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: guvenlik }];
  },
};

export default nextConfig;
