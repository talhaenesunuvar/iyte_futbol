import { db } from "@/lib/db";
import { yetkiGerekli } from "@/lib/yetki";
import { gunEtiket } from "@/lib/okul-saha";
import { okulSilAction } from "./islemler";
import OkulEkle from "./OkulEkle";

export const metadata = { title: "Okul Sahası" };

const iki = (n: number) => String(n % 24).padStart(2, "0");

export default async function OkulPanel() {
  await yetkiGerekli();
  const sql = await db();
  const [{ bugun }] = await sql<{ bugun: string }[]>`select (now() at time zone 'Europe/Istanbul')::date as bugun`;
  const liste = await sql<{ id: number; tarih: string; bas: number; bit: number; etiket: string }[]>`
    select id, tarih, bas, bit, etiket from okul_dolu where tarih >= ${bugun} order by tarih, bas`;
  return (
    <>
      <div className="y-baslik">
        <h1>Okul Sahası</h1>
        <p className="y-soluk">Okulun sistemi veri vermiyor; dolu saatleri buradan gir (WhatsApp grubundaki liste gibi). Sitede /sahalar sayfasında 7 günlük ızgarada görünür. Randevu linki Ayarlar&apos;da.</p>
      </div>
      <section className="y-kart">
        <h2>Doluluk ekle</h2>
        <OkulEkle bugun={bugun} />
      </section>
      <section className="y-kart">
        <h2>Önümüzdeki kayıtlar</h2>
        {liste.length === 0 ? <p className="y-bos">Kayıt yok.</p> : (
          <div className="y-tablo-kap">
            <table className="y-tablo">
              <thead><tr><th>Gün</th><th>Saat</th><th>Etiket</th><th className="sag">İşlem</th></tr></thead>
              <tbody>
                {liste.map((r) => (
                  <tr key={r.id}>
                    <td>{gunEtiket(r.tarih).uzun}</td>
                    <td>{iki(r.bas)}:00–{iki(r.bit)}:00</td>
                    <td>{r.etiket || "—"}</td>
                    <td className="sag"><form action={okulSilAction}><input type="hidden" name="id" value={r.id} /><button className="y-btn tehlike kucuk">Sil</button></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
