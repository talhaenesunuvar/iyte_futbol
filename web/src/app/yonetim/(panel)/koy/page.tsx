import { db } from "@/lib/db";
import { yetkiGerekli } from "@/lib/yetki";
import { waNumara } from "@/lib/islem";
import { SLOTLAR } from "@/lib/koy-sahasi";
import { acAction, iptalAction, kapatAction } from "./islemler";
import ElleRandevu from "./ElleRandevu";

export const metadata = { title: "Köy Sahası" };

type Randevu = { id: number; tarih: string; slot: number; ad: string; telefon: string; notu: string; kod: string };
type Kapali = { tarih: string; slot: number; sebep: string };

const GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const baslik = (t: string) => { const d = new Date(t + "T12:00:00Z"); return `${d.getUTCDate()} ${AY[d.getUTCMonth()]} ${GUN[d.getUTCDay()]}`; };

export default async function KoyPanel() {
  await yetkiGerekli();
  const sql = await db();
  const gunler = await sql<{ tarih: string }[]>`select g::date as tarih from generate_series((now() at time zone 'Europe/Istanbul')::date, (now() at time zone 'Europe/Istanbul')::date + 13, interval '1 day') g`;
  const ilk = gunler[0].tarih, son = gunler[gunler.length - 1].tarih;
  const randevular = await sql<Randevu[]>`select id, tarih, slot, ad, telefon, notu, kod from koy_randevu where durum = 'aktif' and tarih between ${ilk} and ${son} order by tarih, slot`;
  const kapalilar = await sql<Kapali[]>`select tarih, slot, sebep from koy_kapali where tarih between ${ilk} and ${son} order by tarih, slot`;
  const gunSecenek = gunler.map((g) => ({ tarih: g.tarih, baslik: baslik(g.tarih) }));

  return (
    <>
      <div className="y-baslik">
        <h1>Köy Sahası</h1>
        <p className="y-soluk">Önümüzdeki 14 gün. Site herkese 7 gün gösterir; haftada bir randevu (telefon başına) kuralı geçerli.</p>
      </div>

      <section className="y-kart">
        <h2>Randevular</h2>
        {randevular.length === 0 && kapalilar.length === 0 ? <p className="y-bos">Önümüzdeki 14 günde randevu yok.</p> : (
          <div className="y-tablo-kap">
            <table className="y-tablo">
              <thead><tr><th>Gün</th><th>Saat</th><th>Kim</th><th>Not</th><th className="sag">İşlem</th></tr></thead>
              <tbody>
                {gunler.flatMap(({ tarih }) => [
                  ...kapalilar.filter((k) => k.tarih === tarih).map((k) => (
                    <tr key={`k${tarih}${k.slot}`}>
                      <td>{baslik(tarih)}</td><td>{SLOTLAR[k.slot]?.etiket}</td>
                      <td><span className="y-rozet gri">Kapalı</span> {k.sebep}</td><td />
                      <td className="sag"><form action={acAction}><input type="hidden" name="tarih" value={tarih} /><input type="hidden" name="slot" value={k.slot} /><button className="y-btn ikincil kucuk">Aç</button></form></td>
                    </tr>
                  )),
                  ...randevular.filter((r) => r.tarih === tarih).map((r) => (
                    <tr key={r.id}>
                      <td>{baslik(tarih)}</td><td>{SLOTLAR[r.slot]?.etiket}</td>
                      <td>{r.ad} · <a href={`https://wa.me/${waNumara(r.telefon)}`} target="_blank" rel="noopener noreferrer">0{r.telefon}</a> <code className="y-soluk">{r.kod}</code></td>
                      <td>{r.notu}</td>
                      <td className="sag"><form action={iptalAction}><input type="hidden" name="id" value={r.id} /><button className="y-btn tehlike kucuk">İptal</button></form></td>
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="y-kart">
        <h2>Saat kapat</h2>
        <p className="y-soluk">Bakım, maç ya da saha sahibinin kullanımı için. Kapalı saat sitede randevuya açılmaz.</p>
        <form action={kapatAction} className="y-satir">
          <label>Gün<select name="tarih">{gunSecenek.map((g) => <option key={g.tarih} value={g.tarih}>{g.baslik}</option>)}</select></label>
          <label>Saat<select name="slot"><option value="hepsi">Bütün gün</option>{SLOTLAR.map((s) => <option key={s.sira} value={s.sira}>{s.etiket}</option>)}</select></label>
          <label>Sebep<input name="sebep" placeholder="Bakım" /></label>
          <div><button className="y-btn">Kapat</button></div>
        </form>
      </section>

      <details className="y-kart y-ac">
        <summary>Elle randevu ekle</summary>
        <ElleRandevu gunler={gunSecenek} />
      </details>
    </>
  );
}
