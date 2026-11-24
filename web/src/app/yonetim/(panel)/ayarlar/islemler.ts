"use server";

import { db } from "@/lib/db";
import { yetkiGerekli } from "@/lib/yetki";
import { bitir, metin } from "@/lib/islem";
import { ETIKET } from "@/lib/ayar";
import { VARSAYILAN_AYAR } from "@/lib/tohum";

export type AyarSonuc = { hata?: string; tamam?: boolean };

const SAYISAL = new Set(["forma_fiyat", "forma_kapora", "forma_hedef"]);

export async function ayarKaydet(_: AyarSonuc, f: FormData): Promise<AyarSonuc> {
  await yetkiGerekli();
  const yeni: [string, string][] = [];
  for (const k of Object.keys(VARSAYILAN_AYAR)) {
    if (!f.has(k)) continue;
    let v = metin(f, k, 600);
    if (SAYISAL.has(k)) {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) return { hata: "Fiyat, kapora ve kişi sayısı tam sayı olmalı." };
    }
    if (k === "iban") v = v.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
    if (k === "iban" && v && !/^TR\d{2}( ?\d{4}){5} ?\d{2}$/.test(v)) return { hata: "IBAN TR ile başlayan 26 karakter olmalı." };
    if ((k === "okul_randevu_url" || k === "koy_url") && v && !/^(https:\/\/|\/(?!\/))/.test(v)) return { hata: "Linkler https:// ya da / ile başlamalı." };
    yeni.push([k, v]);
  }
  if (Number(f.get("forma_kapora")) > Number(f.get("forma_fiyat"))) return { hata: "Kapora fiyattan büyük olamaz." };
  const sql = await db();
  for (const [k, v] of yeni) {
    await sql`insert into ayar (anahtar, deger) values (${k}, ${v}) on conflict (anahtar) do update set deger = excluded.deger`;
  }
  bitir(ETIKET.ayar, ETIKET.forma, ETIKET.okul, ETIKET.koy);
  return { tamam: true };
}
