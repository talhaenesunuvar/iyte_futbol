import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";
import { ETIKET } from "./ayar";

export type Etkinlik = { id: number; tarih: string; saat: string; ad: string; tur: string; yer: string; ornek: boolean };

const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

// "2026-11-28" -> { gun: "28", ay: "Kasım", hafta: "Cumartesi" } (saat dilimsiz, takvim gunu olarak)
export function tarihParca(t: string) {
  const [y, m, d] = t.split("-").map(Number);
  return { gun: String(d), ay: AY[m - 1], hafta: GUN[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] };
}

// Istanbul'a gore bugun ve sonrasi
export async function yaklasanEtkinlikler(adet = 6): Promise<Etkinlik[]> {
  "use cache";
  cacheTag(ETIKET.etkinlik);
  cacheLife("minutes");
  const sql = await db();
  return sql<Etkinlik[]>`
    select id, tarih, saat, ad, tur, yer, ornek from etkinlik
    where tarih >= (now() at time zone 'Europe/Istanbul')::date
    order by tarih, saat limit ${adet}`;
}

export async function tumEtkinlikler(): Promise<Etkinlik[]> {
  const sql = await db();
  return sql<Etkinlik[]>`select id, tarih, saat, ad, tur, yer, ornek from etkinlik order by tarih desc, saat desc limit 200`;
}
