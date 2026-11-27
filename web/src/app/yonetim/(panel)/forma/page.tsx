import { db } from "@/lib/db";
import { yetkiGerekli } from "@/lib/yetki";
import { ayarlarTaze } from "@/lib/ayar";
import { waNumara } from "@/lib/islem";
import { PARTI_DURUM, SIPARIS_DURUM, fiyatlar, type PartiDurum, type SiparisDurum } from "@/lib/forma";
import { partiDurumAction, siparisDurumAction } from "./islemler";
import ElleSiparis from "./ElleSiparis";

export const metadata = { title: "Forma siparişleri" };

type Parti = { id: number; hedef: number; durum: PartiDurum; olusturma: Date };
type Siparis = { id: number; parti_id: number; ad: string; telefon: string; beden: string; arka_isim: string; numara: number | null; yazi: boolean; logo3d: boolean; tutar: number | null; kod: string; durum: SiparisDurum; ornek: boolean; olusturma: Date };

const ROZET: Record<SiparisDurum, string> = { kapora_bekliyor: "sari", kapora_alindi: "yesil", odendi: "yesil", iptal: "gri" };

export default async function FormaPanel() {
  await yetkiGerekli();
  const a = await ayarlarTaze();
  const f = fiyatlar(a);
  const sql = await db();
  const partiler = await sql<Parti[]>`select id, hedef, durum, olusturma from forma_parti order by id desc`;
  const siparisler = await sql<Siparis[]>`select * from forma_siparis order by id`;
  const beden = await sql<{ beden: string; n: number }[]>`select beden, count(*)::int as n from forma_siparis where durum <> 'iptal' group by beden`;
  const bedenSirali = [...f.bedenler, ...beden.map((b) => b.beden).filter((b) => !f.bedenler.includes(b))];

  const odemeMesaji = (s: Siparis) =>
    `Merhaba ${s.ad.split(" ")[0]}, İYTE Futbol forma partisi doldu! Kalan ödeme: ${Math.max(0, (s.tutar ?? f.fiyat) - f.kapora).toLocaleString("tr-TR")} TL.` +
    (a.iban ? ` IBAN: ${a.iban}${a.iban_alici ? ` (${a.iban_alici})` : ""}.` : "") +
    ` Açıklamaya sipariş kodunu yaz: ${s.kod}. Teşekkürler!`;

  return (
    <>
      <div className="y-baslik">
        <h1>Forma siparişleri</h1>
        <p className="y-soluk">Fiyat {f.fiyat} TL · isim/numara +{f.yazi} TL · 3D logo +{f.logo3d} TL · kapora {f.kapora} TL · parti hedefi {f.hedef} kişi (Ayarlar&apos;dan değişir).{!a.iban && " IBAN girilmemiş: Ayarlar'dan ekle."}</p>
        <div className="y-dugmeler"><a className="y-btn" href="/yonetim/forma/excel" download>Excel olarak indir</a></div>
      </div>

      <section className="y-kart">
        <h2>Beden özeti</h2>
        <div className="y-dugmeler">
          {bedenSirali.map((b) => <span key={b} className="y-rozet">{b}: {beden.find((x) => x.beden === b)?.n ?? 0}</span>)}
        </div>
      </section>

      {partiler.length === 0 && <p className="y-bos">Henüz sipariş yok.</p>}

      {partiler.map((p) => {
        const liste = siparisler.filter((s) => s.parti_id === p.id);
        const onayli = liste.filter((s) => s.durum === "kapora_alindi" || s.durum === "odendi").length;
        const doldu = p.durum !== "acik";
        return (
          <section key={p.id} className="y-kart">
            <div className="y-baslik">
              <h2>Parti #{p.id} <span className={"y-rozet " + (p.durum === "acik" ? "sari" : "yesil")}>{PARTI_DURUM[p.durum]}</span></h2>
              <form action={partiDurumAction} className="y-dugmeler">
                <input type="hidden" name="id" value={p.id} />
                <select name="durum" defaultValue={p.durum} aria-label="Parti durumu" style={{ width: "auto" }}>
                  {Object.entries(PARTI_DURUM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button className="y-btn ikincil kucuk">Kaydet</button>
              </form>
              <p className="y-soluk">Onaylı {onayli} / {p.hedef} · toplam kayıt {liste.filter((s) => s.durum !== "iptal").length}</p>
            </div>
            {liste.length === 0 ? <p className="y-bos">Bu partide sipariş yok.</p> : (
              <div className="y-tablo-kap">
                <table className="y-tablo">
                  <thead><tr><th>Kod</th><th>Ad</th><th>Telefon</th><th>Beden</th><th>Arka</th><th>3D logo</th><th>Tutar</th><th>Durum</th><th className="sag">İşlem</th></tr></thead>
                  <tbody>
                    {liste.map((s) => (
                      <tr key={s.id}>
                        <td><code>{s.kod}</code>{s.ornek && <> <span className="y-rozet gri">örnek</span></>}</td>
                        <td>{s.ad}</td>
                        <td><a href={`tel:+${waNumara(s.telefon)}`}>0{s.telefon}</a></td>
                        <td>{s.beden}</td>
                        <td>{s.yazi ? `${s.arka_isim || "—"} ${s.numara ?? ""}` : "Yazısız"}</td>
                        <td>{s.logo3d ? "Var" : "—"}</td>
                        <td>{(s.tutar ?? f.fiyat).toLocaleString("tr-TR")} TL</td>
                        <td><span className={"y-rozet " + ROZET[s.durum]}>{SIPARIS_DURUM[s.durum]}</span></td>
                        <td className="sag">
                          <div className="y-dugmeler" style={{ justifyContent: "flex-end" }}>
                            <form action={siparisDurumAction} className="y-dugmeler">
                              <input type="hidden" name="id" value={s.id} />
                              <select name="durum" defaultValue={s.durum} aria-label="Sipariş durumu" style={{ width: "auto" }}>
                                {Object.entries(SIPARIS_DURUM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                              <button className="y-btn ikincil kucuk">Kaydet</button>
                            </form>
                            {doldu && s.durum === "kapora_alindi" && (
                              <a className="y-btn kucuk" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${waNumara(s.telefon)}?text=${encodeURIComponent(odemeMesaji(s))}`}>Ödeme iste</a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}

      <details className="y-kart y-ac">
        <summary>Elle sipariş ekle</summary>
        <ElleSiparis bedenler={f.bedenler} />
      </details>
    </>
  );
}
