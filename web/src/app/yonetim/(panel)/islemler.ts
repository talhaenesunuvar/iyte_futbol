"use server";

import { db } from "@/lib/db";
import { yetkiGerekli } from "@/lib/yetki";
import { bitir } from "@/lib/islem";
import { ETIKET } from "@/lib/ayar";

export async function ornekSilAction() {
  await yetkiGerekli();
  const sql = await db();
  await sql`delete from etkinlik where ornek`;
  await sql`delete from turnuva where ornek`;
  await sql`delete from forma_siparis where ornek`;
  // Saha tablolarinda ornek sutunu yok; tohum/saha.ts'nin isaretleri ile silinir
  await sql`delete from koy_randevu where kod like 'KS-ORNK%'`;
  await sql`delete from okul_dolu where etiket = 'Örnek rezervasyon'`;
  // Ornek siparisler silinince bos kalan partiler de gitsin
  await sql`delete from forma_parti p where not exists (select 1 from forma_siparis s where s.parti_id = p.id)`;
  bitir(ETIKET.etkinlik, ETIKET.turnuva, ETIKET.forma, ETIKET.koy, ETIKET.okul);
}
