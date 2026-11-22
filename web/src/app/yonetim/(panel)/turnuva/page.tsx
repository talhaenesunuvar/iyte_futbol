import Link from "next/link";
import { yetkiGerekli } from "@/lib/yetki";
import { DURUM_AD, turnuvaListesi } from "@/lib/turnuva";
import { ORNEK_KURALLAR } from "@/lib/tohum/turnuva";
import TurnuvaFormu from "./TurnuvaFormu";

export const metadata = { title: "Turnuva" };

export default async function TurnuvaListe() {
  await yetkiGerekli();
  const liste = await turnuvaListesi();
  return (
    <>
      <div className="y-baslik">
        <h1>Turnuva</h1>
        <p className="y-soluk">Sitede &quot;aktif&quot; işaretli turnuva gösterilir; aktif yoksa en yenisi.</p>
      </div>
      {liste.length === 0 ? (
        <p className="y-bos">Henüz turnuva yok. Aşağıdan oluştur.</p>
      ) : (
        <div className="y-tablo-kap">
          <table className="y-tablo">
            <thead><tr><th>Turnuva</th><th>Durum</th><th className="sag">Takım</th><th className="sag">Bekleyen başvuru</th><th></th></tr></thead>
            <tbody>
              {liste.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.ad}</strong> <span className="y-soluk">{t.sezon}</span>{" "}
                    {t.aktif && <span className="y-rozet yesil">Sitede</span>} {t.ornek && <span className="y-rozet gri">Örnek</span>}
                  </td>
                  <td>{DURUM_AD[t.durum]}{t.basvuru_acik && <> · <span className="y-rozet sari">Başvuru açık</span></>}</td>
                  <td className="sag">{t.takim}</td>
                  <td className="sag">{t.bekleyen > 0 ? <span className="y-rozet kirmizi">{t.bekleyen}</span> : 0}</td>
                  <td className="sag"><Link className="y-btn kucuk" href={`/yonetim/turnuva/${t.id}`}>Yönet</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <section className="y-kart">
        <details className="y-ac" open={liste.length === 0}>
          <summary>Yeni turnuva oluştur</summary>
          <div style={{ marginTop: 14 }}>
            <TurnuvaFormu varsayilan={{ ad: "İYTE Cup", sezon: "", durum: "basvuru", aciklama: "", kurallar: ORNEK_KURALLAR, kontenjan: 32, basvuru_acik: true, aktif: liste.length === 0 }} />
          </div>
        </details>
      </section>
    </>
  );
}
