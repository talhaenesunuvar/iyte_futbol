"use client";

import { useEffect, useRef } from "react";
import UstMenu from "@/components/UstMenu";
import AltKisim from "@/components/AltKisim";
import { Yay, azaltilmis } from "@/lib/akici";
import { OLAYLAR, WHATSAPP, beliren, sinir } from "@/lib/ortak";
import { agKur } from "./ag";

const SOZ = "Oynamak isteyen de izlemek isteyen de aynı sahada buluşuyor.".split(" ");

export default function KaleAgi() {
  const kok = useRef<HTMLDivElement>(null);
  const ag = useRef<HTMLCanvasElement>(null);
  const ag2 = useRef<HTMLCanvasElement>(null);
  const tutamak = useRef<HTMLButtonElement>(null);
  const uzeri = useRef<HTMLDivElement>(null);
  const h1 = useRef<HTMLHeadingElement>(null);
  const gol = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const azalt = azaltilmis();
    let n = 0;
    // Baslik sutun gucuyle yaylanir, gol sayaci her golde ziplar
    const hY = new Yay(0, { response: 0.5, damping: 0.55, eps: 0.2, on: (y) => { h1.current!.style.transform = `translateY(${y}px)`; } });
    const sY = new Yay(1, { response: 0.34, damping: 0.7, eps: 0.003, on: (k) => { gol.current!.style.transform = `scale(${k})`; } });
    const A = agKur(ag.current!, {
      ink: "#1A1A1A", a: 0.32, direk: "#B2B5B9", oto: true, tut: true, ortu: uzeri.current, tutamak: tutamak.current,
      vur(g, kul) {
        hY.hedef(0, 120 + g * 220);
        if (kul) { gol.current!.textContent = String(++n); sY.hedef(1, 5); }
      },
    });
    const B = agKur(ag2.current!, { ink: "#FFFFFF", a: 0.28, mur: "#1A1A1A" });
    const ilk = azalt ? undefined : setTimeout(() => A.firlat(0.56, 0.4), 800);
    const belirenBitir = beliren(kok.current!, azalt);

    // Kaydirmaya bagli iki gecis: sozun kelimeleri sirayla koyulasir, rozet buyuyerek belirir.
    // Tek pasif scroll dinleyicisi; kaydirma yokken hicbir sey calismaz (GSAP ScrollTrigger
    // sayfadan cikinca da 60 fps donuyordu).
    const k = kok.current!;
    const sozler = Array.from(k.querySelectorAll<HTMLElement>(".soz b"));
    const soz = k.querySelector<HTMLElement>(".soz")!, biz = k.querySelector<HTMLElement>(".biz")!, rozet = k.querySelector<HTMLElement>(".biz img")!;
    const toplam = 0.5 + 0.1 * (sozler.length - 1);
    let kare = 0;
    const guncelle = () => {
      kare = 0;
      const vh = innerHeight, rs = soz.getBoundingClientRect(), rb = biz.getBoundingClientRect();
      // soz: ustu %78'e gelince baslar, alti %45'e gelince biter. rozet: ustu %80 -> %30.
      const ps = sinir((0.78 * vh - rs.top) / (0.33 * vh + rs.height), 0, 1);
      const pb = sinir((0.8 * vh - rb.top) / (0.5 * vh), 0, 1);
      sozler.forEach((b, i) => { b.style.opacity = String(0.14 + 0.86 * sinir((ps * toplam - 0.1 * i) / 0.5, 0, 1)); });
      rozet.style.transform = `scale(${0.82 + 0.18 * pb})`; rozet.style.opacity = String(0.4 + 0.6 * pb);
    };
    const iste = () => { if (!kare) kare = requestAnimationFrame(guncelle); };
    if (azalt) {
      sozler.forEach((b) => (b.style.opacity = "1")); rozet.style.transform = "none"; rozet.style.opacity = "1";
    } else {
      guncelle();
      addEventListener("scroll", iste, { passive: true }); addEventListener("resize", iste);
    }

    return () => {
      clearTimeout(ilk);
      hY.kes(0); sY.kes(1);
      A.yokEt(); B.yokEt();
      belirenBitir();
      cancelAnimationFrame(kare);
      removeEventListener("scroll", iste); removeEventListener("resize", iste);
    };
  }, []);

  return (
    <div className="t-kale" ref={kok}>
      <UstMenu />
      <main>
        <section className="sah" id="ust">
          <canvas ref={ag} role="img" aria-label="Kale ağı. Dokununca şut çekilir." />
          <button ref={tutamak} className="tutamak" type="button" aria-label="Topu ağa fırlat" />
          <div className="sayac" aria-live="polite" aria-atomic="true"><span ref={gol} className="gol">0</span><small>gol</small></div>
          <div className="sah-m">
            <h1 ref={h1} aria-label="İYTE Futbol"><span>İYTE</span>{" "}<span>FUTBOL</span></h1>
            <div className="alt-s">
              <p>Kampüsün futbol topluluğu. Topu tut, ağa fırlat.</p>
              <div className="dugme"><a className="btn" href="#etkinlikler">Etkinliklere bak</a><a className="btn iki" href={WHATSAPP} target="_blank" rel="noopener noreferrer">Bize ulaş</a></div>
            </div>
          </div>
        </section>
        <div className="uzeri" ref={uzeri}>
          <section className="biz kap" id="hakkimizda">
            <h2 className="soz">{SOZ.map((k, i) => <span key={i}><b>{k}</b>{i < SOZ.length - 1 ? " " : ""}</span>)}</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo-rozet.webp" alt="İYTE Futbol rozeti" width={684} height={684} />
          </section>
          <section className="etk kap" id="etkinlikler">
            <h2>Yaklaşan etkinlikler</h2>
            <ol>
              {OLAYLAR.map((e, i) => (
                <li key={e.ad} className="r" style={{ "--g": `${i * 0.08}s` } as React.CSSProperties}>
                  <span className="t">{e.gun}<small>{e.ay}</small></span>
                  <div><h3>{e.ad}</h3><p>{e.tur}, {e.yer}, {e.saat}</p></div>
                </li>
              ))}
            </ol>
            <p className="ornek">Etkinlikler örnek içeriktir.</p>
          </section>
        </div>
        <section className="son" id="iletisim">
          <canvas ref={ag2} aria-hidden="true" />
          <div className="kap"><h2>Sıradaki şut senin.</h2><a className="btn ters" href={WHATSAPP} target="_blank" rel="noopener noreferrer">Bize ulaş</a></div>
        </section>
      </main>
      <AltKisim />
    </div>
  );
}
