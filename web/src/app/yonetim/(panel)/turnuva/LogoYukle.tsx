"use client";

import { useRef, useState } from "react";

// Takim logosu secici: gorseli tarayicida 128x128'e sigdirip PNG data URL yapar (cok buyukse beyaz zeminli JPEG).
// Deger, takim satirinin formuna (form={formId}) gizli "logo" alaniyla gider; "Kaydet" ile kaydedilir.
// PNG/JPEG secildi cunku paylasim gorselleri (Satori) WebP cizemiyor.
const BOY = 128;
const AZAMI = 60_000;

export default function LogoYukle({ formId, mevcut }: { formId: string; mevcut: string | null }) {
  const [deger, setDeger] = useState("");
  const [onizleme, setOnizleme] = useState<string | null>(mevcut);
  const [hata, setHata] = useState("");
  const dosya = useRef<HTMLInputElement>(null);

  async function sec(f: File | undefined) {
    setHata("");
    if (!f) return;
    if (!f.type.startsWith("image/")) { setHata("Görsel dosyası seç."); return; }
    const url = URL.createObjectURL(f);
    try {
      const img = new Image();
      await new Promise<void>((ok, no) => { img.onload = () => ok(); img.onerror = () => no(new Error("yuklenemedi")); img.src = url; });
      const c = document.createElement("canvas");
      c.width = BOY; c.height = BOY;
      const x = c.getContext("2d")!;
      const o = Math.min(BOY / img.naturalWidth, BOY / img.naturalHeight);
      const w = img.naturalWidth * o, h = img.naturalHeight * o;
      x.imageSmoothingQuality = "high";
      x.drawImage(img, (BOY - w) / 2, (BOY - h) / 2, w, h);
      let d = c.toDataURL("image/png");
      if (d.length > AZAMI) {
        x.globalCompositeOperation = "destination-over";
        x.fillStyle = "#FFFFFF";
        x.fillRect(0, 0, BOY, BOY);
        d = c.toDataURL("image/jpeg", 0.85);
      }
      if (d.length > AZAMI) { setHata("Görsel çok karmaşık; daha sade bir logo dene."); return; }
      setDeger(d); setOnizleme(d);
    } catch {
      setHata("Görsel okunamadı.");
    } finally {
      URL.revokeObjectURL(url);
      if (dosya.current) dosya.current.value = "";
    }
  }

  return (
    <span className="y-logo">
      <input type="hidden" name="logo" form={formId} value={deger} />
      {onizleme ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={onizleme} alt="" width={32} height={32} />
      ) : <span className="y-logo-bos" aria-hidden>—</span>}
      <label className="y-btn ikincil kucuk">
        {onizleme ? "Değiştir" : "Logo"}
        <input ref={dosya} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => sec(e.target.files?.[0])} />
      </label>
      {onizleme && <button type="button" className="y-bag kucuk" onClick={() => { setDeger("sil"); setOnizleme(null); }}>Kaldır</button>}
      {deger && <small className="y-soluk">Kaydet&apos;e bas</small>}
      {hata && <small className="y-hata">{hata}</small>}
    </span>
  );
}
