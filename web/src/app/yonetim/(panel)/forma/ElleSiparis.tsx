"use client";

import { useActionState } from "react";
import { elleSiparisAction, type ElleSonuc } from "./islemler";

export default function ElleSiparis({ bedenler }: { bedenler: string[] }) {
  const [d, gonder, bekliyor] = useActionState<ElleSonuc, FormData>(elleSiparisAction, {});
  return (
    <form action={gonder} className="y-form">
      <div className="y-satir">
        <label>Ad Soyad<input name="ad" required /></label>
        <label>Telefon<input name="telefon" type="tel" required /></label>
        <label>Beden<select name="beden" required defaultValue="">{[<option key="" value="" disabled>Seç</option>, ...bedenler.map((b) => <option key={b}>{b}</option>)]}</select></label>
        <label>Arka isim<input name="arka_isim" maxLength={12} /></label>
        <label>Numara<input name="numara" type="number" min={1} max={99} /></label>
      </div>
      <label className="y-onay"><input type="checkbox" name="kapora" /> Kapora alındı</label>
      {d.hata && <p className="y-hata">{d.hata}</p>}
      {d.tamam && <p className="y-tamam">{d.tamam}</p>}
      <div><button className="y-btn" disabled={bekliyor}>Sipariş ekle</button></div>
    </form>
  );
}
