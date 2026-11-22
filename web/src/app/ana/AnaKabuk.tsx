"use client";

import { useEffect, useRef } from "react";
import { azaltilmis } from "@/lib/akici";
import { beliren, sinir } from "@/lib/ortak";

// Ana sayfa istemci katmani: icerik sunucuda render edilir, burada yalnizca efektler baglanir.
// 1) .r ogeleri gorununce belirir  2) Hakkimizda sozu kaydirdikca kelime kelime koyulasir
// 3) Masaustunde imlec saha cizgisini ve kartali hafifce kaydirir (paralaks). Hepsi hareket azaltmaya uyar.
export default function AnaKabuk({ children }: { children: React.ReactNode }) {
  const kok = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const k = kok.current!;
    const azalt = azaltilmis();
    const belirenBitir = beliren(k, azalt);

    const sozler = Array.from(k.querySelectorAll<HTMLElement>(".soz b"));
    const soz = k.querySelector<HTMLElement>(".soz");
    const sah = k.querySelector<HTMLElement>(".h-sah");
    const toplam = 0.5 + 0.1 * Math.max(0, sozler.length - 1);
    let kare = 0;
    const guncelle = () => {
      kare = 0;
      if (!soz) return;
      const vh = innerHeight, r = soz.getBoundingClientRect();
      const p = sinir((0.85 * vh - r.top) / (0.4 * vh + r.height), 0, 1);
      sozler.forEach((b, i) => { b.style.opacity = String(0.16 + 0.84 * sinir((p * toplam - 0.1 * i) / 0.5, 0, 1)); });
    };
    const iste = () => { if (!kare) kare = requestAnimationFrame(guncelle); };

    // Paralaks: hedefe yumusak yaklasan iki deger; yalnizca imlec hareket ederken kare ister
    let px = 0, py = 0, hx = 0, hy = 0, pkare = 0;
    const adim = () => {
      px += (hx - px) * 0.08; py += (hy - py) * 0.08;
      sah?.style.setProperty("--px", px.toFixed(4)); sah?.style.setProperty("--py", py.toFixed(4));
      pkare = Math.abs(hx - px) + Math.abs(hy - py) > 0.0005 ? requestAnimationFrame(adim) : 0;
    };
    const imlec = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      hx = e.clientX / innerWidth - 0.5; hy = e.clientY / innerHeight - 0.5;
      if (!pkare) pkare = requestAnimationFrame(adim);
    };

    if (azalt) {
      sozler.forEach((b) => (b.style.opacity = "1"));
    } else {
      guncelle();
      addEventListener("scroll", iste, { passive: true });
      addEventListener("resize", iste);
      sah?.addEventListener("pointermove", imlec);
    }
    // Giris animasyonu: sinif eklenince CSS gecisleri baslar (JS yoksa icerik zaten gorunur)
    requestAnimationFrame(() => k.classList.add("acildi"));

    return () => {
      belirenBitir();
      cancelAnimationFrame(kare); cancelAnimationFrame(pkare);
      removeEventListener("scroll", iste); removeEventListener("resize", iste);
      sah?.removeEventListener("pointermove", imlec);
    };
  }, []);

  return <div className="t-ana" ref={kok}>{children}</div>;
}
