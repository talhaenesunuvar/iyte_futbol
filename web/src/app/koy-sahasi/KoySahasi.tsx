"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import UstMenu from "@/components/UstMenu";
import AltKisim from "@/components/AltKisim";
import { WHATSAPP } from "@/lib/ortak";
import { SLOTLAR, doluSlotlar, gectiMi, gunBaslik, gunler, randevuAl, telefonGecerli, type Gun } from "@/lib/koy-sahasi";

type Benim = { gun: string; sira: number; ad: string; kod: string; baslik: string; saat: string };

const dakikaDinle = (cb: () => void) => { const t = setInterval(cb, 60_000); return () => clearInterval(t); };

export default function KoySahasi() {
  // "Simdi" dakika cozunurlugunde dis depo: sunucu anlik degeri 0 (takvim yok, hidrasyon uyusmazligi olmaz),
  // istemcide dakikada bir yenilenir; gecmis slotlar kendiliginden pasiflesir.
  const dakika = useSyncExternalStore(dakikaDinle, () => Math.floor(Date.now() / 60_000), () => 0);
  const simdi = useMemo(() => (dakika ? new Date(dakika * 60_000) : null), [dakika]);
  const [gunIdx, setGunIdx] = useState(0);
  const [secim, setSecim] = useState<number | null>(null);
  const [ad, setAd] = useState("");
  const [tel, setTel] = useState("");
  const [not, setNot] = useState("");
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState("");
  const [benim, setBenim] = useState<Benim[]>([]);
  const [son, setSon] = useState<Benim | null>(null);

  const gunlerL = useMemo(() => (simdi ? gunler(simdi) : []), [simdi]);
  const gun: Gun | undefined = gunlerL[gunIdx];
  const dolu = useMemo(() => (gun ? doluSlotlar(gun) : new Set<number>()), [gun]);
  const benimMi = (g: Gun, sira: number) => benim.find((b) => b.gun === g.anahtar && b.sira === sira);

  const gunSec = (i: number) => { setGunIdx(i); setSecim(null); setHata(""); };
  const slotSec = (sira: number) => { setSecim((s) => (s === sira ? null : sira)); setHata(""); setSon(null); };

  async function gonder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!gun || secim === null || bekliyor) return;
    if (!ad.trim()) { setHata("Ad soyad gerekli."); return; }
    if (!telefonGecerli(tel)) { setHata("Telefon numarası eksik görünüyor."); return; }
    setBekliyor(true); setHata("");
    const r = await randevuAl({ gun: gun.anahtar, slot: secim, ad: ad.trim(), telefon: tel.trim(), not: not.trim() || undefined });
    setBekliyor(false);
    if (!r.tamam) { setHata(r.hata); return; }
    const kayit: Benim = { gun: gun.anahtar, sira: secim, ad: ad.trim(), kod: r.kod, baslik: gunBaslik(gun), saat: SLOTLAR[secim].etiket };
    setBenim((b) => [...b, kayit]); setSon(kayit);
    setSecim(null); setAd(""); setTel(""); setNot("");
  }

  return (
    <div className="t-koy">
      <UstMenu />
      <main>
        <section className="giris kap" id="ust">
          <p className="etiket">Halı saha</p>
          <h1>Köy Sahası</h1>
          <p className="soz">Mahallenin yeni halı sahası. Takımını topla, saatini seç, sahaya gel. Randevunu buradan alıyorsun.</p>
          <div className="dugme">
            <a className="btn" href="#randevu">Saat seç</a>
            <a className="btn iki" href={WHATSAPP} target="_blank" rel="noopener noreferrer">Bize ulaş</a>
          </div>
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
                  const b = benimMi(gun, s.sira);
                  const gecti = gectiMi(gun, s, simdi);
                  const doluMu = dolu.has(s.sira);
                  const secili = secim === s.sira;
                  const tiklanir = !b && !gecti && !doluMu;
                  const sinif = b ? "benim" : gecti ? "gecmis" : doluMu ? "dolu" : "bos";
                  const durum = b ? "Senin" : gecti ? "Geçti" : doluMu ? "Dolu" : secili ? "Seçildi" : "Boş";
                  return (
                    <li key={s.sira}>
                      <button
                        type="button"
                        className={`slot ${sinif}${s.gece ? " gece" : ""}`}
                        aria-pressed={tiklanir ? secili : undefined}
                        aria-disabled={!tiklanir || undefined}
                        aria-label={`${s.etiket}${s.gece ? " gece" : ""}, ${durum}`}
                        onClick={() => tiklanir && slotSec(s.sira)}
                      >
                        <span className="saat">{s.etiket}</span>
                        <span className="durum">{durum}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {secim !== null && (
                <form className="form" onSubmit={gonder} aria-labelledby="form-baslik" noValidate>
                  <h3 id="form-baslik">{gunBaslik(gun)}, {SLOTLAR[secim].etiket}</h3>
                  <label>Ad Soyad<input name="ad" autoComplete="name" value={ad} onChange={(e) => setAd(e.target.value)} required /></label>
                  <label>Telefon<input name="telefon" type="tel" inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" value={tel} onChange={(e) => setTel(e.target.value)} required /></label>
                  <label>Not (isteğe bağlı)<textarea name="not" rows={2} value={not} onChange={(e) => setNot(e.target.value)} /></label>
                  {hata && <p className="hata" role="alert">{hata}</p>}
                  <div className="dugme">
                    <button className="btn" type="submit" disabled={bekliyor}>{bekliyor ? "Gönderiliyor…" : "Randevu al"}</button>
                    <button className="btn iki" type="button" onClick={() => setSecim(null)}>Vazgeç</button>
                  </div>
                </form>
              )}

              {son && (
                <div className="ozet" role="status">
                  <strong>Randevun alındı.</strong>
                  <p>{son.baslik}, {son.saat} · {son.ad}</p>
                  <small>Kod: {son.kod}</small>
                </div>
              )}

              <p className="ornek">Doluluk örnek veridir; randevular henüz kaydedilmiyor.</p>
            </>
          )}
        </section>
      </main>
      <AltKisim />
    </div>
  );
}
