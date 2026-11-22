"use server";

import { db } from "@/lib/db";
import { yetkiGerekli } from "@/lib/yetki";
import { bitir, metin, tamsayi, tarihMi } from "@/lib/islem";
import { ETIKET } from "@/lib/ayar";

function oku(f: FormData) {
  const e = { tarih: metin(f, "tarih", 10), saat: metin(f, "saat", 10), ad: metin(f, "ad", 80), tur: metin(f, "tur", 40), yer: metin(f, "yer", 80) };
  if (!tarihMi(e.tarih) || !e.ad) return null;
  return e;
}

export async function etkinlikEkle(f: FormData) {
  await yetkiGerekli();
  const e = oku(f);
  if (!e) return;
  const sql = await db();
  await sql`insert into etkinlik (tarih, saat, ad, tur, yer) values (${e.tarih}, ${e.saat}, ${e.ad}, ${e.tur}, ${e.yer})`;
  bitir(ETIKET.etkinlik);
}

export async function etkinlikGuncelle(f: FormData) {
  await yetkiGerekli();
  const id = tamsayi(f, "id");
  const e = oku(f);
  if (id === null || !e) return;
  const sql = await db();
  // Duzenlenen ornek kayit artik gercek icerik sayilir
  await sql`update etkinlik set tarih = ${e.tarih}, saat = ${e.saat}, ad = ${e.ad}, tur = ${e.tur}, yer = ${e.yer}, ornek = false where id = ${id}`;
  bitir(ETIKET.etkinlik);
}

export async function etkinlikSil(f: FormData) {
  await yetkiGerekli();
  const id = tamsayi(f, "id");
  if (id === null) return;
  const sql = await db();
  await sql`delete from etkinlik where id = ${id}`;
  bitir(ETIKET.etkinlik);
}
