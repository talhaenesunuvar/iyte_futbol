// Turnuva saf hesaplari: puan durumu, gol kralligi, eleme agaci, kazanan, tarih bicimi.
// Veritabanina dokunmaz; hem sayfalar hem panel hem tohum kullanir.

export type Durum = "basvuru" | "grup" | "eleme" | "bitti";
export type Asama = "grup" | "son16" | "ceyrek" | "yari" | "final";

export type Turnuva = {
  id: number; ad: string; sezon: string; durum: Durum; aciklama: string; kurallar: string;
  kontenjan: number; basvuru_acik: boolean; aktif: boolean; ornek: boolean;
};
export type Takim = { id: number; ad: string; grup: string | null; torba: number | null };
export type Mac = {
  id: number; asama: Asama; grup: string | null; sira: number;
  ev_id: number | null; dep_id: number | null; zaman: string | null; saha: string;
  ev_gol: number | null; dep_gol: number | null; ev_pen: number | null; dep_pen: number | null;
};
export type Gol = { id: number; mac_id: number; takim_id: number; oyuncu: string; dakika: number | null };

export const DURUM_AD: Record<Durum, string> = { basvuru: "Başvurular", grup: "Grup aşaması", eleme: "Eleme turları", bitti: "Tamamlandı" };
export const ASAMA_AD: Record<Asama, string> = { grup: "Grup maçları", son16: "Son 16", ceyrek: "Çeyrek final", yari: "Yarı final", final: "Final" };
export const ELEME: Asama[] = ["son16", "ceyrek", "yari", "final"];
export const ELEME_BOY: Record<string, number> = { son16: 8, ceyrek: 4, yari: 2, final: 1 };
export const DURUMLAR: Durum[] = ["basvuru", "grup", "eleme", "bitti"];
export const GRUP_HARF = "ABCDEFGHIJKLMNOP".split("");

export const oynandi = (m: Pick<Mac, "ev_gol" | "dep_gol">) => m.ev_gol !== null && m.dep_gol !== null;

// Kazanan takim id'si; berabere ise penaltiya bakar, karar yoksa null
export function kazanan(m: Mac): number | null {
  if (!oynandi(m) || m.ev_id === null || m.dep_id === null) return null;
  if (m.ev_gol! > m.dep_gol!) return m.ev_id;
  if (m.dep_gol! > m.ev_gol!) return m.dep_id;
  if (m.ev_pen !== null && m.dep_pen !== null && m.ev_pen !== m.dep_pen) return m.ev_pen > m.dep_pen ? m.ev_id : m.dep_id;
  return null;
}

export const sonrakiAsama = (a: Asama): Asama | null => {
  const i = ELEME.indexOf(a);
  return i >= 0 && i < ELEME.length - 1 ? ELEME[i + 1] : null;
};
// sira n -> sonraki turda ceil(n/2); tek ise ev, cift ise deplasman
export const sonrakiYer = (sira: number) => ({ sira: Math.ceil(sira / 2), taraf: sira % 2 === 1 ? ("ev" as const) : ("dep" as const) });

export type PuanSatiri = { takim: Takim; O: number; G: number; B: number; M: number; AG: number; YG: number; AV: number; P: number };

