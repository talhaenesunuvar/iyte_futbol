import type { Metadata, ResolvingMetadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../../turnuva.css";
import "../../ekip.css";
import UstMenu from "@/components/UstMenu";
import AltKisim from "@/components/AltKisim";
import { ASAMA_AD, oyuncuIstatistik, oyuncuTurnuvasi, turnuvaVerisiIcin, type Mac, type Takim } from "@/lib/turnuva";
import TakimRozet, { TakimAdi } from "../../TakimRozet";
import { OG_BASE, SITE_AD } from "@/lib/site";

// Oyuncu sayfasi (Derin, 2026-11-23/24): fotograf, mevki, bolum, sinif, yas, gol, asist, sari/kirmizi kart ve hangi macta oldugu.
// Ogrenci no burada YOK; turnuvaVerisiIcin bu alani zaten secmez.
// Oyuncu sayfalari Google'a GIRMEZ (2026-11-24, Talha onayi): ogrenci adi, fotografi, bolumu arama sonuclarinda cikmasin.
// Site ici baglantilar izlenir (follow).
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }, parent: ResolvingMetadata): Promise<Metadata> {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const tid = await oyuncuTurnuvasi(id);
  const v = tid === null ? null : await turnuvaVerisiIcin(tid);
  const o = v?.oyuncular.find((x) => x.id === id);
  if (!v || !o) notFound();
  const t = v.takimlar.find((x) => x.id === o.takim_id);
  const i = oyuncuIstatistik(o, v.goller, v.kartlar);
  const baslik = t ? `${o.ad} · ${t.ad}` : o.ad;
  const aciklama = [`${o.ad}`, t?.ad, o.mevki, `${i.gol} gol, ${i.asist} asist`].filter(Boolean).join(" · ") + ` (${v.turnuva.ad}).`;
  const url = `/turnuva/oyuncu/${id}`;
  const images = (await parent).openGraph?.images ?? [];
  return {
    title: baslik, description: aciklama, alternates: { canonical: url },
    openGraph: { ...OG_BASE, title: `${baslik} · ${SITE_AD}`, description: aciklama, url, images },
    robots: { index: false, follow: true },
  };
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="s-sayfa t-tur t-ekip">
      <Suspense fallback={null}><UstMenu /></Suspense>
      <main>
        <Suspense fallback={<p className="kap ek-bekle">Oyuncu yükleniyor…</p>}>
          <Icerik params={params} />
        </Suspense>
      </main>
      <AltKisim />
    </div>
  );
}

async function Icerik({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const tid = await oyuncuTurnuvasi(id);
  if (tid === null) notFound();
  const v = await turnuvaVerisiIcin(tid);
  const o = v?.oyuncular.find((x) => x.id === id);
  if (!v || !o) notFound();
  const t = v.takimlar.find((x) => x.id === o.takim_id);
  const tk = new Map(v.takimlar.map((x) => [x.id, x]));
  const mac = new Map(v.maclar.map((m) => [m.id, m]));
  const i = oyuncuIstatistik(o, v.goller, v.kartlar);
  const olay = [
    ...i.golKayit.map((g) => ({ id: `g${g.id}`, mac_id: g.mac_id, dk: g.dakika, tur: "Gol", ek: g.asist ? `Asist: ${g.asist}` : "" })),
    ...i.asistKayit.map((g) => ({ id: `a${g.id}`, mac_id: g.mac_id, dk: g.dakika, tur: "Asist", ek: `Golü atan: ${g.oyuncu}` })),
    ...i.kartKayit.map((x) => ({ id: `k${x.id}`, mac_id: x.mac_id, dk: x.dakika, tur: x.renk === "sari" ? "Sarı kart" : "Kırmızı kart", ek: "" })),
  ].sort((a, b) => a.mac_id - b.mac_id || (a.dk ?? 0) - (b.dk ?? 0));

  return (
    <>
      <section className="kap ek-ust">
        <Link href={t ? `/turnuva/takim/${t.id}` : "/turnuva"} className="ek-geri">← {t?.ad ?? v.turnuva.ad}</Link>
        <div className="ek-kart">
          {o.foto_v ? (
            <span className="ek-foto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/turnuva/oyuncu/${o.id}/foto?v=${o.foto_v}`} alt={o.ad} width={256} height={256} />
              {o.numara !== null && <b aria-label="Forma numarası">{o.numara}</b>}
            </span>
          ) : <span className="ek-no" aria-label="Forma numarası">{o.numara ?? "–"}</span>}
          <div>
            <p className="s-etiket" style={{ color: "rgba(255,255,255,.75)" }}>Oyuncu · {v.turnuva.ad}</p>
            <h1>{o.ad}</h1>
            <p className="ek-alt">
              {t && <Link href={`/turnuva/takim/${t.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><TakimRozet t={t} boy={24} />{t.ad}</Link>}
              {o.mevki && <span className="ek-mevki">{o.mevki}</span>}
              {(o.bolum || o.sinif) && <span>{[o.bolum, o.sinif].filter(Boolean).join(" · ")}</span>}
              {o.yas !== null && <span>{o.yas} yaşında</span>}
            </p>
          </div>
        </div>
        <dl className="ek-sayi">
          <div><dt>Gol</dt><dd>{i.gol}</dd></div>
          <div><dt>Asist</dt><dd>{i.asist}</dd></div>
          <div><dt>Sarı kart</dt><dd><span className="kart-i sari" aria-hidden /> {i.sari}</dd></div>
          <div><dt>Kırmızı kart</dt><dd><span className="kart-i kirmizi" aria-hidden /> {i.kirmizi}</dd></div>
          <div><dt>Yaş</dt><dd>{o.yas ?? "–"}</dd></div>
        </dl>
      </section>

      <section className="kap ek-bolum">
        <h2 className="s-h2">Maç maç</h2>
        {olay.length === 0 ? <p className="ek-bos">Henüz gol, asist ya da kart kaydı yok.</p> : (
          <ol className="ek-liste">
            {olay.map((x) => {
              const m = mac.get(x.mac_id);
              return (
                <li key={x.id}>
                  <Link href={`/turnuva/mac/${x.mac_id}`}>
                    <span className="dk">{x.dk ? `${x.dk}'` : "–"}</span>
                    <span>
                      <strong>{x.tur === "Sarı kart" || x.tur === "Kırmızı kart" ? <><span className={`kart-i ${x.tur === "Sarı kart" ? "sari" : "kirmizi"}`} aria-hidden /> {x.tur}</> : x.tur}</strong>
                      <small>{m ? macAd(m, o.takim_id, tk) : ""}{x.ek ? ` · ${x.ek}` : ""}</small>
                    </span>
                    <span className="sag">{m && m.ev_gol !== null && m.dep_gol !== null ? `${m.ev_gol} – ${m.dep_gol}` : ""}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      {t && (
        <section className="kap ek-bolum">
          <Link className="btn iki" href={`/turnuva/takim/${t.id}`}><TakimAdi t={t} boy={20} /> kadrosu</Link>
        </section>
      )}
      {v.turnuva.ornek && <p className="ornek kap">Turnuva verileri örnektir.</p>}
    </>
  );
}

function macAd(m: Mac, takimId: number, tk: Map<number, Takim>) {
  const rakip = tk.get((m.ev_id === takimId ? m.dep_id : m.ev_id) ?? -1)?.ad ?? "?";
  return `${m.asama === "grup" ? `${m.grup} Grubu` : ASAMA_AD[m.asama]} · rakip ${rakip}`;
}
