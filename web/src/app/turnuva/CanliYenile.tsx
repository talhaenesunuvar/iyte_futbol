"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Canli mac varken sayfayi 20 sn'de bir tazeler (yalnizca sekme gorunurken). Canli mac yoksa hic render edilmez.
export default function CanliYenile({ saniye = 20 }: { saniye?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, saniye * 1000);
    const gorunur = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", gorunur);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", gorunur); };
  }, [router, saniye]);
  return null;
}
