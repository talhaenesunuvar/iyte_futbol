"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { flushSync } from "react-dom";
import TakimRozet from "../TakimRozet";
import { azaltilmis } from "@/lib/akici";
import { kuraUret, type KuraAdim, type KuraTakim } from "@/lib/kura";

// Kura animasyonu. Her adim: torba vurgulanir ve karisir -> top torbadan cikip sallanir -> acilir, takim gorunur
// -> gruplar arasinda rulet (yalniz bu torbadan henuz takim almamis gruplar) hedefte durur -> kart ucup grubun
// torba yuvasina oturur. Animasyonlar WAAPI + CSS; her calisma AbortController ile iptal edilir, efekt temizlenir.

type Props = {
  baslik: string;
  takimlar: KuraTakim[];
  harfler: string[];
  torbalar: (number | null)[];
  adimlar: KuraAdim[];
  kayitli: boolean;
  zaman: string | null;
};
type Asama = "torba" | "top" | "acil" | "rulet" | "ucus";
type Hiz = "normal" | "hizli";
type Calisma = { no: number; oyna: boolean };

// Normal hizda sureler (ms). Hizli = x0.4
const SURE = { torba: 700, top: 620, salla: 460, acil: 450, oku: 520, kilit: 480, ucus: 720, otur: 320 };
const CARPAN: Record<Hiz, number> = { normal: 1, hizli: 0.4 };
const EGRI = "cubic-bezier(.16,1,.3,1)";

const torbaAnahtar = (p: number | null) => (p === null ? "x" : String(p));
const torbaAd = (p: number | null) => (p === null ? "Torbasız" : `${p}. torba`);

// Iptal edilebilir bekleme / animasyon
class Iptal extends Error {}
function bekle(ms: number, s: AbortSignal) {
  return new Promise<void>((ok, red) => {
    if (s.aborted) return red(new Iptal());
    const t = setTimeout(() => { s.removeEventListener("abort", birak); ok(); }, ms);
    const birak = () => { clearTimeout(t); red(new Iptal()); };
    s.addEventListener("abort", birak, { once: true });
  });
}
async function oynat(el: Element | null, kare: Keyframe[], ms: number, s: AbortSignal, egri = EGRI) {
  if (s.aborted) throw new Iptal();
  if (!el || ms <= 0) return;
  const a = el.animate(kare, { duration: ms, easing: egri, fill: "none" });
  const birak = () => a.cancel();
  s.addEventListener("abort", birak, { once: true });
  try { await a.finished; } catch { /* iptal */ }
  s.removeEventListener("abort", birak);
  if (s.aborted) throw new Iptal();
}
const merkez = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
const gorunurMu = (r: DOMRect) => r.top >= 0 && r.bottom <= innerHeight;
// Kriptografik rastgele 0..n-1 (deneme kurasi)
const rastgele = (n: number) => {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return b[0] % n;
};

const tamEkranAbone = (cb: () => void) => {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
};
const bosAbone = () => () => {};

