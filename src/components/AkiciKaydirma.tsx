"use client";

import { useEffect } from "react";
import { azaltilmis } from "@/lib/akici";

// Sayfa ici (#...) baglantilara tiklaninca sayfayi yumusakca kaydirir.
// Mesafeye gore 450-1100 ms, yavas baslayip yavas biten egri. Kullanici tekerlek ya da
// dokunmayla araya girerse animasyon hemen birakilir. Hareket azaltma acikken aninda gider.
const egri = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);

export default function AkiciKaydirma() {
  useEffect(() => {
    let kare = 0;
    const birak = () => cancelAnimationFrame(kare);

    const kaydir = (hedef: number) => {
      birak();
      const bas = scrollY;
      const fark = Math.min(Math.max(hedef, 0), document.documentElement.scrollHeight - innerHeight) - bas;
      if (Math.abs(fark) < 2) return;
      if (azaltilmis()) { scrollTo({ top: bas + fark, behavior: "instant" }); return; }
      const sure = Math.min(1100, 450 + Math.abs(fark) * 0.25);
      const t0 = performance.now();
      const adim = (simdi: number) => {
        const t = Math.min(1, (simdi - t0) / sure);
        scrollTo({ top: bas + fark * egri(t), behavior: "instant" });
        if (t < 1) kare = requestAnimationFrame(adim);
      };
      kare = requestAnimationFrame(adim);
    };

    const tik = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a[href^='#']");
      if (!a) return;
      const h = a.getAttribute("href")!;
      const el = h.length > 1 ? document.getElementById(decodeURIComponent(h.slice(1))) : null;
      if (h.length > 1 && !el) return;
      e.preventDefault();
      const ustBosluk = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      kaydir(el ? el.getBoundingClientRect().top + scrollY - ustBosluk : 0);
      history.replaceState(null, "", h.length > 1 ? h : location.pathname + location.search);
    };

    document.addEventListener("click", tik);
    addEventListener("wheel", birak, { passive: true });
    addEventListener("touchstart", birak, { passive: true });
    addEventListener("keydown", birak);
    return () => {
      birak();
      document.removeEventListener("click", tik);
      removeEventListener("wheel", birak);
      removeEventListener("touchstart", birak);
      removeEventListener("keydown", birak);
    };
  }, []);

  return null;
}
