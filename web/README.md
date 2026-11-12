# İYTE Futbol – web

İzmir Yüksek Teknoloji Enstitüsü futbol topluluğunun sitesi. Next.js (App Router, TypeScript), Tailwind yok.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

- `/` ana sayfa = Kale Ağı tasarımı (`src/app/kale-agi/`); `/kale-agi` 308 ile `/`'a gider. `/skorbord` ikinci tasarım, kendi adresinde.
- Ortak kod `src/lib/` (yay fiziği, örnek veri, site sabitleri), ortak parçalar `src/components/`.
- Ortam değişkenleri (Vercel): `SITE_URL` (alan adı alınınca), `SITE_INDEXABLE=true` (yalnızca gerçek yayında; önizleme aramaya kapalı).
- Çalışma kuralları için `AGENTS.md`.
