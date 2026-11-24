import type { Metadata, ResolvingMetadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../../turnuva.css";
import "../../ekip.css";
import UstMenu from "@/components/UstMenu";
import AltKisim from "@/components/AltKisim";
import { ASAMA_AD, kazanan, oynandi, oyuncuIstatistik, takimTurnuvasi, tarihYaz, turnuvaVerisiIcin } from "@/lib/turnuva";
import TakimRozet, { TakimAdi } from "../../TakimRozet";
import { OG_BASE, SITE_AD } from "@/lib/site";

// Takim sayfasi (Derin, 2026-11-23): kadro, her oyuncunun yasi, golu, asisti ve kartlari; takimin maclari.
// Bolum ve ogrenci no burada YOK (yalniz yonetim paneli).
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }, parent: ResolvingMetadata): Promise<Metadata> {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const tid = await takimTurnuvasi(id);
  const v = tid === null ? null : await turnuvaVerisiIcin(tid);
  const t = v?.takimlar.find((x) => x.id === id);
  if (!v || !t) notFound();
  const tur = `${v.turnuva.ad} ${v.turnuva.sezon}`.trim();
  const baslik = `${t.ad} · ${tur}`;
  const n = v.oyuncular.filter((o) => o.takim_id === id).length;
  const aciklama = `${t.ad}: ${tur}${t.grup ? `, ${t.grup} Grubu` : ""}. Kadro (${n} oyuncu), maçlar, goller ve kartlar.`;
  const url = `/turnuva/takim/${id}`;
  const images = (await parent).openGraph?.images ?? [];
  return {
    title: baslik, description: aciklama, alternates: { canonical: url },
    openGraph: { ...OG_BASE, title: `${baslik} · ${SITE_AD}`, description: aciklama, url, images },
    ...(v.turnuva.ornek ? { robots: { index: false, follow: true } } : {}),
  };
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="s-sayfa t-tur t-ekip">
      <Suspense fallback={null}><UstMenu /></Suspense>
      <main>
        <Suspense fallback={<p className="kap ek-bekle">Takım yükleniyor…</p>}>
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
  const tid = await takimTurnuvasi(id);
  if (tid === null) notFound();
  const v = await turnuvaVerisiIcin(tid);
  const t = v?.takimlar.find((x) => x.id === id);
  if (!v || !t) notFound();

  const tk = new Map(v.takimlar.map((x) => [x.id, x]));
  const kadro = v.oyuncular.filter((o) => o.takim_id === id).map((o) => ({ o, i: oyuncuIstatistik(o, v.goller, v.kartlar) }));
  const maclar = v.maclar.filter((m) => m.ev_id === id || m.dep_id === id);
  const oynanan = maclar.filter(oynandi);
  let G = 0, B = 0, M = 0, AG = 0, YG = 0;
  for (const m of oynanan) {
    const ev = m.ev_id === id;
    const a = ev ? m.ev_gol! : m.dep_gol!, y = ev ? m.dep_gol! : m.ev_gol!;
    AG += a; YG += y;
    const k = kazanan(m);
    if (a > y || (a === y && k === id)) G++;
    else if (a < y || (a === y && k !== null)) M++;
    else B++;
  }
  const kartlar = v.kartlar.filter((x) => x.takim_id === id);
  const sari = kartlar.filter((x) => x.renk === "sari").length, kirmizi = kartlar.length - sari;

  return (
    <>
      <section className="kap ek-ust">
        <Link href="/turnuva#kadrolar" className="ek-geri">← {v.turnuva.ad} {v.turnuva.sezon}</Link>
        <div className="ek-kart">
          <TakimRozet t={t} boy={88} />
          <div>
            <p className="s-etiket" style={{ color: "rgba(255,255,255,.75)" }}>Takım{t.grup ? ` · ${t.grup} Grubu` : ""}</p>
            <h1>{t.ad}</h1>
            <p className="ek-alt"><span>{kadro.length} oyuncu</span><span>{oynanan.length} maç</span></p>
          </div>
        </div>
        <dl className="ek-sayi">
          <div><dt>Galibiyet</dt><dd>{G}</dd></div>
          <div><dt>Beraberlik</dt><dd>{B}</dd></div>
          <div><dt>Mağlubiyet</dt><dd>{M}</dd></div>
          <div><dt>Atılan gol</dt><dd>{AG}</dd></div>
          <div><dt>Yenilen gol</dt><dd>{YG}</dd></div>
          <div><dt>Kart</dt><dd><span className="kart-i sari" aria-hidden /> {sari} <span className="kart-i kirmizi" aria-hidden /> {kirmizi}</dd></div>
        </dl>
      </section>

      <section className="kap ek-bolum" id="kadro">
        <h2 className="s-h2">Kadro</h2>
        {kadro.length === 0 ? <p className="ek-bos">Kadro henüz girilmedi.</p> : (
          <div className="tablo-kap">
            <table className="ek-tablo">
              <caption className="gizli">{t.ad} kadrosu</caption>
              <thead>
                <tr>
                  <th scope="col">No</th><th scope="col" className="ad">Oyuncu</th><th scope="col" className="gizle-m">Mevki</th><th scope="col">Yaş</th>
                  <th scope="col" title="Gol">Gol</th><th scope="col" title="Asist">Asist</th>
                  <th scope="col" title="Sarı kart"><span className="kart-i sari" aria-label="Sarı kart" /></th>
                  <th scope="col" title="Kırmızı kart"><span className="kart-i kirmizi" aria-label="Kırmızı kart" /></th>
                </tr>
              </thead>
              <tbody>
                {kadro.map(({ o, i }) => (
                  <tr key={o.id}>
                    <td className="no">{o.numara ?? "–"}</td>
                    <th scope="row" className="ad">
                      <Link href={`/turnuva/oyuncu/${o.id}`} className="ek-oy">
                        {o.foto_v
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img className="ek-mini" src={`/turnuva/oyuncu/${o.id}/foto?v=${o.foto_v}`} alt="" width={28} height={28} loading="lazy" />
                          : <span className="ek-mini bos" aria-hidden>{o.ad.slice(0, 1)}</span>}
                        {o.ad}
                      </Link>
                    </th>
                    <td className="gizle-m">{o.mevki || "–"}</td>
                    <td>{o.yas ?? "–"}</td>
                    <td className={i.gol ? "p" : "s"}>{i.gol}</td>
                    <td className={i.asist ? "p" : "s"}>{i.asist}</td>
                    <td className={i.sari ? "" : "s"}>{i.sari}</td>
                    <td className={i.kirmizi ? "" : "s"}>{i.kirmizi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="kap ek-bolum">
        <h2 className="s-h2">Maçlar</h2>
        {maclar.length === 0 ? <p className="ek-bos">Fikstür henüz çıkmadı.</p> : (
          <ol className="ek-liste">
            {maclar.map((m) => {
              const ev = m.ev_id === id;
              const rakip = tk.get((ev ? m.dep_id : m.ev_id) ?? -1);
              const skor = oynandi(m) ? (ev ? `${m.ev_gol} – ${m.dep_gol}` : `${m.dep_gol} – ${m.ev_gol}`) : "–";
              return (
                <li key={m.id}>
                  <Link href={`/turnuva/mac/${m.id}`}>
                    <span className="dk">{m.asama === "grup" ? m.grup : ASAMA_AD[m.asama].split(" ")[0]}</span>
                    <span><TakimAdi t={rakip} boy={20} /><small>{m.canli ? "CANLI" : tarihYaz(m.zaman, true)}{ev ? " · ev" : " · deplasman"}</small></span>
                    <span className="sag">{skor}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      {v.turnuva.ornek && <p className="ornek kap">Turnuva verileri örnektir.</p>}
    </>
  );
}
