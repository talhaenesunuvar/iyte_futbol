import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import "./ana/ana.css";
import { OG_BASE, SITE_ACIKLAMA, SITE_BASLIK } from "@/lib/site";
import UstMenu from "@/components/UstMenu";
import AltKisim from "@/components/AltKisim";
import AnaKabuk from "./ana/AnaKabuk";
import SahaCizgi from "./ana/SahaCizgi";
import { EPOSTA, ILETISIM, whatsappGruplari } from "@/lib/ortak";
import { ayarlar } from "@/lib/ayar";
import { tarihParca, yaklasanEtkinlikler } from "@/lib/etkinlik";
import { turnuvaOzet } from "@/lib/turnuva";
import { formaOzet } from "@/lib/forma";

// Ana sayfa (2026-11-22). Kale Agi hero'su Derin'in "cocukca" geri bildirimiyle kaldirildi;
// yerine koyu, kulup sitesi tonunda bir giris + veritabanindan gelen turnuva/forma/etkinlik ozetleri.
const SOZ = "Oynamak isteyen de izlemek isteyen de aynı sahada buluşuyor.".split(" ");

export async function generateMetadata(_: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const images = (await parent).openGraph?.images ?? [];
  return {
    alternates: { canonical: "/" },
    openGraph: { ...OG_BASE, title: SITE_BASLIK, description: SITE_ACIKLAMA, url: "/", images },
  };
}

const DURUM: Record<string, string> = { basvuru: "Başvurular açık", grup: "Grup maçları sürüyor", eleme: "Eleme turları", bitti: "Tamamlandı" };

