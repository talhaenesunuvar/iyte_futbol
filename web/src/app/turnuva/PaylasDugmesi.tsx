"use client";

import { useState } from "react";

// Paylasim gorseli (PNG) uretir: telefonda paylasim menusu (Instagram, WhatsApp...), desteklenmiyorsa indirir.
export default function PaylasDugmesi({ yol, dosya, etiket = "Paylaş", sinif = "paylas" }: { yol: string; dosya: string; etiket?: string; sinif?: string }) {
  const [durum, setDurum] = useState<"" | "hazir" | "hata">("");

  async function paylas() {
    if (durum === "hazir") return;
    setDurum("hazir");
    try {
      const r = await fetch(yol, { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const blob = await r.blob();
      const file = new File([blob], `${dosya}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: dosya }); } catch { /* kullanici vazgecti */ }
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
      setDurum("");
    } catch {
      setDurum("hata");
      setTimeout(() => setDurum(""), 2500);
    }
  }

  return (
    <button type="button" className={sinif} onClick={paylas} aria-busy={durum === "hazir"} title="Paylaşım görseli (PNG)">
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
      </svg>
      <span>{durum === "hazir" ? "Hazırlanıyor…" : durum === "hata" ? "Olmadı" : etiket}</span>
    </button>
  );
}
