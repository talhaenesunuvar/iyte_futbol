"use client";

import { useActionState } from "react";
import type { Ayarlar } from "@/lib/ayar";
import { ayarKaydet, type AyarSonuc } from "./islemler";

export default function AyarFormu({ a }: { a: Ayarlar }) {
  const [d, gonder, bekliyor] = useActionState<AyarSonuc, FormData>(ayarKaydet, {});
  return (
    <form action={gonder} className="y-form">
      <section className="y-kart">
        <h2>Forma ön siparişi</h2>
        <div className="y-satir">
          <label>Forma fiyatı (TL)<input name="forma_fiyat" type="number" min={0} defaultValue={a.forma_fiyat} required /></label>
          <label>Kapora (TL)<input name="forma_kapora" type="number" min={0} defaultValue={a.forma_kapora} required /></label>
          <label>Parti kişi sayısı<input name="forma_hedef" type="number" min={1} max={100} defaultValue={a.forma_hedef} required /></label>
        </div>
        <div className="y-satir">
          <label>Arkaya isim + numara (TL)<input name="forma_yazi_ucret" type="number" min={0} defaultValue={a.forma_yazi_ucret} required /></label>
          <label>3D logo (TL)<input name="forma_logo3d_ucret" type="number" min={0} defaultValue={a.forma_logo3d_ucret} required /></label>
        </div>
        <label>Bedenler (virgülle)<input name="forma_bedenler" defaultValue={a.forma_bedenler} /></label>
        <div className="y-satir">
          <label>IBAN<input name="iban" defaultValue={a.iban} placeholder="TR00 0000 0000 0000 0000 0000 00" autoComplete="off" /></label>
          <label>Alıcı adı<input name="iban_alici" defaultValue={a.iban_alici} /></label>
        </div>
        <p className="y-soluk">IBAN boşken sitede &quot;IBAN bilgisi kısa süre içinde paylaşılacak&quot; yazar.</p>
      </section>

      <section className="y-kart">
        <h2>WhatsApp grupları</h2>
        <label>Ana sayfadaki grup düğmeleri (her satır: Ad | davet linki)
          <textarea name="whatsapp_gruplar" rows={3} defaultValue={a.whatsapp_gruplar} placeholder={"Duyuru grubu | https://chat.whatsapp.com/...\nHalı saha grubu | https://chat.whatsapp.com/..."} />
        </label>
        <p className="y-soluk">Boşsa ana sayfada WhatsApp düğmesi görünmez. Yalnız chat.whatsapp.com davet linkleri kabul edilir.</p>
      </section>

      <section className="y-kart">
        <h2>Sahalar</h2>
        <label>Okul sahası randevu adresi<input name="okul_randevu_url" type="url" defaultValue={a.okul_randevu_url} /></label>
        <label>Okul sahası açıklaması<textarea name="okul_saha_bilgi" rows={2} defaultValue={a.okul_saha_bilgi} /></label>
        <label>Köy Sahası adresi (link)<input name="koy_url" defaultValue={a.koy_url} placeholder="/koy-sahasi ya da https://koy.iytefutbol.com" /></label>
        <label>Köy Sahası açık adresi<input name="koy_adres" defaultValue={a.koy_adres} /></label>
      </section>

      <div className="y-dugmeler">
        <button className="y-btn" type="submit" disabled={bekliyor}>{bekliyor ? "Kaydediliyor…" : "Kaydet"}</button>
        {d.hata && <span className="y-hata" role="alert">{d.hata}</span>}
        {d.tamam && !bekliyor && <span className="y-tamam" role="status">Kaydedildi.</span>}
      </div>
    </form>
  );
}
