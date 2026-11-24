"use client";

import { useActionState } from "react";
import { basvuruAction } from "./islemler";
import BotTuzagi from "@/components/BotTuzagi";

export default function BasvuruFormu() {
  const [d, gonder, bekliyor] = useActionState(basvuruAction, {});
  if (d.tamam) {
    return (
      <div className="s-ozet" role="status">
        <strong>Başvurun alındı.</strong>
        <p>{d.takim} için başvurunu inceleyip kaptana dönüş yapacağız.</p>
      </div>
    );
  }
  return (
    <form action={gonder} className="s-form" noValidate>
            <BotTuzagi />
      <h3>Takım başvurusu</h3>
      <label>Takım adı<input name="takim" maxLength={60} required /></label>
      <div className="s-yan">
        <label>Kaptan ad soyad<input name="kaptan" autoComplete="name" maxLength={80} required /></label>
        <label>Telefon<input name="telefon" type="tel" inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" required /></label>
      </div>
      <label>Okul e-postası<input name="eposta" type="email" autoComplete="email" placeholder="ad.soyad@std.iyte.edu.tr" required /></label>
      <label>Oyuncu listesi (her satıra bir oyuncu)<textarea name="oyuncular" rows={6} maxLength={2000} /></label>
      {d.hata && <p className="s-hata" role="alert">{d.hata}</p>}
      <div className="s-dugme">
        <button className="btn" type="submit" disabled={bekliyor}>{bekliyor ? "Gönderiliyor…" : "Başvur"}</button>
      </div>
    </form>
  );
}
