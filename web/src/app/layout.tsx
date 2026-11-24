import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import AkiciKaydirma from "@/components/AkiciKaydirma";
import { INDEXABLE, OG_BASE, SITE_ACIKLAMA, SITE_AD, SITE_BASLIK, SITE_URL } from "@/lib/site";

// Govde yazisi on yuklenmez (once sistem fontu, sonra Barlow); basliklarin fontu on yuklenir.
// 2026-11-24 SEO incelemesi: her sayfada 22 font on yukleniyordu, LCP ile yarisiyordu.
const barlow = Barlow({
  variable: "--font-barlow",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "latin-ext"],
  preload: false,
});

// Basliklar 800 (cogu italik), menu 700; 600 artik kullanilmiyor (Skorbord yonlendirildi)
const barlowC = Barlow_Condensed({
  variable: "--font-barlow-c",
  weight: ["700", "800"],
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_BASLIK, template: `%s · ${SITE_AD}` },
  description: SITE_ACIKLAMA,
  // canonical ve og:url burada YOK: alt sayfalara gecip hepsini ana sayfanin kopyasi gosteriyordu. Her sayfa kendi verir.
  openGraph: { ...OG_BASE, title: SITE_BASLIK, description: SITE_ACIKLAMA },
  twitter: { card: "summary_large_image" },
  // Onizleme suresince arama motorlarina kapali; alan adinda SITE_INDEXABLE=true ile acilir
  robots: INDEXABLE ? undefined : { index: false, follow: false },
  // Ikonlar app/icon.png, app/apple-icon.png ve app/opengraph-image.png dosyalarindan otomatik gelir
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#8B151A" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Asagidaki script hidrasyondan once 'js' sinifi ekliyor; uyusmazlik beklenen, uyari bastiriliyor
    <html lang="tr" className={`${barlow.variable} ${barlowC.variable}`} suppressHydrationWarning>
      <head>
        {/* .r beliris animasyonu yalnizca JS varken gizler; JS yoksa icerik gorunur kalir */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <AkiciKaydirma />
        {children}
      </body>
    </html>
  );
}
