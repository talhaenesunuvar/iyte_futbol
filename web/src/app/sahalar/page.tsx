import type { Metadata, ResolvingMetadata } from "next";
import "./sahalar.css";
import UstMenu from "@/components/UstMenu";
import AltKisim from "@/components/AltKisim";
import { ayarlar } from "@/lib/ayar";
import { OKUL_ILK, OKUL_SON, gunEtiket, okulDoluluk } from "@/lib/okul-saha";
import { OG_BASE, SITE_AD } from "@/lib/site";

const ACIKLAMA = "Kampüs çevresindeki halı sahalar: okul sahasının dolu ve boş saatleri, Köy Sahası ücretsiz randevusu.";

export async function generateMetadata(_: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const images = (await parent).openGraph?.images ?? [];
  return {
    title: "Sahalar",
    description: ACIKLAMA,
    alternates: { canonical: "/sahalar" },
    openGraph: { ...OG_BASE, title: `Sahalar · ${SITE_AD}`, description: ACIKLAMA, url: "/sahalar", images },
  };
}

const iki = (n: number) => String(n % 24).padStart(2, "0");
const SAATLER = Array.from({ length: OKUL_SON - OKUL_ILK }, (_, i) => OKUL_ILK + i);
const disMi = (u: string) => /^https?:\/\//.test(u);

export default async function Page() {
  const [a, okul] = await Promise.all([ayarlar(), okulDoluluk()]);
  const koyDis = disMi(a.koy_url);
  return (
    <div className="s-sayfa t-saha">
      <UstMenu />
      <main>
        <section className="s-giris kap">
          <p className="s-etiket">Halı saha</p>
          <h1>Sahalar</h1>
          <p className="s-soz">Okul sahasında hangi saatler dolu, buradan bak; boş saati okulun sisteminden al. Köy Sahası için randevu ayrı sayfada, ücretsiz.</p>
        </section>

        <section className="s-bolum kap okul" id="okul" aria-labelledby="okul-b">
          <div className="okul-ust">
            <div>
              <h2 id="okul-b" className="s-h2">Okul Sahası</h2>
              <p className="s-aciklama">{a.okul_saha_bilgi}</p>
            </div>
            <a className="btn" href={a.okul_randevu_url} target="_blank" rel="noopener noreferrer">Randevu al ↗</a>
          </div>

          <div className="izgara-kap" tabIndex={0} role="region" aria-label="Okul sahası haftalık doluluk, yatay kaydırılabilir">
            <table className="izgara">
              <caption className="gizli">Okul sahası önümüzdeki 7 gün doluluk</caption>
              <thead>
                <tr>
                  <th scope="col"><span className="gizli">Saat</span></th>
                  {okul.gunler.map((t, i) => {
                    const g = gunEtiket(t);
                    return <th key={t} scope="col" className={i === 0 ? "bugun" : ""}><small>{i === 0 ? "Bugün" : g.kisa}</small><strong>{g.no}</strong></th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {SAATLER.map((h) => (
                  <tr key={h}>
                    <th scope="row">{iki(h)}:00</th>
                    {okul.gunler.map((t) => {
                      const d = okul.dolu.find((x) => x.tarih === t && x.bas <= h && h < x.bit);
                      // Hucre yalniz kaydin ilk saatinde cizilir, sonraki saatler rowSpan ile kaplanir
                      if (d && Math.max(d.bas, OKUL_ILK) !== h) return null;
                      if (d) {
                        return (
                          <td key={t} rowSpan={Math.min(d.bit, OKUL_SON) - h} className="dolu">
                            <span>{iki(d.bas)}–{iki(d.bit)}</span>
                            <small>{d.etiket || "Dolu"}</small>
                          </td>
                        );
                      }
                      return <td key={t} className="bos" aria-label={`${gunEtiket(t).uzun} ${iki(h)}:00 boş`} />;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ornek">Doluluk topluluk tarafından elle güncellenir; kesin durum için okulun sistemine bak.</p>
        </section>

        <section className="s-bolum kap" id="koy" aria-labelledby="koy-b">
          <a className="koy-kart" href={a.koy_url} target="_blank" rel={koyDis ? "noopener noreferrer" : undefined}>
            <span className="s-etiket">Ayrı sayfada · ücretsiz randevu</span>
            <h2 id="koy-b">Köy Sahası</h2>
            <p>Mahallenin halı sahası. Her gün 17.00–03.00 arası saat başı; gününü ve saatini seç, randevunu al.</p>
            <span className="git">Randevu sayfasını aç ↗</span>
          </a>
        </section>
      </main>
      <AltKisim />
    </div>
  );
}
