import type { NextConfig } from "next";

const dev = process.env.NODE_ENV === "development";
// Vercel onizleme dagitimlarinda Vercel araç çubuğu (vercel.live) sayfaya eklenir; production'da yok.
const onizleme = process.env.VERCEL_ENV === "preview";
const live = onizleme ? " https://vercel.live" : "";
const indexable = process.env.SITE_INDEXABLE === "true";
// Koy Sahasi alt alan adi (ornek koy.iytefutbol.com). Eskiden src/proxy.ts her istekte calisip bunu yapiyordu;
// artik Vercel'in yonlendirme katmaninda fonksiyon cagirmadan calisir (guvenlik incelemesi 2026-11-24). Degisirse yeniden deploy.
const koyHost = process.env.KOY_HOST?.trim().toLowerCase() || "";
const koyda = [{ type: "host" as const, value: koyHost }];

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
  // Paylasim gorselleri fontu ve rozeti calisma aninda fs ile okur; Vercel fonksiyon paketine girsin
  outputFileTracingIncludes: {
    "/turnuva/gorsel/**": ["./src/assets/**"],
  },
  // Kale Agi ana sayfaya tasindi; Skorbord eski tasarim (2026-11-24 SEO incelemesi: bagimsiz kopya sayfa).
  async redirects() {
    return [
      { source: "/kale-agi", destination: "/", permanent: true },
      { source: "/skorbord", destination: "/", permanent: true },
      ...(koyHost
        ? [
            // Koy adresinde koy sayfasi disindaki her yol "/"a doner
            { source: "/:yol((?!koy-sahasi$|_next/|api/|img/|icon[.]png|apple-icon[.]png).+)", has: koyda, destination: "/", permanent: false },
            // Ana alandaki /koy-sahasi kopya olmasin: koy adresine gider
            { source: "/koy-sahasi", missing: koyda, destination: `https://${koyHost}/`, permanent: true },
          ]
        : []),
    ];
  },
  async rewrites() {
    return koyHost ? { beforeFiles: [{ source: "/", has: koyda, destination: "/koy-sahasi" }], afterFiles: [], fallback: [] } : [];
  },
  async headers() {
    return [{ source: "/:path*", headers: guvenlik }];
  },
};

export default nextConfig;
