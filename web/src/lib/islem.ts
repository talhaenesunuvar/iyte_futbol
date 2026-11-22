import "server-only";
import { refresh, updateTag } from "next/cache";

// Server action sonunda: ilgili herkese acik onbellekleri dusur ve paneli yenile.
// Yalnizca server action icinden cagrilir (updateTag/refresh baska yerde calismaz).
export function bitir(...etiketler: string[]) {
  for (const e of etiketler) updateTag(e);
  refresh();
}

// FormData okuma yardimcilari
export const metin = (f: FormData, k: string, azami = 500) => String(f.get(k) ?? "").trim().slice(0, azami);
export const tamsayi = (f: FormData, k: string): number | null => {
  const s = String(f.get(k) ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : null;
};
export const tarihMi = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

// Telefonu rakamlara indirger: "0555 123 45 67" -> "5551234567" (basa 0/90 atilir)
export function telefonNormal(t: string) {
  let r = t.replace(/\D/g, "");
  if (r.startsWith("90") && r.length === 12) r = r.slice(2);
  if (r.startsWith("0") && r.length === 11) r = r.slice(1);
  return r;
}
export const telefonGecerliMi = (t: string) => /^5\d{9}$/.test(telefonNormal(t));
// wa.me icin uluslararasi bicim
export const waNumara = (t: string) => "90" + telefonNormal(t);

// Insan tarafindan okunur kisa kod (karisan harfler yok)
export function kisaKod(on: string) {
  const H = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const b = new Uint8Array(5);
  crypto.getRandomValues(b);
  return `${on}-${Array.from(b, (x) => H[x % H.length]).join("")}`;
}
