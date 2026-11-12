import type { Metadata, ResolvingMetadata } from "next";
import "./skorbord.css";
import Skorbord from "./Skorbord";
import { OG_BASE, SITE_ACIKLAMA, SITE_AD } from "@/lib/site";

// Sayfa openGraph verince layout'unki (app/opengraph-image.png dahil) tamamen gider;
// paylasim gorseli parent'tan alinip tasinir.
export async function generateMetadata(_: PageProps<"/skorbord">, parent: ResolvingMetadata): Promise<Metadata> {
  const images = (await parent).openGraph?.images ?? [];
  return {
    title: "Skorbord",
    alternates: { canonical: "/skorbord" },
    openGraph: { ...OG_BASE, title: `Skorbord · ${SITE_AD}`, description: SITE_ACIKLAMA, url: "/skorbord", images },
  };
}

export default function Page() {
  return <Skorbord />;
}
