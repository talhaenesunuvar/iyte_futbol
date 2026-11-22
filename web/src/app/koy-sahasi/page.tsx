import type { Metadata } from "next";
import "./koy-sahasi.css";
import KoySahasi from "./KoySahasi";
import { koyDoluluk } from "@/lib/koy-veri";
import { OG_BASE } from "@/lib/site";

const ACIKLAMA = "Köy Sahası ücretsiz halı saha randevusu. Her gün 17.00–03.00 arası saat başı; gününü ve saatini seç, randevunu al.";

// Topluluk sitesinden ayri: paylasim kartinda IYTE gorseli/adi tasinmaz (sayfa openGraph verince layout'unki duser).
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: "Köy Sahası · Halı saha randevusu" },
    description: ACIKLAMA,
    alternates: { canonical: "/koy-sahasi" },
    openGraph: { ...OG_BASE, siteName: "Köy Sahası", title: "Köy Sahası", description: ACIKLAMA, url: "/koy-sahasi" },
  };
}

export default async function Page() {
  return <KoySahasi doluluk={await koyDoluluk()} />;
}
