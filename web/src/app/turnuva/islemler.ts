"use server";

import { db } from "@/lib/db";
import { metin, telefonGecerliMi, telefonNormal } from "@/lib/islem";
import { okulEpostasiMi } from "@/lib/turnuva-hesap";

export type BasvuruDurum = { hata?: string; tamam?: boolean; takim?: string };

// Herkese acik takim basvurusu. Yalnizca basvurusu acik vitrin turnuvasina yazar.
export async function basvuruAction(_: BasvuruDurum, f: FormData): Promise<BasvuruDurum> {
  const takim = metin(f, "takim", 60);
  const kaptan = metin(f, "kaptan", 80);
  const telefon = metin(f, "telefon", 30);
  const eposta = metin(f, "eposta", 120).toLowerCase();
  const oyuncular = metin(f, "oyuncular", 2000);
  if (takim.length < 2) return { hata: "Takım adı gerekli." };
  if (kaptan.length < 3) return { hata: "Kaptanın adı soyadı gerekli." };
  if (!telefonGecerliMi(telefon)) return { hata: "Telefon numarası 05xx xxx xx xx biçiminde olmalı." };
  if (!okulEpostasiMi(eposta)) return { hata: "Okul e-postası gerekli (@std.iyte.edu.tr ya da @iyte.edu.tr)." };

  const sql = await db();
  const [t] = await sql<{ id: number; basvuru_acik: boolean }[]>`select id, basvuru_acik from turnuva order by aktif desc, olusturma desc, id desc limit 1`;
  if (!t || !t.basvuru_acik) return { hata: "Başvurular şu an kapalı." };
  const [ayni] = await sql<{ n: number }[]>`
    select count(*)::int as n from basvuru
    where turnuva_id = ${t.id} and durum <> 'reddedildi' and (eposta = ${eposta} or lower(takim_ad) = lower(${takim}))`;
  if (ayni.n > 0) return { hata: "Bu e-posta ya da takım adıyla zaten bir başvuru var." };
  const [{ n: toplam }] = await sql<{ n: number }[]>`select count(*)::int as n from basvuru where turnuva_id = ${t.id} and olusturma > now() - interval '1 hour'`;
  if (toplam > 60) return { hata: "Şu an çok fazla başvuru geliyor, biraz sonra tekrar dene." };

  await sql`insert into basvuru (turnuva_id, takim_ad, kaptan, telefon, eposta, oyuncular)
    values (${t.id}, ${takim}, ${kaptan}, ${telefonNormal(telefon)}, ${eposta}, ${oyuncular})`;
  return { tamam: true, takim };
}
