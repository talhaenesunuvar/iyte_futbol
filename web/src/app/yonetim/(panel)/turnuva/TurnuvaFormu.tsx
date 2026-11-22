import { DURUMLAR, DURUM_AD, type Turnuva } from "@/lib/turnuva-hesap";
import { turnuvaKaydetAction } from "./islemler";

type Deger = Pick<Turnuva, "ad" | "sezon" | "durum" | "aciklama" | "kurallar" | "kontenjan" | "basvuru_acik" | "aktif"> & { id?: number };

export default function TurnuvaFormu({ varsayilan: v }: { varsayilan: Deger }) {
  return (
    <form action={turnuvaKaydetAction} className="y-form">
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <div className="y-satir">
        <label>Ad<input name="ad" defaultValue={v.ad} maxLength={80} required /></label>
        <label>Sezon<input name="sezon" defaultValue={v.sezon} maxLength={40} placeholder="2026 Bahar" /></label>
        <label>Durum
          <select name="durum" defaultValue={v.durum}>{DURUMLAR.map((d) => <option key={d} value={d}>{DURUM_AD[d]}</option>)}</select>
        </label>
        <label>Kontenjan (takım)<input name="kontenjan" type="number" min={2} max={64} defaultValue={v.kontenjan} /></label>
      </div>
      <label>Açıklama<textarea name="aciklama" rows={2} defaultValue={v.aciklama} maxLength={1000} /></label>
      <label>Kurallar (her satır bir madde)<textarea name="kurallar" rows={7} defaultValue={v.kurallar} maxLength={5000} /></label>
      <div className="y-dugmeler">
        <label className="y-onay"><input type="checkbox" name="basvuru_acik" defaultChecked={v.basvuru_acik} /> Başvurular açık</label>
        <label className="y-onay"><input type="checkbox" name="aktif" defaultChecked={v.aktif} /> Sitede göster (aktif)</label>
      </div>
      <div><button className="y-btn" type="submit">{v.id ? "Kaydet" : "Oluştur"}</button></div>
    </form>
  );
}
