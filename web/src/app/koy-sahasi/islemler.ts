"use server";

import { ETIKET } from "@/lib/ayar";
import { bitir, metin, tamsayi, telefonGecerliMi, telefonNormal } from "@/lib/islem";
import { randevuKaydet } from "@/lib/koy-veri";
import { COK_ISTEK, botMu, istemciIp, sinirAsildi } from "@/lib/sinir";
import type { RandevuSonuc } from "@/lib/koy-sahasi";

export async function randevuAction(_: RandevuSonuc, f: FormData): Promise<RandevuSonuc> {
  const tarih = metin(f, "gun", 10);
  const slot = tamsayi(f, "slot") ?? -1;
  const ad = metin(f, "ad", 80);
  const tel = metin(f, "telefon", 30);
  const notu = metin(f, "not", 300);
  if (ad.length < 2) return { hata: "Ad soyad gerekli." };
  if (!telefonGecerliMi(tel)) return { hata: "Telefon numarası 05xx xxx xx xx biçiminde olmalı." };
  if (botMu(f)) return { hata: "Randevu gönderilemedi." };
  if (await sinirAsildi("randevu", 20, 60)) return { hata: COK_ISTEK };
  const r = await randevuKaydet({ tarih, slot, ad, telefon: telefonNormal(tel), notu, ip: await istemciIp() });
  if ("hata" in r) return r;
  bitir(ETIKET.koy);
  return { tamam: true, kod: r.kod, gun: tarih, slot, ad };
}