export default function KuraSahnesi({ baslik, takimlar, harfler, torbalar, adimlar, kayitli, zaman }: Props) {
  const tk = useMemo(() => new Map(takimlar.map((t) => [t.id, t])), [takimlar]);
  const [deneme, setDeneme] = useState<KuraAdim[] | null>(null);
  const sira = deneme ?? adimlar;
  const [n, setN] = useState(adimlar.length);
  const [calisma, setCalisma] = useState<Calisma>({ no: 0, oyna: false });
  const [aktif, setAktif] = useState<number | null>(null);
  const [asama, setAsama] = useState<Asama | null>(null);
  const [rulet, setRulet] = useState<{ g: string; kilit: boolean } | null>(null);
  const [yeni, setYeni] = useState<number | null>(null);
  const [hiz, setHiz] = useState<Hiz>("normal");
  const [adimModu, setAdimModu] = useState(false);
  const [duraklat, setDuraklat] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [bitti, setBitti] = useState(false);

  const sahne = useRef<HTMLElement>(null);
  const katman = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const kart = useRef<HTMLDivElement>(null);
  const hizR = useRef(1);
  const adimR = useRef(false);
  const durR = useRef(false);
  const ileriR = useRef<(() => void) | null>(null);

  useEffect(() => { hizR.current = CARPAN[hiz]; }, [hiz]);
  useEffect(() => {
    adimR.current = adimModu;
    if (!adimModu && !durR.current) ileriR.current?.();
  }, [adimModu]);
  useEffect(() => {
    durR.current = duraklat;
    if (!duraklat && !adimR.current) ileriR.current?.();
  }, [duraklat]);

  const tamEkran = useSyncExternalStore(tamEkranAbone, () => !!document.fullscreenElement, () => false);
  const tamEkranVar = useSyncExternalStore(bosAbone, () => !!document.fullscreenEnabled, () => false);

  // Oynatici: calisma.no degisince onceki iptal edilir; oyna=false ise yalniz iptal (sona atla / sifirla)
  useEffect(() => {
    if (!calisma.oyna) return;
    const ctl = new AbortController();
    const s = ctl.signal;
    const az = azaltilmis();
    const sure = (k: keyof typeof SURE) => SURE[k] * hizR.current;
    const kok = sahne.current!;

    // Adim modu ya da duraklatma: dokunma / bosluk / Devam bekler
    const kapi = () => new Promise<void>((ok, red) => {
      if (!adimR.current && !durR.current) return ok();
      setBekliyor(true);
      const birak = () => { ileriR.current = null; red(new Iptal()); };
      ileriR.current = () => { ileriR.current = null; s.removeEventListener("abort", birak); setBekliyor(false); ok(); };
      s.addEventListener("abort", birak, { once: true });
    });

    const adim = async (i: number) => {
      const a = sira[i];
      const anahtar = torbaAnahtar(a.torba);
      flushSync(() => { setAktif(i); setYeni(null); setRulet(null); setAsama("torba"); });

      if (!az) {
        // 1) Torba vurgulanir, icindeki takimlar karisir (CSS .karis)
        await bekle(sure("torba"), s);
        // 2) Top torbadan cikip isik alanina ucar, sallanir
        flushSync(() => setAsama("top"));
        const kaynak = kok.querySelector(`[data-torba="${anahtar}"]`);
        if (kaynak && top.current) {
          const k = merkez(kaynak.getBoundingClientRect()), h = merkez(top.current.getBoundingClientRect());
          const dx = k.x - h.x, dy = k.y - h.y;
          await oynat(top.current, [
            { transform: `translate(${dx}px, ${dy}px) scale(.3) rotate(-240deg)`, opacity: 0 },
            { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 90}px) scale(.85) rotate(-90deg)`, opacity: 1, offset: 0.55 },
            { transform: "none", opacity: 1 },
          ], sure("top"), s);
        }
        await oynat(top.current, [
          { transform: "rotate(0)" }, { transform: "rotate(-16deg) translateX(-4px)" }, { transform: "rotate(13deg) translateX(4px)" },
          { transform: "rotate(-9deg)" }, { transform: "rotate(6deg)" }, { transform: "rotate(0)" },
        ], sure("salla"), s, "ease-in-out");
      }

      // 3) Top acilir, takim karti gorunur
      flushSync(() => setAsama("acil"));
      if (!az) {
        await oynat(kart.current, [
          { transform: "scale(.35) rotateY(80deg)", opacity: 0, filter: "blur(8px)" },
          { transform: "scale(1.07) rotateY(0)", opacity: 1, filter: "blur(0)", offset: 0.7 },
          { transform: "none", opacity: 1 },
        ], sure("acil"), s);
      }
      await bekle(az ? 700 : sure("oku"), s);

      // 4) Grup ruleti: yalniz bu torbadan henuz takim almamis gruplar (hedef her zaman dahil)
      const dolu = new Set(sira.slice(0, i).filter((b) => b.torba === a.torba).map((b) => b.grup));
      const uygun = harfler.filter((g) => g === a.grup || !dolu.has(g));
      flushSync(() => setAsama("rulet"));
      if (!az && uygun.length > 1) {
        const hedef = uygun.indexOf(a.grup);
        const bas = rastgele(uygun.length);
        // En az ~6 adim (hizlida ~4) donsun; az aday kaldiysa birkac tur atar
        const tur = Math.max(1, Math.ceil((hizR.current < 1 ? 4 : 6) / uygun.length));
        const adet = tur * uygun.length + ((hedef - bas + uygun.length) % uygun.length) + 1;
        for (let j = 0; j < adet; j++) {
          const g = uygun[(bas + j) % uygun.length];
          flushSync(() => setRulet({ g, kilit: false }));
          // Yavaslayan rulet: 55 ms'den ~240 ms'ye
          const t = j / Math.max(1, adet - 1);
          await bekle((55 + 185 * t * t) * hizR.current, s);
        }
      }
      flushSync(() => setRulet({ g: a.grup, kilit: true }));
      await bekle(az ? 500 : sure("kilit"), s);

      // 5) Kart ucup grubun torba yuvasina oturur
      const kopya = !az && kart.current ? (kart.current.cloneNode(true) as HTMLElement) : null;
      flushSync(() => setAsama("ucus"));
      const yuva = kok.querySelector<HTMLElement>("[data-gelen]");
      if (kopya && yuva && kart.current && katman.current) {
        if (!gorunurMu(yuva.getBoundingClientRect())) {
          yuva.scrollIntoView({ block: "nearest", behavior: "smooth" });
          await bekle(480, s);
        }
        const r = kart.current.getBoundingClientRect(), y = yuva.getBoundingClientRect();
        const k = merkez(r), h = merkez(y);
        const olcek = Math.min(y.width / r.width, y.height / r.height, 1);
        Object.assign(kopya.style, { position: "fixed", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: "0" });
        katman.current.appendChild(kopya);
        try {
          await oynat(kopya, [
            { transform: "translate(0, 0) scale(1) rotate(0)", opacity: 1 },
            { transform: `translate(${(h.x - k.x) * 0.5}px, ${(h.y - k.y) * 0.5 - 70}px) scale(${(1 + olcek) / 2}) rotate(-5deg)`, opacity: 1, offset: 0.5 },
            { transform: `translate(${h.x - k.x}px, ${h.y - k.y}px) scale(${olcek}) rotate(0)`, opacity: 0.9 },
          ], sure("ucus"), s, "cubic-bezier(.45,0,.2,1)");
        } finally {
          kopya.remove();
        }
      }
      flushSync(() => { setN(i + 1); setYeni(a.takim_id); setAsama(null); setRulet(null); });
      await bekle(az ? 300 : sure("otur"), s);
    };

    (async () => {
      try {
        for (let i = 0; i < sira.length; i++) {
          await kapi();
          await adim(i);
        }
        setAktif(null);
        setBitti(true);
      } catch (e) {
        if (!(e instanceof Iptal)) throw e;
      }
    })();

    const kat = katman.current;
    return () => {
      ctl.abort();
      ileriR.current = null;
      kat?.replaceChildren();
    };
  }, [calisma, sira, harfler]);

  // Klavye: bosluk / sag ok / PageDown (sunum kumandasi) = siradaki takim; F = tam ekran
  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest("input, select, textarea, [contenteditable]")) return;
      if ([" ", "ArrowRight", "PageDown"].includes(e.key) && ileriR.current) {
        e.preventDefault();
        if (e.type === "keydown" && !e.repeat) ileriR.current();
      } else if (e.type === "keydown" && (e.key === "f" || e.key === "F") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        tamEkranDegis();
      }
    };
    addEventListener("keydown", tus);
    addEventListener("keyup", tus);
    return () => { removeEventListener("keydown", tus); removeEventListener("keyup", tus); };
  });

  function tamEkranDegis() {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else sahne.current?.requestFullscreen().catch(() => {});
  }

  function sifirla() {
    setAktif(null); setAsama(null); setRulet(null); setYeni(null); setBekliyor(false); setBitti(false); setDuraklat(false);
  }
  // Oynatma baslarken sahneyi menunun altina hizala (tam ekranda gerek yok)
  function sahneyeKaydir() {
    const el = sahne.current;
    if (!el || document.fullscreenElement) return;
    const ust = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 68;
    scrollTo({ top: el.getBoundingClientRect().top + scrollY - ust - 8, behavior: azaltilmis() ? "instant" : "smooth" });
  }
  function izle() {
    sifirla();
    sahneyeKaydir();
    setDeneme(null);
    setN(0);
    setCalisma((c) => ({ no: c.no + 1, oyna: true }));
  }
  function denemeBaslat() {
    sifirla();
    sahneyeKaydir();
    setDeneme(kuraUret(takimlar, harfler, rastgele));
    setN(0);
    setCalisma((c) => ({ no: c.no + 1, oyna: true }));
  }
  function sonaAtla() {
    sifirla();
    setN(sira.length);
    setBitti(sira.length > 0);
    setCalisma((c) => ({ no: c.no + 1, oyna: false }));
  }
  function gercegeDon() {
    sifirla();
    setDeneme(null);
    setN(adimlar.length);
    setCalisma((c) => ({ no: c.no + 1, oyna: false }));
  }
  const ileri = () => ileriR.current?.();

  const oynuyor = calisma.oyna && !bitti && (n < sira.length || aktif !== null);
  const a = aktif !== null ? sira[aktif] : null;
  const at = a ? tk.get(a.takim_id) : undefined;
  const kartGorunur = asama === "acil" || asama === "rulet" || asama === "ucus";

  // Yerlesmis takimlar (gruba gore) ve cekilmis takimlarin grubu
  const yerlesen = sira.slice(0, n);
  const cekilen = new Map(yerlesen.map((x) => [x.takim_id, x.grup]));
  const cekiliyor = a && kartGorunur ? a.takim_id : null;
  const gelen = a && asama === "ucus" ? a : null;
  const siradaki = n < sira.length ? sira[n] : null;

  const grupTakimlari = (g: string) => {
    const l = yerlesen.filter((x) => x.grup === g).map((x) => ({ x, gelen: false }));
    if (gelen && gelen.grup === g) l.push({ x: gelen, gelen: true });
    return l;
  };

  let durum: ReactNode;
  if (deneme) durum = <><b className="kr-deneme-et">Deneme kurası</b> Kaydedilmez, gerçek gruplar değildir.</>;
  else if (kayitli) durum = <>Kura çekildi{zaman ? `: ${zaman}` : ""}</>;
  else if (adimlar.length) durum = <>Gruplar panelden belirlendi; kayıtlı kura sırası yok.</>;
  else durum = <>Kura henüz çekilmedi.</>;

  return (
    <section
      ref={sahne}
      className={"kr-sahne" + (tamEkran ? " tam" : "") + (deneme ? " deneme" : "") + (bitti ? " bitti" : "")}
      aria-label="Kura çekimi"
    >
      <div className="kr-ust">
        <div className="kr-baslik">
          <h2>Kura çekimi</h2>
          <p>{tamEkran ? baslik : durum}</p>
        </div>
        <div className="kr-kontrol" role="toolbar" aria-label="Kura kontrolleri">
          {kayitli && !deneme && (
            <button type="button" className="kr-btn ana" onClick={izle}>
              <Oynat /> {oynuyor ? "Baştan izle" : "Kurayı izle"}
            </button>
          )}
          {!kayitli && (
            <button type="button" className="kr-btn ana" onClick={denemeBaslat}>
              <Oynat /> {deneme ? "Yeni deneme" : "Deneme kurası"}
            </button>
          )}
          {bekliyor && <button type="button" className="kr-btn vurgu" onClick={ileri}>Sıradaki takım ›</button>}
          {oynuyor && !adimModu && (
            <button type="button" className="kr-btn" onClick={() => setDuraklat((d) => !d)} aria-pressed={duraklat}>
              {duraklat ? "Devam" : "Duraklat"}
            </button>
          )}
          {oynuyor && <button type="button" className="kr-btn" onClick={sonaAtla}>Sona atla</button>}
          {deneme && !oynuyor && <button type="button" className="kr-btn" onClick={gercegeDon}>Deneme kurasını kapat</button>}
          <div className="kr-secim" role="group" aria-label="Hız">
            <button type="button" aria-pressed={hiz === "normal"} onClick={() => setHiz("normal")}>Normal</button>
            <button type="button" aria-pressed={hiz === "hizli"} onClick={() => setHiz("hizli")}>Hızlı</button>
          </div>
          <button type="button" className="kr-btn" aria-pressed={adimModu} onClick={() => setAdimModu((x) => !x)} title="Her takım için dokun ya da boşluk tuşuna bas">
            Adım modu
          </button>
          {tamEkranVar && (
            <button type="button" className="kr-btn ikon" onClick={tamEkranDegis} aria-pressed={tamEkran} title="Tam ekran (F)">
              <TamEkranIkon acik={tamEkran} /><span className="kr-gizli-dar">{tamEkran ? "Küçült" : "Tam ekran"}</span>
            </button>
          )}
        </div>
      </div>

      {deneme && <p className="kr-deneme-serit" role="note">DENEME KURASI · kaydedilmez · gerçek gruplar değildir</p>}

      <div className="kr-alan" onClick={() => { if (ileriR.current) ileri(); }}>
        <div className="kr-torbalar" style={{ "--torba-say": torbalar.length } as CSSProperties}>
          {torbalar.map((p) => {
            const icindekiler = takimlar.filter((t) => t.torba === p);
            const kalan = icindekiler.filter((t) => !cekilen.has(t.id) && t.id !== cekiliyor).length;
            const etkin = a !== null && a.torba === p;
            return (
              <div
                key={torbaAnahtar(p)}
                data-torba={torbaAnahtar(p)}
                className={"kr-torba" + (etkin ? " etkin" : "") + (etkin && asama === "torba" ? " karis" : "")}
              >
                <div className="kr-torba-bas">
                  <span className="kr-torba-no">{p ?? "–"}</span>
                  <span className="kr-torba-ad">{p === null ? "Torbasız" : "Torba"}</span>
                  <span className="kr-torba-say" aria-label={`${kalan} takım kaldı`}>{kalan}</span>
                </div>
                <ul>
                  {icindekiler.map((t, i) => {
                    const g = cekilen.get(t.id);
                    const durumS = g ? " cekildi" : t.id === cekiliyor ? " cekiliyor" : "";
                    return (
                      <li key={t.id} className={"kr-fis" + durumS} style={{ "--d": `${(i % 4) * 60}ms` } as CSSProperties} title={t.ad}>
                        <TakimRozet t={t} boy={20} />
                        <span className="kr-fis-ad">{t.ad}</span>
                        {g && <span className="kr-fis-grup" aria-label={`${g} grubu`}>{g}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <div className={"kr-isik" + (asama ? ` a-${asama}` : "")} aria-live="polite">
          <div className="kr-isik-sayac" aria-hidden>{n}<small>/{sira.length}</small></div>
          {asama === "top" || asama === "torba" ? (
            <div className="kr-top-kap">
              <div ref={top} className={"kr-top" + (asama === "torba" ? " bekle" : "")} aria-hidden><Top /></div>
              <p className="kr-isik-not">{a ? `${torbaAd(a.torba)} karıştırılıyor…` : ""}</p>
            </div>
          ) : kartGorunur && at && a ? (
            <div className="kr-acik">
              <div ref={kart} className="kr-kart" data-ucuyor={asama === "ucus" ? "" : undefined}>
                <TakimRozet t={at} boy={64} />
                <div className="kr-kart-y">
                  <small>{torbaAd(a.torba)}</small>
                  <b>{at.ad}</b>
                </div>
              </div>
              <div className={"kr-hedef" + (rulet?.kilit ? " kilit" : "")}>
                <span>Grup</span>
                <b key={rulet?.g ?? "?"}>{rulet?.g ?? "?"}</b>
              </div>
              <p className="kr-gizli">{rulet?.kilit ? `${at.ad}, ${rulet.g} grubuna.` : `${at.ad} çekildi.`}</p>
            </div>
          ) : bekliyor && siradaki ? (
            <div className="kr-isik-bos">
              <b>Sıradaki: {torbaAd(siradaki.torba)}</b>
              <span>Dokun ya da boşluk tuşuna bas</span>
            </div>
          ) : bitti || (n > 0 && n === sira.length) ? (
            <div className="kr-isik-bos son">
              <b>{deneme ? "Deneme kurası bitti" : kayitli ? "Kura tamamlandı" : "Gruplar belli"}</b>
              <span>{n} takım · {harfler.length} grup</span>
            </div>
          ) : (
            <div className="kr-isik-bos">
              <b>{sira.length || deneme ? "Hazır" : "Kura henüz çekilmedi"}</b>
              <span>{kayitli ? "Kurayı izle ile başlat" : "Deneme kurası rastgeledir ve kaydedilmez"}</span>
            </div>
          )}
        </div>

        <div className="kr-gruplar">
          {harfler.map((g, gi) => {
            const l = grupTakimlari(g);
            const satirlar: ReactNode[] = [];
            for (const p of torbalar) {
              const buTorba = l.filter((o) => o.x.torba === p);
              if (!buTorba.length) {
                if (p !== null) satirlar.push(<li key={`b${p}`} className="kr-yuva bos"><span>{p}</span></li>);
                continue;
              }
              for (const o of buTorba) {
                const t = tk.get(o.x.takim_id);
                satirlar.push(
                  <li
                    key={o.x.takim_id}
                    className={"kr-yuva" + (o.gelen ? " gelen" : "") + (yeni === o.x.takim_id ? " yeni" : "")}
                    data-gelen={o.gelen ? "" : undefined}
                  >
                    <TakimRozet t={t} boy={22} />
                    <span className="kr-yuva-ad">{t?.ad ?? "?"}</span>
                    <span className="kr-yuva-torba" aria-label={torbaAd(p)}>{p ?? "–"}</span>
                  </li>,
                );
              }
            }
            const durumG = rulet?.g === g ? (rulet.kilit ? " kilit" : " rulet") : "";
            return (
              <div key={g} className={"kr-grup" + durumG} style={{ "--i": gi } as CSSProperties}>
                <div className="kr-grup-bas"><b>{g}</b><span>Grubu</span></div>
                <ol>{satirlar}</ol>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ucan kart kopyalari buraya eklenir (React bu kutunun icerigini yonetmez) */}
      <div ref={katman} className="kr-ucus" aria-hidden />
    </section>
  );
}

function Oynat() {
  return <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M3 1.8v10.4L12 7z" fill="currentColor" /></svg>;
}

function TamEkranIkon({ acik }: { acik: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {acik
        ? <path d="M7 2v5H2M11 2v5h5M7 16v-5H2M11 16v-5h5" />
        : <path d="M2 7V2h5M16 7V2h-5M2 11v5h5M16 11v5h-5" />}
    </svg>
  );
}

// Futbol topu (kura topu): ortada besgen, cevresinde kose yonlerinde besgenler ve dikisler
function Top() {
  const nokta = (cx: number, cy: number, r: number, d: number) => {
    const a = (d * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  };
  const bes = (cx: number, cy: number, r: number, ilk: number) =>
    Array.from({ length: 5 }, (_, i) => nokta(cx, cy, r, ilk + i * 72).map((v) => v.toFixed(2)).join(",")).join(" ");
  const yonler = [0, 1, 2, 3, 4].map((i) => -90 + i * 72);
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <radialGradient id="kr-top-g" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".65" stopColor="#EDEEF0" />
          <stop offset="1" stopColor="#B2B5B9" />
        </radialGradient>
        <clipPath id="kr-top-c"><circle cx="50" cy="50" r="46" /></clipPath>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#kr-top-g)" />
      <g clipPath="url(#kr-top-c)" fill="#1A1A1A" stroke="#1A1A1A" strokeWidth="1.8" strokeLinejoin="round">
        <polygon points={bes(50, 50, 14, -90)} />
        {yonler.map((d) => {
          const [mx, my] = nokta(50, 50, 41, d);
          const [x1, y1] = nokta(50, 50, 14, d);
          const [x2, y2] = nokta(50, 50, 28, d);
          const [a1, b1] = nokta(mx, my, 13, d + 180 + 72);
          const [a2, b2] = nokta(50, 50, 30, d + 36);
          return (
            <g key={d}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} />
              <line x1={a1} y1={b1} x2={a2} y2={b2} />
              <polygon points={bes(mx, my, 13, d + 180)} />
            </g>
          );
        })}
      </g>
      <circle cx="50" cy="50" r="46" fill="none" stroke="#8B151A" strokeWidth="3" />
    </svg>
  );
}
