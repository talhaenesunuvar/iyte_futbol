"use server";

import { db } from "@/lib/db";
import { yetkiGerekli } from "@/lib/yetki";
import { ETIKET } from "@/lib/ayar";
import { bitir, metin, tamsayi, tarihMi } from "@/lib/islem";
import { OKUL_ILK, OKUL_SON } from "@/lib/okul-saha";

export type OkulSonuc = { hata?: string; tamam?: string };

export async function okulEkleAction(_: OkulSonuc, f: FormData): Promise<OkulSonuc> {
  await yetkiGerekli();
  const tarih = metin(f, "tarih", 10);
  const bas = tamsayi(f, "bas");
  const bit = tamsayi(f, "bit");
  const etiket = metin(f, "etiket", 40);
  const tekrar = Math.min(Math.max(tamsayi(f, "tekrar") ?? 1, 1), 20);
  if (!tarihMi(tarih)) return { hata: "Tarih seç." };
  if (bas === null || bit === null || bas < OKUL_ILK || bit > OKUL_SON || bit <= bas) return { hata: `Saatler ${OKUL_ILK}–${OKUL_SON} arasında olmalı, bitiş başlangıçtan sonra.` };
  const sql = await db();
  for (let i = 0; i < tekrar; i++) {
    await sql`insert into okul_dolu (tarih, bas, bit, etiket) values (${tarih}::date + ${i * 7}::int, ${bas}, ${bit}, ${etiket})`;
  }
  bitir(ETIKET.okul);
  return { tamam: tekrar > 1 ? `${tekrar} hafta eklendi.` : "Eklendi." };
}

export async function okulSilAction(f: FormData) {
  await yetkiGerekli();
  const id = tamsayi(f, "id");
  if (id === null) return;
  const sql = await db();
  await sql`delete from okul_dolu where id = ${id}`;
  bitir(ETIKET.okul);
}
