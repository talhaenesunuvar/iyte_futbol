"use client";

import { useActionState, useState } from "react";
import { EPOSTA, ILETISIM } from "@/lib/ortak";
import { siparisAction, type SiparisSonuc } from "./islemler";
import BotTuzagi from "@/components/BotTuzagi";

const GOVDE = "M62 14 L84 6 Q100 20 116 6 L138 14 L188 44 L170 84 L150 74 L150 208 Q100 216 50 208 L50 74 L30 84 L12 44 Z";

// Forma cizimi: on yuz rozetli, arka yuz isim + numara. Fotograf gelene kadar lansman gorseli.
function Forma({ yuz, isim, numara }: { yuz: "on" | "arka"; isim: string; numara: string }) {
  return (
    <svg viewBox="0 0 200 222" role="img" aria-label={yuz === "on" ? "Formanın önü" : `Formanın arkası: ${isim || "isim"} ${numara || ""}`}>
      <path d={GOVDE} fill="#8B151A" stroke="#1A1A1A" strokeWidth="2" strokeLinejoin="round" />
      <path d="M150 74 L150 208 M50 74 L50 208" stroke="#B2B5B9" strokeWidth="5" opacity=".55" />
      <path d="M12 44 L30 84 M188 44 L170 84" stroke="#FFFFFF" strokeWidth="4" />
      {yuz === "on" ? (
        <>
          <path d="M84 6 Q100 30 116 6" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
          <image href="/img/logo-rozet.webp" x="112" y="46" width="28" height="28" />
          <text x="100" y="140" textAnchor="middle" fill="#FFFFFF" style={{ fontFamily: "var(--font-barlow-c), sans-serif" }} fontStyle="italic" fontWeight="800" fontSize="19" letterSpacing="0.5">İYTE FUTBOL</text>
        </>
      ) : (
        <>
          <path d="M84 6 Q100 14 116 6" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
          <text x="100" y="62" textAnchor="middle" fill="#FFFFFF" style={{ fontFamily: "var(--font-barlow-c), sans-serif" }} fontWeight="800" fontSize={isim.length > 9 ? 15 : 19} letterSpacing="1.5">{isim || "İSMİN"}</text>
          <text x="100" y="148" textAnchor="middle" fill="#FFFFFF" style={{ fontFamily: "var(--font-barlow-c), sans-serif" }} fontWeight="800" fontSize="78">{numara || "10"}</text>
        </>
      )}
    </svg>
  );
}

export default function FormaIstemci({ bedenler, kapora }: { bedenler: string[]; kapora: number }) {
  const [durum, gonder, bekliyor] = useActionState<SiparisSonuc, FormData>(siparisAction, {});
  const [isim, setIsim] = useState("");
  const [numara, setNumara] = useState("");
  const [kopya, setKopya] = useState("");
  const arka = isim.toLocaleUpperCase("tr").replace(/[^A-ZÇĞİÖŞÜ .'-]/g, "").slice(0, 12);

  const kopyala = async (s: string, ne: string) => {
    try { await navigator.clipboard.writeText(s); setKopya(ne); setTimeout(() => setKopya(""), 1800); } catch { /* izin yok */ }
  };

  return (
    <>
      <section className="s-bolum kap lansman" aria-label="Forma önizleme">
        <figure><Forma yuz="on" isim={arka} numara={numara} /><figcaption>Ön</figcaption></figure>
        <figure><Forma yuz="arka" isim={arka} numara={numara} /><figcaption>Arka · senin ismin</figcaption></figure>
      </section>

      <section className="s-bolum kap" id="siparis" aria-labelledby="siparis-b">
        <h2 id="siparis-b" className="s-h2">Sipariş ver</h2>
        {durum.tamam ? (
          <div className="s-ozet" role="status">
            <strong>Siparişin alındı.</strong>
            <p>Sipariş kodun: <b className="kod">{durum.kod}</b> <button type="button" className="kopya" onClick={() => kopyala(durum.kod, "kod")}>{kopya === "kod" ? "Kopyalandı" : "Kopyala"}</button></p>
            {durum.iban ? (
              <>
                <p>{durum.kapora.toLocaleString("tr-TR")} TL kaporayı aşağıdaki IBAN&apos;a gönder, açıklamaya kodunu yaz.</p>
                <p className="iban">{durum.iban} <button type="button" className="kopya" onClick={() => kopyala(durum.iban.replace(/\s/g, ""), "iban")}>{kopya === "iban" ? "Kopyalandı" : "IBAN'ı kopyala"}</button></p>
                {durum.alici && <small>Alıcı: {durum.alici}</small>}
              </>
            ) : (
              <p>IBAN bilgisi kısa süre içinde paylaşılacak; kodunu sakla. Sorun olursa sipariş kodunla birlikte <a href={ILETISIM}>{EPOSTA}</a> adresine yaz.</p>
            )}
            <small>Kapora ulaşınca siparişin onaylanır ve parti sayacına eklenir.</small>
          </div>
        ) : (
          <form action={gonder} className="s-form">
            <BotTuzagi />
            <label>Ad Soyad<input name="ad" autoComplete="name" required maxLength={80} /></label>
            <label>Telefon<input name="telefon" type="tel" inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" required maxLength={30} /></label>
            <div className="s-yan">
              <label>Beden
                <select name="beden" required defaultValue="">
                  <option value="" disabled>Seç</option>
                  {bedenler.map((b) => <option key={b}>{b}</option>)}
                </select>
              </label>
              <label>Numara<input name="numara" type="number" min={1} max={99} inputMode="numeric" value={numara} onChange={(e) => setNumara(e.target.value.slice(0, 2))} /></label>
            </div>
            <label>Forma arkasındaki isim (en çok 12 harf)<input name="arka_isim" value={arka} onChange={(e) => setIsim(e.target.value)} maxLength={12} autoCapitalize="characters" /></label>
            {durum.hata && <p className="s-hata" role="alert">{durum.hata}</p>}
            <div className="s-dugme">
              <button className="btn" type="submit" disabled={bekliyor}>{bekliyor ? "Gönderiliyor…" : `Sipariş ver · ${kapora.toLocaleString("tr-TR")} TL kapora`}</button>
            </div>
            <small className="ornek">Telefonun yalnızca parti dolunca sana ulaşmak için kullanılır, sitede gösterilmez.</small>
          </form>
        )}
      </section>
    </>
  );
}
