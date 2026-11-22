"use client";

import { useActionState } from "react";
import { girisAction } from "../islemler";

export default function GirisFormu() {
  const [durum, gonder, bekliyor] = useActionState(girisAction, {});
  return (
    <form action={gonder} className="y-form">
      <label>
        Şifre
        <input name="sifre" type="password" autoComplete="current-password" required autoFocus />
      </label>
      {durum.hata && <p className="y-hata" role="alert">{durum.hata}</p>}
      <button className="y-btn" type="submit" disabled={bekliyor}>{bekliyor ? "Kontrol ediliyor…" : "Giriş yap"}</button>
    </form>
  );
}
