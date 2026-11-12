# İYTE Futbol – web

İzmir Yüksek Teknoloji Enstitüsü futbol topluluğunun sitesi. Next.js (App Router, TypeScript), Tailwind yok.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

- `/` geçici seçim sayfası; `/kale-agi` ve `/skorbord` iki aday ana sayfa tasarımı. Kazanan `/`'a taşınacak.
- Ortak kod `src/lib/` (yay fiziği, örnek veri, site sabitleri), ortak parçalar `src/components/`.
- Ortam değişkenleri (Vercel): `SITE_URL` (alan adı alınınca), `SITE_INDEXABLE=true` (yalnızca gerçek yayında; önizleme aramaya kapalı).
- Çalışma kuralları için `AGENTS.md`.
