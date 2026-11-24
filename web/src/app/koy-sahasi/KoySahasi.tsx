"use client";

import { useActionState, useMemo, useState, useSyncExternalStore } from "react";
import { SLOTLAR, gectiMi, gunBaslik, gunler, slotAnahtar, type Gun, type KoyDoluluk, type RandevuSonuc } from "@/lib/koy-sahasi";
import { randevuAction } from "./islemler";
import BotTuzagi from "@/components/BotTuzagi";

const dakikaDinle = (cb: () => void) => { const t = setInterval(cb, 60_000); return () => clearInterval(t); };

// Koy Sahasi randevu sayfasi. Topluluk sitesinden ayri durur: kendi ust seridi ve altligi var, IYTE menusu yok.
// Ileride koy alt alan adinda (KOY_HOST, src/proxy.ts) dogrudan bu sayfa acilir.
export default function KoySahasi({ doluluk }: { doluluk: KoyDoluluk }) {
  // "Simdi" dakika cozunurlugunde dis depo: sunucu anlik degeri 0 (takvim yok, hidrasyon uyusmazligi olmaz)
  const dakika = useSyncExternalStore(dakikaDinle, () => Math.floor(Date.now() / 60_000), () => 0);
  const simdi = useMemo(() => (dakika ? new Date(dakika * 60_000) : null), [dakika]);
  const [gunIdx, setGunIdx] = useState(0);
  const [secim, setSecim] = useState<number | null>(null);
  const [durum, gonder, bekliyor] = useActionState<RandevuSonuc, FormData>(randevuAction, {});
  const [kapaliSon, setKapaliSon] = useState<string | null>(null);

  const dolu = useMemo(() => new Set(doluluk.dolu), [doluluk.dolu]);
  const kapali = useMemo(() => new Map(doluluk.kapali.map((k) => [k.anahtar, k.sebep])), [doluluk.kapali]);
  const gunlerL = useMemo(() => (simdi ? gunler(simdi) : []), [simdi]);
  const gun: Gun | undefined = gunlerL[gunIdx];
  const son = durum.tamam ? durum : null;
  // Basarili gonderimden sonra form kapanir (yeni sonuc gelince secim sifirlanir)
  if (son && son.kod !== kapaliSon) { setKapaliSon(son.kod); setSecim(null); }

  const gunSec = (i: number) => { setGunIdx(i); setSecim(null); };
  const slotSec = (sira: number) => setSecim((s) => (s === sira ? null : sira));

  return (
    <div className="t-koy">
      <header className="koy-ust">
        <a href="#ust" className="koy-ad">Köy Sahası</a>
        <a href="#randevu" className="koy-git">Randevu al</a>
      </header>
      <main>
        <section className="giris kap" id="ust">
          <p className="etiket">Halı saha · ücretsiz randevu</p>
          <h1>Köy Sahası</h1>
          <p className="soz">Mahallenin halı sahası. Takımını topla, saatini seç, sahaya gel. Randevu ücretsiz; haftada bir randevu alınabilir.</p>
          <div className="dugme"><a className="btn" href="#randevu">Saat seç</a></div>
        </section>

        <section className="randevu kap" id="randevu">
          <h2>Randevu al</h2>
          <p className="aciklama">Her gün 17.00–03.00 arası saat başı. Gece yarısından sonraki saatler aynı günün devamı olarak listelenir.</p>

          {!simdi || !gun ? (
            <p className="bekle" role="status">Takvim hazırlanıyor…</p>
          ) : (
            <>
              <div className="gunler" role="group" aria-label="Gün seç">
                {gunlerL.map((g, i) => (
                  <button key={g.anahtar} type="button" className={"gun" + (i === 0 ? " bugun" : "")} aria-pressed={i === gunIdx} onClick={() => gunSec(i)}>
                    <small>{i === 0 ? "Bugün" : g.kisa}</small>
                    <strong>{g.gunNo}</strong>
                    <span>{g.ayAd}</span>
                  </button>
                ))}
              </div>

              <h3 className="gun-baslik" aria-live="polite">{gunBaslik(gun)}</h3>
              <ul className="slotlar" aria-label="Saat dilimleri">
                {SLOTLAR.map((s) => {
                  const a = slotAnahtar(gun.anahtar, s.sira);
                  const benim = son && son.gun === gun.anahtar && son.slot === s.sira;
                  const gecti = gectiMi(gun, s, simdi);
                  const kapaliMi = kapali.has(a);
                  const doluMu = dolu.has(a);
                  const secili = secim === s.sira;
                  const tiklanir = !benim && !gecti && !doluMu && !kapaliMi;
                  const sinif = benim ? "benim" : gecti ? "gecmis" : doluMu || kapaliMi ? "dolu" : "bos";
                  const yazi = benim ? "Senin" : gecti ? "Geçti" : kapaliMi ? (kapali.get(a) || "Kapalı") : doluMu ? "Dolu" : secili ? "Seçildi" : "Boş";
                  return (
                    <li key={s.sira}>
                      <button
                        type="button"
                        className={`slot ${sinif}${s.gece ? " gece" : ""}`}
                        aria-pressed={tiklanir ? secili : undefined}
                        aria-disabled={!tiklanir || undefined}
                        aria-label={`${s.etiket}${s.gece ? " gece" : ""}, ${yazi}`}
                        onClick={() => tiklanir && slotSec(s.sira)}
                      >
                        <span className="saat">{s.etiket}</span>
                        <span className="durum">{yazi}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {secim !== null && (
                <form className="form" action={gonder} aria-labelledby="form-baslik">
            <BotTuzagi />
                  <h3 id="form-baslik">{gunBaslik(gun)}, {SLOTLAR[secim].etiket}</h3>
                  <input type="hidden" name="gun" value={gun.anahtar} />
                  <input type="hidden" name="slot" value={secim} />
                  <label>Ad Soyad<input name="ad" autoComplete="name" required maxLength={80} /></label>
                  <label>Telefon<input name="telefon" type="tel" inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" required maxLength={30} /></label>
                  <label>Not (isteğe bağlı)<textarea name="not" rows={2} maxLength={300} /></label>
                  {!durum.tamam && durum.hata && <p className="hata" role="alert">{durum.hata}</p>}
                  <div className="dugme">
                    <button className="btn" type="submit" disabled={bekliyor}>{bekliyor ? "Gönderiliyor…" : "Randevu al"}</button>
                    <button className="btn iki" type="button" onClick={() => setSecim(null)}>Vazgeç</button>
                  </div>
                </form>
              )}

              {son && secim === null && (
                // Onay karti telefonda ekranin altinda kalip gozden kaciyordu (Derin "olmadi sanirim" dedi); belirince ekrana getir
                <div className="ozet" role="status" ref={(el) => { el?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
                  <strong>Randevun alındı.</strong>
                  <p>{gunBaslik(gunlerL.find((g) => g.anahtar === son.gun) ?? gun)}, {SLOTLAR[son.slot].etiket} · {son.ad}</p>
                  <small>Kod: {son.kod}. Gelemeyeceksen haber ver, saat başkasına açılsın.</small>
                </div>
              )}
            </>
          )}
        </section>
      </main>
      <footer className="koy-alt">
        <strong>Köy Sahası</strong>
        <small>Randevular ücretsizdir. Telefon numaran yalnızca randevun için kullanılır.</small>
      </footer>
    </div>
  );
}
