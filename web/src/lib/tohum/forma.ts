import "server-only";
import type postgres from "postgres";

// Ornek parti: hedef 5, 3 siparis (2 kapora alindi, 1 bekliyor). ornek = true, panelden silinir.
export async function tohumForma(sql: postgres.Sql) {
  const [p] = await sql<{ id: number }[]>`insert into forma_parti (hedef) values (5) returning id`;
  const liste = [
    { ad: "Mert Kaya", telefon: "5550000001", beden: "M", arka: "MERT", no: 7, kod: "F-ORNK1", durum: "kapora_alindi" },
    { ad: "Ece Demir", telefon: "5550000002", beden: "S", arka: "ECE", no: 10, kod: "F-ORNK2", durum: "kapora_alindi" },
    { ad: "Can Yıldız", telefon: "5550000003", beden: "L", arka: "CAN", no: 9, kod: "F-ORNK3", durum: "kapora_bekliyor" },
  ];
  for (const s of liste) {
    await sql`insert into forma_siparis (parti_id, ad, telefon, beden, arka_isim, numara, kod, durum, ornek)
      values (${p.id}, ${s.ad}, ${s.telefon}, ${s.beden}, ${s.arka}, ${s.no}, ${s.kod}, ${s.durum}, true) on conflict do nothing`;
  }
}
