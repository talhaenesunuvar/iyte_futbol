"use server";

import { db } from "@/lib/db";
import { yetkiGerekli } from "@/lib/yetki";
import { ETIKET, ayarlarTaze } from "@/lib/ayar";
import { bitir, metin, tamsayi, telefonGecerliMi, telefonNormal } from "@/lib/islem";
import { PARTI_DURUM, SIPARIS_DURUM, fiyatlar, partiDurumGuncelle, siparisEkle } from "@/lib/forma";

export async function siparisDurumAction(f: FormData) {
  await yetkiGerekli();
  const id = tamsayi(f, "id");
  const durum = metin(f, "durum", 30);
  if (id === null || !(durum in SIPARIS_DURUM)) return;
  const sql = await db();
  const [s] = await sql<{ parti_id: number }[]>`update forma_siparis set durum = ${durum} where id = ${id} returning parti_id`;
  if (s) await partiDurumGuncelle(s.parti_id);
  bitir(ETIKET.forma);
}

export async function partiDurumAction(f: FormData) {
  await yetkiGerekli();
  const id = tamsayi(f, "id");
  const durum = metin(f, "durum", 30);
  if (id === null || !(durum in PARTI_DURUM)) return;
  const sql = await db();
  await sql`update forma_parti set durum = ${durum} where id = ${id}`;
  if (durum === "acik" || durum === "doldu") await partiDurumGuncelle(id);
  bitir(ETIKET.forma);
}

export type ElleSonuc = { hata?: string; tamam?: string };

export async function elleSiparisAction(_: ElleSonuc, f: FormData): Promise<ElleSonuc> {
  await yetkiGerekli();
  const { bedenler } = fiyatlar(await ayarlarTaze());
  const ad = metin(f, "ad", 80);
  const tel = metin(f, "telefon", 30);
  const beden = metin(f, "beden", 10);
  const arka = metin(f, "arka_isim", 40).toLocaleUpperCase("tr").slice(0, 12);
  const numara = tamsayi(f, "numara");
  const kaporaAlindi = f.get("kapora") === "on";
  const logo3d = f.get("logo3d") === "on";
  const yazi = !!arka || (numara !== null && numara >= 1 && numara <= 99);
  if (!ad) return { hata: "Ad gerekli." };
  if (!telefonGecerliMi(tel)) return { hata: "Telefon geçersiz." };
  if (!bedenler.includes(beden)) return { hata: "Beden seç." };
  const r = await siparisEkle({ ad, telefon: telefonNormal(tel), beden, arka_isim: arka, numara: numara && numara >= 1 && numara <= 99 ? numara : null, yazi, logo3d, durum: kaporaAlindi ? "kapora_alindi" : "kapora_bekliyor" });
  await partiDurumGuncelle(r.partiId);
  bitir(ETIKET.forma);
  return { tamam: `Eklendi: ${r.kod} · ${r.tutar.toLocaleString("tr-TR")} TL` };
}
