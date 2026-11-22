import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";
import { VARSAYILAN_AYAR } from "./tohum";

// Site ayarlari (IBAN, forma fiyati, okul sahasi linki...). Panelden degisir; degisince updateTag(ETIKET.ayar).
export type Ayarlar = typeof VARSAYILAN_AYAR;

// Onbellek etiketleri: veri okuyan "use cache" fonksiyonlari bunlari verir, yazan action'lar updateTag ile dusurur.
export const ETIKET = {
  ayar: "ayar",
  etkinlik: "etkinlik",
  turnuva: "turnuva",
  forma: "forma",
  koy: "koy",
  okul: "okul",
} as const;

export async function ayarlar(): Promise<Ayarlar> {
  "use cache";
  cacheTag(ETIKET.ayar);
  cacheLife("minutes");
  return ayarlarTaze();
}

// Onbelleksiz okuma (panel ve server action'lar icin)
export async function ayarlarTaze(): Promise<Ayarlar> {
  const sql = await db();
  const satir = await sql<{ anahtar: string; deger: string }[]>`select anahtar, deger from ayar`;
  const a = { ...VARSAYILAN_AYAR };
  for (const s of satir) if (s.anahtar in a) a[s.anahtar] = s.deger;
  return a;
}

export const sayi = (s: string, yedek: number) => (Number.isFinite(Number(s)) && s.trim() !== "" ? Number(s) : yedek);
