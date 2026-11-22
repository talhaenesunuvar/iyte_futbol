import "server-only";
import type postgres from "postgres";

// Ornek okul sahasi dolulugu (onumuzdeki 7 gun) ve iki koy sahasi randevusu.
// Tarihler SQL'de Istanbul gunune gore hesaplanir.
export async function tohumSaha(sql: postgres.Sql) {
  const okul: [number, number, number][] = [
    [0, 19, 20], [0, 21, 23], [1, 18, 19], [2, 20, 22], [3, 17, 18], [3, 21, 22], [4, 19, 21], [5, 14, 16], [6, 16, 17],
  ];
  for (const [g, bas, bit] of okul) {
    await sql`insert into okul_dolu (tarih, bas, bit, etiket)
      values ((now() at time zone 'Europe/Istanbul')::date + ${g}::int, ${bas}, ${bit}, 'Örnek rezervasyon')`;
  }
  const koy: [number, number, string][] = [[1, 3, "ORNK1"], [2, 5, "ORNK2"]];
  for (const [g, slot, k] of koy) {
    await sql`insert into koy_randevu (tarih, slot, ad, telefon, hafta, notu, kod)
      select t, ${slot}, 'Örnek Randevu', ${"555000010" + slot}, date_trunc('week', t)::date, 'örnek', ${"KS-" + k}
      from (select (now() at time zone 'Europe/Istanbul')::date + ${g}::int as t) x
      on conflict do nothing`;
  }
}
