"use client";

import { useActionState, useState } from "react";
import { EPOSTA, ILETISIM } from "@/lib/ortak";
import { siparisAction, type SiparisSonuc } from "./islemler";
import BotTuzagi from "@/components/BotTuzagi";

const GOVDE = "M62 14 L84 6 Q100 20 116 6 L138 14 L188 44 L170 84 L150 74 L150 208 Q100 216 50 208 L50 74 L30 84 L12 44 Z";
const TL = (n: number) => `${n.toLocaleString("tr-TR")} TL`;

// Forma cizimi: on yuz rozetli (3D logo seciliyse kabartmali buyuk rozet), arka yuz isim + numara (yazi seciliyse).
// Fotograf gelene kadar lansman gorseli.
function Forma({ yuz, isim, numara, yazi, logo3d }: { yuz: "on" | "arka"; isim: string; numara: string; yazi: boolean; logo3d: boolean }) {
  const etiket = yuz === "on" ? `Formanın önü${logo3d ? ", 3D logo" : ""}` : yazi ? `Formanın arkası: ${isim || "isim"} ${numara || ""}` : "Formanın arkası, yazısız";
  return (
    <svg viewBox="0 0 200 222" role="img" aria-label={etiket}>
      <defs>
        <filter id="fm-kabart" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.6" stdDeviation="1.2" floodColor="#000" floodOpacity=".55" />
          <feDropShadow dx="0" dy="-.8" stdDeviation=".5" floodColor="#fff" floodOpacity=".45" />
        </filter>
      </defs>
      <path d={GOVDE} fill="#8B151A" stroke="#1A1A1A" strokeWidth="2" strokeLinejoin="round" />
      <path d="M150 74 L150 208 M50 74 L50 208" stroke="#B2B5B9" strokeWidth="5" opacity=".55" />
      <path d="M12 44 L30 84 M188 44 L170 84" stroke="#FFFFFF" strokeWidth="4" />
      {yuz === "on" ? (
        <>
          <path d="M84 6 Q100 30 116 6" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
          {logo3d
            ? <image href="/img/logo-rozet.webp" x="106" y="40" width="38" height="38" filter="url(#fm-kabart)" />
            : <image href="/img/logo-rozet.webp" x="112" y="46" width="28" height="28" />}
          <text x="100" y="140" textAnchor="middle" fill="#FFFFFF" style={{ fontFamily: "var(--font-barlow-c), sans-serif" }} fontStyle="italic" fontWeight="800" fontSize="19" letterSpacing="0.5">İYTE FUTBOL</text>
        </>
      ) : (
        <>
          <path d="M84 6 Q100 14 116 6" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
          {yazi && (
            <>
              <text x="100" y="62" textAnchor="middle" fill="#FFFFFF" style={{ fontFamily: "var(--font-barlow-c), sans-serif" }} fontWeight="800" fontSize={isim.length > 9 ? 15 : 19} letterSpacing="1.5">{isim || "İSMİN"}</text>
              <text x="100" y="148" textAnchor="middle" fill="#FFFFFF" style={{ fontFamily: "var(--font-barlow-c), sans-serif" }} fontWeight="800" fontSize="78">{numara || "10"}</text>
            </>
          )}
        </>
      )}
    </svg>
  );
}

type Props = { bedenler: string[]; fiyat: number; kapora: number; yaziUcret: number; logo3dUcret: number };

