import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";
import { ETIKET } from "./ayar";

// Okul sahasi dolulugu: okulun sistemi veri vermedigi icin yonetim elle girer (okul_dolu).
// Herkese acik okuma: Istanbul bugunu + 6 gun. Saatler 8..24 (bit dahil degil: 19-21 = iki saat).
export const OKUL_ILK = 8;
export const OKUL_SON = 24;

export type OkulDolu = { tarih: string; bas: number; bit: number; etiket: string };
export type OkulHafta = { gunler: string[]; dolu: OkulDolu[] };

export async function okulDoluluk(): Promise<OkulHafta> {
  "use cache";
  cacheTag(ETIKET.okul);
  cacheLife("minutes");
  const sql = await db();
  const gunler = await sql<{ tarih: string }[]>`
    select g::date as tarih from generate_series((now() at time zone 'Europe/Istanbul')::date, (now() at time zone 'Europe/Istanbul')::date + 6, interval '1 day') g`;
  const dolu = await sql<OkulDolu[]>`
    select tarih, bas, bit, etiket from okul_dolu
    where tarih between ${gunler[0].tarih} and ${gunler[6].tarih} order by tarih, bas`;
  return { gunler: gunler.map((g) => g.tarih), dolu: [...dolu] };
}

const GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const GUN_KISA = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

// "YYYY-MM-DD" -> gosterim (saf hesap; "simdi" kullanmaz)
export function gunEtiket(t: string) {
  const d = new Date(t + "T12:00:00Z");
  return { ad: GUN[d.getUTCDay()], kisa: GUN_KISA[d.getUTCDay()], no: d.getUTCDate(), ay: AY[d.getUTCMonth()], uzun: `${d.getUTCDate()} ${AY[d.getUTCMonth()]} ${GUN[d.getUTCDay()]}` };
}
