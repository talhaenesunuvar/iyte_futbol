import type { Metadata, ResolvingMetadata } from "next";
import "./forma.css";
import UstMenu from "@/components/UstMenu";
import AltKisim from "@/components/AltKisim";
import { formaVitrin } from "@/lib/forma";
import { OG_BASE, SITE_AD } from "@/lib/site";
import FormaIstemci from "./FormaIstemci";

const ACIKLAMA = "İYTE Futbol forması ön siparişi. Kaporanı bırak, adını ve numaranı yazdır; parti dolunca toplu üretime giriyor.";

export async function generateMetadata(_: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const images = (await parent).openGraph?.images ?? [];
  return {
    title: "Forma",
    description: ACIKLAMA,
    alternates: { canonical: "/forma" },
    openGraph: { ...OG_BASE, title: `Forma · ${SITE_AD}`, description: ACIKLAMA, url: "/forma", images },
  };
}

const TL = (n: number) => `${n.toLocaleString("tr-TR")} TL`;

export default async function Page() {
  const v = await formaVitrin();
  const kalan = Math.max(0, v.hedef - v.onayli);
  const oran = Math.min(100, Math.round((v.onayli / v.hedef) * 100));
  const adimlar: [string, string][] = [
    ["Siparişini ver", "Bedenini, forma arkasına yazılacak ismi ve numaranı seç."],
    ["Kaporanı bırak", `${TL(v.kapora)} kaporayı IBAN'a gönder, açıklamaya sipariş kodunu yaz.`],
    ["Parti dolsun", `Toplu üretim için ${v.hedef} kişi gerekiyor. Kaporası onaylanan herkes sayılır.`],
    ["Kalanı öde", `Parti dolunca sana yazıyoruz; kalan ${TL(v.fiyat - v.kapora)} ödenince üretime giriyor.`],
  ];
  return (
    <div className="s-sayfa t-forma">
      <UstMenu />
      <main>
        <section className="s-giris kap">
          <p className="s-etiket">Forma lansmanı</p>
          <h1>Forma</h1>
          <p className="s-soz">Topluluğun forması geldi. Tek tek değil, parti parti üretiliyor: {v.hedef} kişi olunca sipariş veriliyor.</p>
          <div className="s-dugme">
            <a className="btn" href="#siparis">Sipariş ver</a>
            <span className="fiyat">{TL(v.fiyat)} <small>· kapora {TL(v.kapora)}</small></span>
          </div>
        </section>

        <section className="s-bolum kap" id="parti" aria-labelledby="parti-b">
          <div className="parti s-kart">
            <div className="parti-ust">
              <h2 id="parti-b">{v.partiNo ? `Parti #${v.partiNo}` : "İlk parti"}</h2>
              <p><strong>{v.onayli}</strong> / {v.hedef} kişi</p>
            </div>
            <div className="cubuk" role="progressbar" aria-valuemin={0} aria-valuemax={v.hedef} aria-valuenow={v.onayli} aria-label="Kaporası onaylanan kişi">
              <span style={{ width: `${oran}%` }} />
            </div>
            <p className="parti-alt">
              {kalan > 0 ? `${kalan} kişi daha gerekiyor.` : "Parti doldu, yeni siparişler sonraki partiye yazılır."}
              {v.bekleyen > 0 && ` ${v.bekleyen} kişinin kaporası onay bekliyor.`}
            </p>
            {v.kisiler.length > 0 && (
              <ul className="kisiler" aria-label="Bu partideki kişiler">
                {v.kisiler.map((k, i) => <li key={i} className={k.onayli ? "onay" : ""}>{k.ad}</li>)}
              </ul>
            )}
          </div>
        </section>

        <section className="s-bolum kap" aria-labelledby="adim-b">
          <h2 id="adim-b" className="s-h2">Nasıl işliyor</h2>
          <ol className="adimlar">
            {adimlar.map(([b, a], i) => (
              <li key={b}><span>{i + 1}</span><h3>{b}</h3><p>{a}</p></li>
            ))}
          </ol>
        </section>

        <FormaIstemci bedenler={v.bedenler} kapora={v.kapora} />
      </main>
      <AltKisim />
    </div>
  );
}
