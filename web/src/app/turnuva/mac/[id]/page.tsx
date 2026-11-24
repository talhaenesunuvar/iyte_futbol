import type { Metadata, ResolvingMetadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../../turnuva.css";
import "./mac.css";
import UstMenu from "@/components/UstMenu";
import AltKisim from "@/components/AltKisim";
import { ASAMA_AD, kazanan, macTurnuvasi, oynandi, tarihYaz, turnuvaVerisiIcin, type Gol, type Kart, type Takim } from "@/lib/turnuva";
import CanliYenile from "../../CanliYenile";
import PaylasDugmesi from "../../PaylasDugmesi";
import TakimRozet from "../../TakimRozet";
import { OG_BASE, SITE_AD } from "@/lib/site";

// Mac detayi (Derin, 2026-11-22): kim gol atti, asistler, hakem, saha, tarih. Fikstur ve agactaki maclar buraya baglanir.
// Her macin kendi basligi/canonical'i (2026-11-24 SEO). Ornek turnuva Google'a girmez.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }, parent: ResolvingMetadata): Promise<Metadata> {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const tid = await macTurnuvasi(id);
  const v = tid === null ? null : await turnuvaVerisiIcin(tid);
  const m = v?.maclar.find((x) => x.id === id);
  if (!v || !m) notFound();
  const ad = (t: number | null) => v.takimlar.find((x) => x.id === t)?.ad ?? "?";
  const asama = m.asama === "grup" ? `${m.grup} Grubu` : ASAMA_AD[m.asama];
  const skor = oynandi(m) ? ` ${m.ev_gol}–${m.dep_gol} ` : " – ";
  const baslik = `${ad(m.ev_id)}${skor}${ad(m.dep_id)} · ${asama}`;
  const aciklama = `${v.turnuva.ad} ${v.turnuva.sezon}`.trim() + ` · ${asama}. ` +
    [m.zaman ? tarihYaz(m.zaman) : "", m.saha, m.hakem ? `Hakem: ${m.hakem}` : ""].filter(Boolean).join(" · ") + ". Goller, asistler ve kartlar.";
  const url = `/turnuva/mac/${id}`;
  const images = (await parent).openGraph?.images ?? [];
  return {
    title: baslik, description: aciklama, alternates: { canonical: url },
    openGraph: { ...OG_BASE, title: `${baslik} · ${SITE_AD}`, description: aciklama, url, images },
    ...(v.turnuva.ornek ? { robots: { index: false, follow: true } } : {}),
  };
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="s-sayfa t-tur t-mac">
      {/* Dinamik rotada usePathname calisma aninda gelir; menu Suspense icinde */}
      <Suspense fallback={null}><UstMenu /></Suspense>
      <main>
        <Suspense fallback={<p className="kap mac-bekle">Maç yükleniyor…</p>}>
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
  const tid = await macTurnuvasi(id);
  if (tid === null) notFound();
  const v = await turnuvaVerisiIcin(tid);
  const m = v?.maclar.find((x) => x.id === id);
  if (!v || !m) notFound();

  const tk = new Map(v.takimlar.map((t) => [t.id, t]));
  const ev = m.ev_id === null ? undefined : tk.get(m.ev_id);
  const dep = m.dep_id === null ? undefined : tk.get(m.dep_id);
  const k = kazanan(m);
  const goller = v.goller.filter((g) => g.mac_id === m.id);
  const evG = goller.filter((g) => g.takim_id === m.ev_id), depG = goller.filter((g) => g.takim_id === m.dep_id);
  const kartlar = v.kartlar.filter((x) => x.mac_id === m.id);
  const asama = m.asama === "grup" ? `${m.grup} Grubu` : ASAMA_AD[m.asama];
  const pen = m.ev_pen !== null && m.dep_pen !== null;

  return (
    <>
      {m.canli && <CanliYenile />}
      <section className="kap mac-ust">
        <Link href="/turnuva#fikstur" className="mac-geri">← {v.turnuva.ad} {v.turnuva.sezon}</Link>
        <p className="s-etiket">{asama}{m.canli && <> · <b className="canli-isaret">CANLI</b></>}</p>

        <h1 className="gizli">{ev?.ad ?? "?"} – {dep?.ad ?? "?"}, {asama}</h1>
        <div className="skorbord">
          <Taraf t={ev} galip={k !== null && k === m.ev_id} />
          <div className="sk">
            <strong>{oynandi(m) ? `${m.ev_gol} – ${m.dep_gol}` : "vs"}</strong>
            {pen && <small>Penaltılar {m.ev_pen}–{m.dep_pen}</small>}
            {!oynandi(m) && !m.canli && <small>Oynanmadı</small>}
          </div>
          <Taraf t={dep} galip={k !== null && k === m.dep_id} />
        </div>

        <dl className="mac-bilgi">
          <div><dt>Tarih</dt><dd>{m.zaman ? tarihYaz(m.zaman) : "Belli değil"}</dd></div>
          <div><dt>Saha</dt><dd>{m.saha || "Belli değil"}</dd></div>
          <div><dt>Hakem</dt><dd>{m.hakem || "Belli değil"}</dd></div>
        </dl>
        {oynandi(m) && ev && dep && (
          <PaylasDugmesi yol={`/turnuva/gorsel/mac/${m.id}`} dosya={`${ev.ad}-${dep.ad}`} etiket="Sonucu paylaş" />
        )}
      </section>

      <section className="kap mac-goller-b">
        <h2 className="s-h2">Goller</h2>
        {goller.length === 0 ? (
          <p className="s-aciklama">{oynandi(m) ? "Bu maç için gol kaydı girilmemiş." : "Maç oynandığında goller burada görünecek."}</p>
        ) : (
          <div className="gol-iki">
            <GolListesi baslik={ev?.ad ?? "Ev sahibi"} t={ev} l={evG} />
            <GolListesi baslik={dep?.ad ?? "Deplasman"} t={dep} l={depG} />
          </div>
        )}
      </section>
      {kartlar.length > 0 && (
        <section className="kap mac-goller-b">
          <h2 className="s-h2">Kartlar</h2>
          <div className="gol-iki">
            <KartListesi baslik={ev?.ad ?? "Ev sahibi"} t={ev} l={kartlar.filter((x) => x.takim_id === m.ev_id)} />
            <KartListesi baslik={dep?.ad ?? "Deplasman"} t={dep} l={kartlar.filter((x) => x.takim_id === m.dep_id)} />
          </div>
        </section>
      )}
      {v.turnuva.ornek && <p className="ornek kap">Turnuva verileri örnektir.</p>}
    </>
  );
}

