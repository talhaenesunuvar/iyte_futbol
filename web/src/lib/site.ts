// Site geneli sabitler: adres, paylasim metinleri, arama motoru acik mi.
// Degerler derleme aninda okunur; Vercel'de env degisince yeniden deploy gerekir.

// Vercel production adresi (ornek: iyte-futbol.vercel.app). Alan adi alininca SITE_URL ile ezilir.
const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const SITE_URL = process.env.SITE_URL ?? (vercelProd ? `https://${vercelProd}` : "http://localhost:3000");

// Arama motorlari yalnizca gercek alan adinda acilir: Vercel'de SITE_INDEXABLE=true verilince.
// Onizleme (*.vercel.app) noindex kalir; secim sayfasi ve ornek etkinlikler Google'a girmesin.
export const INDEXABLE = process.env.SITE_INDEXABLE === "true";

export const SITE_AD = "İYTE Futbol";
export const SITE_BASLIK = "İYTE Futbol Topluluğu";
export const SITE_ACIKLAMA =
  "İzmir Yüksek Teknoloji Enstitüsü (İYTE / IZTECH) öğrencilerinin futbol topluluğu. Kampüs turnuvaları, maç buluşmaları ve yeni üye maçları için bize katıl.";

// Next metadata'yi sig birlestirir: sayfa openGraph verirse layout'unki tamamen gider.
// Bu yuzden her sayfa OG_BASE'i yayarak kendi degerini ekler.
export const OG_BASE = { type: "website", locale: "tr_TR", siteName: SITE_AD } as const;
