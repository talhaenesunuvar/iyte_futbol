import { Suspense } from "react";
import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import "../turnuva.css";
import "./kura.css";
import UstMenu from "@/components/UstMenu";
import AltKisim from "@/components/AltKisim";
import { OG_BASE, SITE_AD } from "@/lib/site";
import { GRUP_HARF, kuraVerisi, tarihYaz } from "@/lib/turnuva";
import { grupSayisi, kuraCoz, kuraUzlastir } from "@/lib/kura";
import KuraSahnesi from "./KuraSahnesi";

// Kura cekimi ekrani (Derin, 2026-11-24): 4 torbadan her gruba birer takim. Panelde cekilen kuranin
// sirasini (turnuva.kura) adim adim oynatir; etkinlikte projeksiyona tam ekran yansitilir.
// ?t=<id> ile belirli turnuva (panel baglantisi), yoksa vitrin turnuvasi.
const ACIKLAMA = "İYTE Cup kura çekimi: torbalardan çekilen takımlar gruplara nasıl dağıldı, adım adım izle.";

export async function generateMetadata(_: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const images = (await parent).openGraph?.images ?? [];
  return {
    title: "Kura çekimi",
    description: ACIKLAMA,
    alternates: { canonical: "/turnuva/kura" },
    openGraph: { ...OG_BASE, title: `Kura çekimi · ${SITE_AD}`, description: ACIKLAMA, url: "/turnuva/kura", images },
  };
}

type Props = { searchParams: Promise<{ t?: string | string[] }> };

export default function Page({ searchParams }: Props) {
  return (
    <div className="s-sayfa t-tur t-kura">
      {/* searchParams calisma aninda gelir; menu (usePathname) ve icerik Suspense icinde */}
      <Suspense fallback={null}><UstMenu /></Suspense>
      <main>
        <Suspense fallback={<p className="kap kr-bekle">Kura yükleniyor…</p>}>
          <Icerik searchParams={searchParams} />
        </Suspense>
      </main>
      <AltKisim />
    </div>
  );
}

async function Icerik({ searchParams }: Props) {
  const ham = (await searchParams).t;
  const n = Number(Array.isArray(ham) ? ham[0] : ham);
  const v = await kuraVerisi(Number.isInteger(n) && n > 0 ? n : null);
  if (!v) {
    return (
      <section className="s-giris kap">
        <p className="s-etiket">Turnuva</p>
        <h1>Kura</h1>
        <p className="s-soz">Henüz turnuva yok. Kura çekildiğinde burada izleyebileceksin.</p>
      </section>
    );
  }
  const { turnuva: t, takimlar } = v;
  const { adimlar, kayitli } = kuraUzlastir(kuraCoz(v.kura), takimlar);
  // Gruplar: kontenjandan gelen sayi + elle girilmis fazladan harfler
  const harfler = [...new Set([...GRUP_HARF.slice(0, grupSayisi(t.kontenjan)), ...takimlar.map((k) => k.grup).filter((g): g is string => !!g)])].sort();
  const torbalar = [...new Set(takimlar.map((k) => k.torba))].sort((a, b) => (a ?? 1e9) - (b ?? 1e9));
  const torbaliSay = torbalar.filter((p) => p !== null).length;

  return (
    <>
      <section className="kap kr-giris">
        <Link className="kr-geri" href="/turnuva#gruplar">← Turnuvaya dön</Link>
        <p className="s-etiket">Kura çekimi · {t.sezon}</p>
        <h1>{t.ad}</h1>
        <p className="kr-soz">
          {takimlar.length} takım {torbaliSay > 0 ? `${torbaliSay} torbada` : ""}. Her torbadan bir takım çekilir ve rastgele bir gruba gider;
          sonunda her grupta her torbadan tam bir takım olur.
        </p>
      </section>
      <KuraSahnesi
        key={`${t.id}-${v.kuraZaman ?? ""}`}
        baslik={t.ad}
        takimlar={takimlar}
        harfler={harfler}
        torbalar={torbalar}
        adimlar={adimlar}
        kayitli={kayitli}
        zaman={kayitli && v.kuraZaman ? tarihYaz(v.kuraZaman) : null}
      />
      {t.ornek && <p className="ornek kap kr-ornek">Turnuva verileri örnektir.</p>}
    </>
  );
}
