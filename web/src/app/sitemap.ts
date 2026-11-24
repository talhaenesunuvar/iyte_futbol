import type { MetadataRoute } from "next";
import { INDEXABLE, SITE_URL } from "@/lib/site";
import { turnuvaVerisi } from "@/lib/turnuva";

// Site haritasi (2026-11-24 SEO). Onizlemede (SITE_INDEXABLE yok) bos; alan adinda robots.txt buraya isaret eder.
// Oyuncu sayfalari noindex oldugu icin yok; ornek turnuvanin takim/maclari da yok. /skorbord ve /yonetim haric.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!INDEXABLE) return [];
  const kok = SITE_URL.replace(/\/$/, "");
  const sabit = ["/", "/turnuva", "/turnuva/kura", "/forma", "/sahalar", ...(process.env.KOY_HOST ? [] : ["/koy-sahasi"])];
  const l: MetadataRoute.Sitemap = sabit.map((y) => ({ url: `${kok}${y}` }));
  const v = await turnuvaVerisi();
  if (v && !v.turnuva.ornek) {
    for (const t of v.takimlar) l.push({ url: `${kok}/turnuva/takim/${t.id}` });
    for (const m of v.maclar) if (m.ev_id !== null && m.dep_id !== null) l.push({ url: `${kok}/turnuva/mac/${m.id}` });
  }
  return l;
}
