"use server";

import { db } from "@/lib/db";
import { yetkiGerekli } from "@/lib/yetki";
import { ETIKET } from "@/lib/ayar";
import { bitir, metin, tamsayi, tarihMi, telefonGecerliMi, telefonNormal } from "@/lib/islem";
import { randevuKaydet } from "@/lib/koy-veri";
import { SLOTLAR } from "@/lib/koy-sahasi";

export async function iptalAction(f: FormData) {
  await yetkiGerekli();
  const id = tamsayi(f, "id");
  if (id === null) return;
  const sql = await db();
  await sql`update koy_randevu set durum = 'iptal' where id = ${id}`;
  bitir(ETIKET.koy);
}

export async function kapatAction(f: FormData) {
  await yetkiGerekli();
  const tarih = metin(f, "tarih", 10);
  const sebep = metin(f, "sebep", 60);
  const tumGun = f.get("slot") === "hepsi";
  const slot = tamsayi(f, "slot");
  if (!tarihMi(tarih)) return;
  const slotlar = tumGun ? SLOTLAR.map((s) => s.sira) : slot !== null && slot >= 0 && slot < SLOTLAR.length ? [slot] : [];
  const sql = await db();
  for (const s of slotlar) {
    await sql`insert into koy_kapali (tarih, slot, sebep) values (${tarih}, ${s}, ${sebep}) on conflict (tarih, slot) do update set sebep = excluded.sebep`;
  }
  bitir(ETIKET.koy);
}

export async function acAction(f: FormData) {
  await yetkiGerekli();
  const tarih = metin(f, "tarih", 10);
  const slot = tamsayi(f, "slot");
  if (!tarihMi(tarih) || slot === null) return;
  const sql = await db();
  await sql`delete from koy_kapali where tarih = ${tarih} and slot = ${slot}`;
  bitir(ETIKET.koy);
}

export type ElleSonuc = { hata?: string; tamam?: string };

export async function elleRandevuAction(_: ElleSonuc, f: FormData): Promise<ElleSonuc> {
  await yetkiGerekli();
  const tel = metin(f, "telefon", 30);
  const ad = metin(f, "ad", 80);
  if (!ad) return { hata: "Ad gerekli." };
  if (!telefonGecerliMi(tel)) return { hata: "Telefon geçersiz." };
  const r = await randevuKaydet({ tarih: metin(f, "tarih", 10), slot: tamsayi(f, "slot") ?? -1, ad, telefon: telefonNormal(tel), notu: metin(f, "not", 300) }, true);
  if ("hata" in r) return r;
  bitir(ETIKET.koy);
  return { tamam: `Randevu eklendi: ${r.kod}` };
}
