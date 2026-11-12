import type { Metadata, ResolvingMetadata } from "next";
import "./koy-sahasi.css";
import KoySahasi from "./KoySahasi";
import { OG_BASE, SITE_AD } from "@/lib/site";

const ACIKLAMA = "Köy Sahası halı saha randevusu. Her gün 17.00–03.00 arası saat başı slotlar; gününü ve saatini seç, randevunu al.";

// Sayfa openGraph verince layout'unki (app/opengraph-image.png dahil) tamamen gider;
// paylasim gorseli parent'tan alinip tasinir.
export async function generateMetadata(_: PageProps<"/koy-sahasi">, parent: ResolvingMetadata): Promise<Metadata> {
  const images = (await parent).openGraph?.images ?? [];
  return {
    title: "Köy Sahası",
    description: ACIKLAMA,
    alternates: { canonical: "/koy-sahasi" },
    openGraph: { ...OG_BASE, title: `Köy Sahası · ${SITE_AD}`, description: ACIKLAMA, url: "/koy-sahasi", images },
  };
}

export default function Page() {
  return <KoySahasi />;
}
