"use server";

import { ETIKET, ayarlarTaze } from "@/lib/ayar";
import { fiyatlar, siparisEkle } from "@/lib/forma";
import { bitir, metin, tamsayi, telefonGecerliMi, telefonNormal } from "@/lib/islem";
import { COK_ISTEK, botMu, sinirAsildi } from "@/lib/sinir";

export type SiparisSonuc =
  | { tamam?: undefined; hata?: string }
  | { tamam: true; kod: string; kapora: number; tutar: number; iban: string; alici: string };

export async function siparisAction(_: SiparisSonuc, f: FormData): Promise<SiparisSonuc> {
  if (botMu(f)) return { hata: "Sipariş gönderilemedi." };
  if (await sinirAsildi("siparis", 30, 60)) return { hata: COK_ISTEK };
  const a = await ayarlarTaze();
  const { kapora, bedenler } = fiyatlar(a);
  const ad = metin(f, "ad", 80);
  const tel = metin(f, "telefon", 30);
  const beden = metin(f, "beden", 10);
  const arka = metin(f, "arka_isim", 40).toLocaleUpperCase("tr").replace(/[^A-ZÇĞİÖŞÜ .'-]/g, "").slice(0, 12).trim();
  const numara = tamsayi(f, "numara");
  // Opsiyonlar (Derin, 2026-11-27): arkaya isim + numara ucretli ve istege bagli; 3D logo istege bagli
  const yazi = f.get("yazi") === "on";
  const logo3d = f.get("logo3d") === "on";
  if (ad.length < 3 || !ad.includes(" ")) return { hata: "Ad ve soyadını yaz." };
  if (!telefonGecerliMi(tel)) return { hata: "Telefon numarası 05xx xxx xx xx biçiminde olmalı." };
  if (!bedenler.includes(beden)) return { hata: "Beden seç." };
  if (yazi && String(f.get("numara") ?? "").trim() !== "" && (numara === null || numara < 1 || numara > 99)) return { hata: "Numara 1 ile 99 arasında olmalı." };
  if (yazi && !arka && numara === null) return { hata: "Arkaya yazılacak ismi ya da numarayı yaz (istemiyorsan seçeneği kapat)." };
  const { kod, tutar } = await siparisEkle({ ad, telefon: telefonNormal(tel), beden, arka_isim: arka, numara, yazi, logo3d });
  bitir(ETIKET.forma);
  return { tamam: true, kod, kapora, tutar, iban: a.iban, alici: a.iban_alici };
}
