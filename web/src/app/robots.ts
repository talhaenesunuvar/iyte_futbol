import type { MetadataRoute } from "next";
import { INDEXABLE, SITE_URL } from "@/lib/site";

// Onizlemede de taramaya izin verilir (Disallow konursa Google noindex'i goremez ve
// WhatsApp gibi link onizleyiciler engellenebilir). Sitemap yalnizca gercek yayinda.
export default function robots(): MetadataRoute.Robots {
  return INDEXABLE
    ? { rules: { userAgent: "*", allow: "/" }, sitemap: `${SITE_URL}/sitemap.xml` }
    : { rules: { userAgent: "*", allow: "/" } };
}
