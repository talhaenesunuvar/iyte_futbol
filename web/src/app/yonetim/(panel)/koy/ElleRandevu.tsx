"use client";

import { useActionState } from "react";
import { SLOTLAR } from "@/lib/koy-sahasi";
import { elleRandevuAction, type ElleSonuc } from "./islemler";

// Ogrenci olmayan mahalleli WhatsApp'tan yazinca panelden elle randevu
export default function ElleRandevu({ gunler }: { gunler: { tarih: string; baslik: string }[] }) {
  const [d, gonder, bekliyor] = useActionState<ElleSonuc, FormData>(elleRandevuAction, {});
  return (
    <form action={gonder} className="y-form">
      <div className="y-satir">
        <label>Gün<select name="tarih">{gunler.map((g) => <option key={g.tarih} value={g.tarih}>{g.baslik}</option>)}</select></label>
        <label>Saat<select name="slot">{SLOTLAR.map((s) => <option key={s.sira} value={s.sira}>{s.etiket}</option>)}</select></label>
        <label>Ad Soyad<input name="ad" required /></label>
        <label>Telefon<input name="telefon" type="tel" required /></label>
        <label>Not<input name="not" /></label>
      </div>
      {d.hata && <p className="y-hata">{d.hata}</p>}
      {d.tamam && <p className="y-tamam">{d.tamam}</p>}
      <div><button className="y-btn" disabled={bekliyor}>Randevu ekle</button></div>
    </form>
  );
}