export default async function Ana() {
  const [etkinlikler, tur, forma, ayar] = await Promise.all([yaklasanEtkinlikler(4), turnuvaOzet(), formaOzet(), ayarlar()]);
  // WhatsApp gruplari (Derin, 2026-11-27): panel Ayarlar'dan; bos ise dugme yok
  const gruplar = whatsappGruplari(ayar.whatsapp_gruplar);
  const ilk = etkinlikler[0];
  const ilkT = ilk ? tarihParca(ilk.tarih) : null;
  const doluluk = forma.hedef ? Math.min(1, forma.onayli / forma.hedef) : 0;

  return (
    <AnaKabuk>
      <UstMenu />
      <main>
        <section className="h-sah" id="ust">
          <SahaCizgi />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="h-kartal" src="/img/logo-bas.webp" alt="" width={654} height={712} fetchPriority="high" />
          <div className="h-ic kap">
            <p className="h-ust">İzmir Yüksek Teknoloji Enstitüsü</p>
            <h1 aria-label="İYTE Futbol">
              <span className="h-k"><span>İYTE</span></span>{" "}
              <span className="h-k"><span>FUTBOL</span></span>
            </h1>
            <p className="h-soz">Kampüsün futbol topluluğu. Turnuvalar, haftalık maçlar, takım forması ve saha randevusu tek yerde.</p>
            <div className="h-dugme">
              <Link className="btn" href="/turnuva">Turnuvaya bak</Link>
              {gruplar[0] && (
                <a className="btn h-wa" {...(gruplar.length > 1 ? { href: "#iletisim" } : { href: gruplar[0].url, target: "_blank", rel: "noopener noreferrer" })}>
                  <WaIkon /> {gruplar.length > 1 ? "WhatsApp grupları" : "WhatsApp grubuna katıl"}
                </a>
              )}
              <a className="btn h-cizgili" href={ILETISIM}>Bize ulaş</a>
            </div>
          </div>

          <div className="h-serit kap" aria-label="Öne çıkanlar">
            <a href="#etkinlikler" className="h-kutu">
              <small>Sıradaki etkinlik</small>
              {ilk && ilkT ? (
                <><strong>{ilk.ad}</strong><span>{ilkT.gun} {ilkT.ay} {ilkT.hafta}{ilk.saat ? `, ${ilk.saat}` : ""}</span></>
              ) : (
                <><strong>Yakında</strong><span>Takvim açıklanacak</span></>
              )}
            </a>
            <Link href="/turnuva" className="h-kutu">
              <small>{tur ? `${tur.ad} ${tur.sezon}` : "Turnuva"}</small>
              {tur?.canli ? (
                <><strong>Canlı: {tur.canli.ev} {tur.canli.evGol}-{tur.canli.depGol} {tur.canli.dep}</strong><span>Maç şu an oynanıyor</span></>
              ) : tur?.durum === "bitti" && tur.sampiyon ? (
                <><strong>Şampiyon: {tur.sampiyon}</strong><span>{tur.takim} takım · {tur.gol} gol</span></>
              ) : tur ? (
                <><strong>{DURUM[tur.durum]}</strong><span>{tur.takim} takım · {tur.oynanan}/{tur.mac} maç</span></>
              ) : (
                <><strong>Yakında</strong><span>Fikstür burada yayınlanacak</span></>
              )}
            </Link>
            <Link href="/forma" className="h-kutu">
              <small>Takım forması ön siparişi</small>
              <strong>{forma.onayli}/{forma.hedef} kişi</strong>
              <span className="h-bar" aria-hidden><i style={{ width: `${doluluk * 100}%` }} /></span>
            </Link>
          </div>
        </section>

        <section className="biz kap" id="hakkimizda">
          <div>
            <p className="b-etiket">Hakkımızda</p>
            <h2 className="soz">{SOZ.map((k, i) => <span key={i}><b>{k}</b>{i < SOZ.length - 1 ? " " : ""}</span>)}</h2>
            <ul className="b-ayak">
              <li className="r"><strong>Turnuvalar</strong><span>Her dönem kampüs çapında turnuva: kura, gruplar, eleme.</span></li>
              <li className="r" style={{ "--g": ".08s" } as React.CSSProperties}><strong>Haftalık maçlar</strong><span>Okul ve köy sahasında düzenli maçlar, isteyen herkese açık.</span></li>
              <li className="r" style={{ "--g": ".16s" } as React.CSSProperties}><strong>Topluluk</strong><span>Derbi izlemeleri, buluşmalar ve takım forması.</span></li>
            </ul>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="b-rozet" src="/img/logo-rozet.webp" alt="İYTE Futbol rozeti" width={684} height={684} />
        </section>

        <section className="etk kap" id="etkinlikler">
          <h2>Yaklaşan etkinlikler</h2>
          {etkinlikler.length === 0 ? (
            <p className="etk-bos">Şu an planlanmış etkinlik yok. Duyurular için bize ulaşabilirsin.</p>
          ) : (
            <ol>
              {etkinlikler.map((e, i) => {
                const t = tarihParca(e.tarih);
                return (
                  <li key={e.id} className="r" style={{ "--g": `${i * 0.08}s` } as React.CSSProperties}>
                    <span className="t">{t.gun}<small>{t.ay}</small></span>
                    <div><h3>{e.ad}</h3><p>{[e.tur, e.yer, e.saat].filter(Boolean).join(", ")}</p></div>
                    <span className="hg">{t.hafta}</span>
                  </li>
                );
              })}
            </ol>
          )}
          {etkinlikler.some((e) => e.ornek) && <p className="ornek">Etkinlikler örnek içeriktir.</p>}
        </section>

        <section className="mod kap" aria-label="Topluluk sayfaları">
          <Link href="/turnuva" className="m-kart r">
            <small>01</small><h3>Turnuva</h3><p>Gruplar, fikstür, eleme ağacı ve gol krallığı.</p><span aria-hidden>→</span>
          </Link>
          <Link href="/forma" className="m-kart r" style={{ "--g": ".08s" } as React.CSSProperties}>
            <small>02</small><h3>Forma</h3><p>Takım formasına ön sipariş ver, parti dolunca üretime girsin.</p><span aria-hidden>→</span>
          </Link>
          <Link href="/sahalar" className="m-kart r" style={{ "--g": ".16s" } as React.CSSProperties}>
            <small>03</small><h3>Sahalar</h3><p>Okul sahasının dolu saatleri ve köy sahası randevusu.</p><span aria-hidden>→</span>
          </Link>
        </section>

        <section className="son" id="iletisim">
          <SahaCizgi acik />
          <div className="kap">
            <h2>Sıradaki maç senin.</h2>
            <p>Takıma katılmak, turnuvaya başvurmak ya da bir şey sormak için yaz.</p>
            {gruplar.length > 0 && (
              <ul className="wa-gruplar" aria-label="WhatsApp grupları">
                {gruplar.map((g) => (
                  <li key={g.url}><a className="btn h-wa" href={g.url} target="_blank" rel="noopener noreferrer"><WaIkon /> {g.ad}</a></li>
                ))}
              </ul>
            )}
            <a className="btn ters" href={ILETISIM}>E-posta gönder</a>
            <p className="eposta-yazi"><a href={ILETISIM}>{EPOSTA}</a></p>
          </div>
        </section>
      </main>
      <AltKisim />
    </AnaKabuk>
  );
}

// WhatsApp simgesi (tek renk, metin rengini alir)
function WaIkon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="currentColor" style={{ flex: "none" }}>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}