export default function FormaIstemci({ bedenler, fiyat, kapora, yaziUcret, logo3dUcret }: Props) {
  const [durum, gonder, bekliyor] = useActionState<SiparisSonuc, FormData>(siparisAction, {});
  const [isim, setIsim] = useState("");
  const [numara, setNumara] = useState("");
  const [beden, setBeden] = useState("");
  const [yazi, setYazi] = useState(true);
  const [logo3d, setLogo3d] = useState(false);
  const [yuz, setYuz] = useState<"on" | "arka">("arka");
  const [kopya, setKopya] = useState("");
  const arka = isim.toLocaleUpperCase("tr").replace(/[^A-ZÇĞİÖŞÜ .'-]/g, "").slice(0, 12);
  const toplam = fiyat + (yazi ? yaziUcret : 0) + (logo3d ? logo3dUcret : 0);

  const kopyala = async (s: string, ne: string) => {
    try { await navigator.clipboard.writeText(s); setKopya(ne); setTimeout(() => setKopya(""), 1800); } catch { /* izin yok */ }
  };

  return (
    <section className="s-bolum kap" id="siparis" aria-labelledby="siparis-b">
      <h2 id="siparis-b" className="s-h2">Formanı hazırla</h2>
      <div className="fm-duzen">
        <div className="fm-onizleme">
          <figure className="fm-sahne">
            <Forma yuz={yuz} isim={arka} numara={numara} yazi={yazi} logo3d={logo3d} />
          </figure>
          <div className="fm-yuz" role="group" aria-label="Önizleme yüzü">
            <button type="button" aria-pressed={yuz === "on"} onClick={() => setYuz("on")}>Ön</button>
            <button type="button" aria-pressed={yuz === "arka"} onClick={() => setYuz("arka")}>Arka</button>
          </div>
        </div>

        {durum.tamam ? (
          <div className="s-ozet fm-sonuc" role="status">
            <strong>Siparişin alındı.</strong>
            <p>Sipariş kodun: <b className="kod">{durum.kod}</b> <button type="button" className="kopya" onClick={() => kopyala(durum.kod, "kod")}>{kopya === "kod" ? "Kopyalandı" : "Kopyala"}</button></p>
            <p>Toplam {TL(durum.tutar)}; şimdi {TL(durum.kapora)} kapora, kalan {TL(Math.max(0, durum.tutar - durum.kapora))} parti dolunca.</p>
            {durum.iban ? (
              <>
                <p>{TL(durum.kapora)} kaporayı aşağıdaki IBAN&apos;a gönder, açıklamaya kodunu yaz.</p>
                <p className="iban">{durum.iban} <button type="button" className="kopya" onClick={() => kopyala(durum.iban.replace(/\s/g, ""), "iban")}>{kopya === "iban" ? "Kopyalandı" : "IBAN'ı kopyala"}</button></p>
                {durum.alici && <small>Alıcı: {durum.alici}</small>}
              </>
            ) : (
              <p>IBAN bilgisi kısa süre içinde paylaşılacak; kodunu sakla. Sorun olursa sipariş kodunla birlikte <a href={ILETISIM}>{EPOSTA}</a> adresine yaz.</p>
            )}
            <small>Kapora ulaşınca siparişin onaylanır ve parti sayacına eklenir.</small>
          </div>
        ) : (
          <form action={gonder} className="s-form fm-form">
            <BotTuzagi />
            <fieldset className="fm-beden">
              <legend>Beden</legend>
              <div>
                {bedenler.map((b) => (
                  <label key={b} className={beden === b ? "secili" : ""}>
                    <input type="radio" name="beden" value={b} required checked={beden === b} onChange={() => setBeden(b)} />
                    <span>{b}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="fm-secenek">
              <label className={"fm-kart" + (yazi ? " acik" : "")}>
                <input type="checkbox" name="yazi" checked={yazi} onChange={(e) => { setYazi(e.target.checked); setYuz("arka"); }} />
                <span className="fm-kart-y"><b>Arkaya isim ve numara</b><small>İstemezsen arka düz kalır</small></span>
                <span className="fm-ucret">+{TL(yaziUcret)}</span>
              </label>
              {yazi && (
                <div className="s-yan fm-yazi">
                  <label>İsim (en çok 12 harf)<input name="arka_isim" value={arka} onChange={(e) => { setIsim(e.target.value); setYuz("arka"); }} maxLength={12} autoCapitalize="characters" /></label>
                  <label>Numara<input name="numara" type="number" min={1} max={99} inputMode="numeric" value={numara} onChange={(e) => { setNumara(e.target.value.slice(0, 2)); setYuz("arka"); }} /></label>
                </div>
              )}
              <label className={"fm-kart" + (logo3d ? " acik" : "")}>
                <input type="checkbox" name="logo3d" checked={logo3d} onChange={(e) => { setLogo3d(e.target.checked); setYuz("on"); }} />
                <span className="fm-kart-y"><b>3D logo</b><small>Göğüste kabartmalı rozet</small></span>
                <span className="fm-ucret">+{TL(logo3dUcret)}</span>
              </label>
            </div>

            <label>Ad Soyad<input name="ad" autoComplete="name" required maxLength={80} /></label>
            <label>Telefon<input name="telefon" type="tel" inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" required maxLength={30} /></label>

            <dl className="fm-hesap" aria-live="polite">
              <div><dt>Forma</dt><dd>{TL(fiyat)}</dd></div>
              {yazi && <div><dt>İsim ve numara</dt><dd>+{TL(yaziUcret)}</dd></div>}
              {logo3d && <div><dt>3D logo</dt><dd>+{TL(logo3dUcret)}</dd></div>}
              <div className="fm-top"><dt>Toplam</dt><dd>{TL(toplam)}</dd></div>
              <div className="fm-alt"><dt>Şimdi kapora</dt><dd>{TL(kapora)}</dd></div>
              <div className="fm-alt"><dt>Parti dolunca</dt><dd>{TL(Math.max(0, toplam - kapora))}</dd></div>
            </dl>

            {durum.hata && <p className="s-hata" role="alert">{durum.hata}</p>}
            <div className="s-dugme">
              <button className="btn" type="submit" disabled={bekliyor}>{bekliyor ? "Gönderiliyor…" : `Sipariş ver · ${TL(kapora)} kapora`}</button>
            </div>
            <small className="ornek">Telefonun yalnızca parti dolunca sana ulaşmak için kullanılır, sitede gösterilmez.</small>
          </form>
        )}
      </div>
    </section>
  );
}