export function puanDurumu(takimlar: Takim[], maclar: Mac[]): Map<string, PuanSatiri[]> {
  const satir = new Map<number, PuanSatiri>();
  for (const t of takimlar) if (t.grup) satir.set(t.id, { takim: t, O: 0, G: 0, B: 0, M: 0, AG: 0, YG: 0, AV: 0, P: 0 });
  for (const m of maclar) {
    if (m.asama !== "grup" || !oynandi(m) || m.ev_id === null || m.dep_id === null) continue;
    const e = satir.get(m.ev_id), d = satir.get(m.dep_id);
    if (!e || !d) continue;
    const eg = m.ev_gol!, dg = m.dep_gol!;
    e.O++; d.O++; e.AG += eg; e.YG += dg; d.AG += dg; d.YG += eg;
    if (eg > dg) { e.G++; d.M++; e.P += 3; } else if (dg > eg) { d.G++; e.M++; d.P += 3; } else { e.B++; d.B++; e.P++; d.P++; }
  }
  const gruplar = new Map<string, PuanSatiri[]>();
  for (const s of satir.values()) {
    s.AV = s.AG - s.YG;
    const g = s.takim.grup!;
    if (!gruplar.has(g)) gruplar.set(g, []);
    gruplar.get(g)!.push(s);
  }
  for (const l of gruplar.values()) l.sort((a, b) => b.P - a.P || b.AV - a.AV || b.AG - a.AG || a.takim.ad.localeCompare(b.takim.ad, "tr"));
  return new Map([...gruplar.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export type GolKrali = { oyuncu: string; takim: string; gol: number };
export function golKralligi(goller: Gol[], takimlar: Takim[]): GolKrali[] {
  const ad = new Map(takimlar.map((t) => [t.id, t.ad]));
  const say = new Map<string, GolKrali>();
  for (const g of goller) {
    const k = `${g.takim_id}|${g.oyuncu.toLocaleLowerCase("tr")}`;
    const v = say.get(k) ?? { oyuncu: g.oyuncu, takim: ad.get(g.takim_id) ?? "", gol: 0 };
    v.gol++;
    say.set(k, v);
  }
  return [...say.values()].sort((a, b) => b.gol - a.gol || a.oyuncu.localeCompare(b.oyuncu, "tr"));
}

// Grup siralamasindan eleme eslesmesi: ilk yari g[2k]1 - g[2k+1]2, ikinci yari g[2k+1]1 - g[2k]2
// (8 grupta: A1-B2, C1-D2, E1-F2, G1-H2, B1-A2, D1-C2, F1-E2, H1-G2)
export function elemeEslesme(puan: Map<string, PuanSatiri[]>): { asama: Asama; ciftler: [number, number][] } | { hata: string } {
  const g = [...puan.keys()];
  const asama = ({ 8: "son16", 4: "ceyrek", 2: "yari", 1: "final" } as Record<number, Asama>)[g.length];
  if (!asama) return { hata: "Eleme ağacı için 1, 2, 4 ya da 8 grup gerekli." };
  for (const h of g) if ((puan.get(h)?.length ?? 0) < 2) return { hata: `${h} grubunda en az 2 takım olmalı.` };
  const bir = (h: string) => puan.get(h)![0].takim.id, iki = (h: string) => puan.get(h)![1].takim.id;
  if (g.length === 1) return { asama, ciftler: [[bir(g[0]), iki(g[0])]] };
  const ilk: [number, number][] = [], son: [number, number][] = [];
  for (let k = 0; k < g.length / 2; k++) {
    ilk.push([bir(g[2 * k]), iki(g[2 * k + 1])]);
    son.push([bir(g[2 * k + 1]), iki(g[2 * k])]);
  }
  return { asama, ciftler: [...ilk, ...son] };
}

// Grup ici tek devre: 4 takimda 6 mac
export function grupFiksturu(ids: number[]): [number, number][] {
  const c: [number, number][] = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) c.push((i + j) % 2 ? [ids[i], ids[j]] : [ids[j], ids[i]]);
  return c;
}

// Turkiye sabit UTC+3
const FARK = 3 * 3_600_000;
const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const AY_K = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const iki = (n: number) => String(n).padStart(2, "0");

export function tarihYaz(iso: string | null, kisa = false) {
  if (!iso) return "Tarih yok";
  const d = new Date(new Date(iso).getTime() + FARK);
  const saat = `${iki(d.getUTCHours())}.${iki(d.getUTCMinutes())}`;
  return kisa ? `${d.getUTCDate()} ${AY_K[d.getUTCMonth()]} · ${saat}` : `${d.getUTCDate()} ${AY[d.getUTCMonth()]} ${GUN[d.getUTCDay()]} · ${saat}`;
}
// datetime-local <-> ISO (Istanbul)
export function yerelDeger(iso: string | null) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + FARK);
  return `${d.getUTCFullYear()}-${iki(d.getUTCMonth() + 1)}-${iki(d.getUTCDate())}T${iki(d.getUTCHours())}:${iki(d.getUTCMinutes())}`;
}
export function yereldenIso(s: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - FARK;
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

// Okul e-postasi: son @'tan sonrasi tam eslesme
export const OKUL_ALANLARI = new Set(["std.iyte.edu.tr", "iyte.edu.tr"]);
export function okulEpostasiMi(e: string) {
  const i = e.lastIndexOf("@");
  if (i < 1) return false;
  const yerel = e.slice(0, i), alan = e.slice(i + 1).toLowerCase();
  return OKUL_ALANLARI.has(alan) && /^[A-Za-z0-9._%+-]+$/.test(yerel);
}