function Taraf({ t, galip }: { t: Takim | undefined; galip: boolean }) {
  return (
    <div className={"taraf" + (galip ? " galip" : "")}>
      <TakimRozet t={t ?? null} boy={64} />
      {t ? <Link href={`/turnuva/takim/${t.id}`} className="taraf-ad">{t.ad}</Link> : <span>Belli değil</span>}
    </div>
  );
}

function GolListesi({ baslik, t, l }: { baslik: string; t: Takim | undefined; l: Gol[] }) {
  return (
    <div className="gol-l">
      <h3><TakimRozet t={t ?? null} boy={22} /> {baslik} <b>{l.length}</b></h3>
      {l.length === 0 ? <p className="y">Gol yok</p> : (
        <ol>
          {l.map((g) => (
            <li key={g.id}>
              <span className="dk">{g.dakika ? `${g.dakika}'` : "–"}</span>
              <span>
                <strong>{g.oyuncu_id ? <Link href={`/turnuva/oyuncu/${g.oyuncu_id}`}>{g.oyuncu}</Link> : g.oyuncu}</strong>
                {g.asist && <small>Asist: {g.asist_id ? <Link href={`/turnuva/oyuncu/${g.asist_id}`}>{g.asist}</Link> : g.asist}</small>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function KartListesi({ baslik, t, l }: { baslik: string; t: Takim | undefined; l: Kart[] }) {
  return (
    <div className="gol-l">
      <h3><TakimRozet t={t ?? null} boy={22} /> {baslik} <b>{l.length}</b></h3>
      {l.length === 0 ? <p className="y">Kart yok</p> : (
        <ol>
          {l.map((x) => (
            <li key={x.id}>
              <span className="dk">{x.dakika ? `${x.dakika}'` : "–"}</span>
              <span>
                <strong><span className={`kart-i ${x.renk}`} aria-hidden /> {x.oyuncu_id ? <Link href={`/turnuva/oyuncu/${x.oyuncu_id}`}>{x.oyuncu}</Link> : x.oyuncu}</strong>
                <small>{x.renk === "sari" ? "Sarı kart" : "Kırmızı kart"}</small>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
