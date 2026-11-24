"use client";

import { useRef, useState } from "react";

// Gorsel secici (takim logosu, oyuncu fotografi): gorseli tarayicida kucultup data URL yapar.
// Logo: 128x128'e sigdirir, PNG (cok buyukse beyaz zeminli JPEG). Fotograf (kirp): 256x256 kareye ortadan kirpar, JPEG.
// Deger, satirin formuna (form={formId}) gizli alanla gider; "Kaydet" ile kaydedilir.
// PNG/JPEG secildi cunku paylasim gorselleri (Satori) WebP cizemiyor.
type Ayar = { formId: string; mevcut: string | null; alan?: string; dugme?: string; kirp?: boolean };

export default function LogoYukle({ formId, mevcut, alan = "logo", dugme = "Logo", kirp = false }: Ayar) {
  const BOY = kirp ? 256 : 128;
  const AZAMI = kirp ? 110_000 : 60_000;
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
      const o = (kirp ? Math.max : Math.min)(BOY / img.naturalWidth, BOY / img.naturalHeight);
      const w = img.naturalWidth * o, h = img.naturalHeight * o;
      x.imageSmoothingQuality = "high";
      x.drawImage(img, (BOY - w) / 2, (BOY - h) / 2, w, h);
      let d = kirp ? c.toDataURL("image/jpeg", 0.85) : c.toDataURL("image/png");
      if (kirp && d.length > AZAMI) d = c.toDataURL("image/jpeg", 0.7);
      if (!kirp && d.length > AZAMI) {
        x.globalCompositeOperation = "destination-over";
        x.fillStyle = "#FFFFFF";
        x.fillRect(0, 0, BOY, BOY);
        d = c.toDataURL("image/jpeg", 0.85);
      }
      if (d.length > AZAMI) { setHata(kirp ? "Fotoğraf işlenemedi; başka bir fotoğraf dene." : "Görsel çok karmaşık; daha sade bir logo dene."); return; }
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
      <input type="hidden" name={alan} form={formId} value={deger} />
      {onizleme ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={onizleme} alt="" width={32} height={32} style={kirp ? { borderRadius: "50%", objectFit: "cover" } : undefined} />
      ) : <span className="y-logo-bos" aria-hidden>—</span>}
      <label className="y-btn ikincil kucuk">
        {onizleme ? "Değiştir" : dugme}
        <input ref={dosya} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => sec(e.target.files?.[0])} />
      </label>
      {onizleme && <button type="button" className="y-bag kucuk" onClick={() => { setDeger("sil"); setOnizleme(null); }}>Kaldır</button>}
      {deger && <small className="y-soluk">Kaydet&apos;e bas</small>}
      {hata && <small className="y-hata">{hata}</small>}
    </span>
  );
}
