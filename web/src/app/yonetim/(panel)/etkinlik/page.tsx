import { yetkiGerekli } from "@/lib/yetki";
import { tumEtkinlikler } from "@/lib/etkinlik";
import { etkinlikEkle, etkinlikGuncelle, etkinlikSil } from "./islemler";

export const metadata = { title: "Etkinlikler" };

export default async function EtkinlikPanel() {
  await yetkiGerekli();
  const liste = await tumEtkinlikler();
  return (
    <>
      <div className="y-baslik">
        <h1>Etkinlikler</h1>
        <p className="y-soluk">Ana sayfadaki &quot;Yaklaşan etkinlikler&quot; listesi. Tarihi geçenler sitede görünmez.</p>
      </div>

      <section className="y-kart">
        <h2>Yeni etkinlik</h2>
        <form action={etkinlikEkle} className="y-form">
          <div className="y-satir">
            <label>Tarih<input type="date" name="tarih" required /></label>
            <label>Saat<input name="saat" placeholder="19.00" maxLength={10} /></label>
            <label>Tür<input name="tur" placeholder="Maç, Turnuva, Buluşma" maxLength={40} /></label>
          </div>
          <div className="y-satir">
            <label>Ad<input name="ad" required maxLength={80} /></label>
            <label>Yer<input name="yer" placeholder="Kampüs sahası" maxLength={80} /></label>
          </div>
          <div><button className="y-btn" type="submit">Ekle</button></div>
        </form>
      </section>

      <section className="y-kart">
        <h2>Kayıtlı etkinlikler</h2>
        {liste.length === 0 ? (
          <p className="y-bos">Henüz etkinlik yok.</p>
        ) : (
          <div className="y-tablo-kap">
            <table className="y-tablo">
              <thead><tr><th>Tarih</th><th>Saat</th><th>Ad</th><th>Tür</th><th>Yer</th><th className="sag">İşlem</th></tr></thead>
              <tbody>
                {liste.map((e) => {
                  const form = `e${e.id}`;
                  return (
                    <tr key={e.id}>
                      <td><input form={form} type="date" name="tarih" defaultValue={e.tarih} required /></td>
                      <td><input form={form} name="saat" defaultValue={e.saat} maxLength={10} style={{ width: 80 }} /></td>
                      <td><input form={form} name="ad" defaultValue={e.ad} required maxLength={80} />{e.ornek && <> <span className="y-rozet gri">örnek</span></>}</td>
                      <td><input form={form} name="tur" defaultValue={e.tur} maxLength={40} /></td>
                      <td><input form={form} name="yer" defaultValue={e.yer} maxLength={80} /></td>
                      <td className="sag">
                        <div className="y-dugmeler" style={{ justifyContent: "flex-end" }}>
                          <form id={form} action={etkinlikGuncelle}><input type="hidden" name="id" value={e.id} /><button className="y-btn ikincil kucuk" type="submit">Kaydet</button></form>
                          <form action={etkinlikSil}><input type="hidden" name="id" value={e.id} /><button className="y-btn tehlike kucuk" type="submit">Sil</button></form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
