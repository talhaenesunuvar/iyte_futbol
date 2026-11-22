"use client";

import { useActionState } from "react";
import { okulEkleAction, type OkulSonuc } from "./islemler";

const SAAT = Array.from({ length: 17 }, (_, i) => 8 + i);

export default function OkulEkle({ bugun }: { bugun: string }) {
  const [d, gonder, bekliyor] = useActionState<OkulSonuc, FormData>(okulEkleAction, {});
  return (
    <form action={gonder} className="y-form">
      <div className="y-satir">
        <label>Tarih<input type="date" name="tarih" defaultValue={bugun} required /></label>
        <label>Başlangıç<select name="bas" defaultValue={19}>{SAAT.slice(0, -1).map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}</select></label>
        <label>Bitiş<select name="bit" defaultValue={20}>{SAAT.slice(1).map((h) => <option key={h} value={h}>{String(h % 24).padStart(2, "0")}:00</option>)}</select></label>
        <label>Etiket (kim aldı)<input name="etiket" placeholder="Yiğit" maxLength={40} /></label>
        <label>Haftalık tekrar<input type="number" name="tekrar" min={1} max={20} defaultValue={1} /></label>
      </div>
      {d.hata && <p className="y-hata">{d.hata}</p>}
      {d.tamam && <p className="y-tamam">{d.tamam}</p>}
      <div><button className="y-btn" disabled={bekliyor}>Doluluk ekle</button></div>
    </form>
  );
}
