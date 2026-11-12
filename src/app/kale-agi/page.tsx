import type { Metadata, ResolvingMetadata } from "next";
import "./kale-agi.css";
import KaleAgi from "./KaleAgi";
import { OG_BASE, SITE_ACIKLAMA, SITE_AD } from "@/lib/site";

// Sayfa openGraph verince layout'unki (app/opengraph-image.png dahil) tamamen gider;
// paylasim gorseli parent'tan alinip tasinir.
export async function generateMetadata(_: PageProps<"/kale-agi">, parent: ResolvingMetadata): Promise<Metadata> {
  const images = (await parent).openGraph?.images ?? [];
  return {
    title: "Kale Ağı",
    alternates: { canonical: "/kale-agi" },
    openGraph: { ...OG_BASE, title: `Kale Ağı · ${SITE_AD}`, description: SITE_ACIKLAMA, url: "/kale-agi", images },
  };
}

export default function Page() {
  return <KaleAgi />;
}
