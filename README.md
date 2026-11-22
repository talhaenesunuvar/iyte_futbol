# İYTE Futbol

İzmir Yüksek Teknoloji Enstitüsü futbol topluluğunun sitesi. Tek Next.js uygulaması (`web/`, Vercel'de Root Directory: `web`); arka uç aynı uygulamada (server action'lar + Postgres).

## Sayfalar
- `/` ana sayfa, `/turnuva` turnuva (gruplar, fikstür, eleme ağacı, gol krallığı, başvuru), `/forma` forma ön siparişi, `/sahalar` okul sahası doluluğu + köy sahası bağlantısı
- `/koy-sahasi` köy sahası randevusu; topluluk sitesinden bağımsız görünür. `KOY_HOST` verilirse o alan adında kök adres olarak açılır (`src/proxy.ts`)
- `/yonetim` panel (tek şifre: `YONETIM_SIFRESI`)

## Yerel çalıştırma
```
cd web
npm install
npm run db      # ayrı terminal: yerel Postgres (PGlite) 127.0.0.1:5433, veri web/.veri/
npm run dev
```
`web/.env.local` gerekir (örnek: `web/.env.example`). Şema ilk istekte kendiliğinden kurulur ve örnek içerik bir kez eklenir; panelde "Örnek içeriği sil" ile temizlenir.

## Yayın (Vercel)
1. Vercel > Storage > Neon Postgres ekle (DATABASE_URL otomatik gelir; pooled adres)
2. Environment Variables: `YONETIM_SIFRESI`, `OTURUM_SIRRI` (gerekirse `KOY_HOST`, `SITE_URL`, `SITE_INDEXABLE`)
3. Deploy. Derleme sırasında sayfalar veritabanından okunur; DATABASE_URL olmadan derleme başarısız olur.
