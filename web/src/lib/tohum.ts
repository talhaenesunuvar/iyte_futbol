import "server-only";
import type postgres from "postgres";
import { tohumTurnuva } from "./tohum/turnuva";
import { tohumForma } from "./tohum/forma";
import { tohumSaha } from "./tohum/saha";

// Ilk kurulumda ornek icerik. Yalnizca bir kez calisir: "tohum" ayarini ilk ekleyen ornek tohumlar,
// paralel acilan diger ornekler atlar. Ornek kayitlar `ornek = true` ile isaretli; panelden tek tusla silinir.
export const VARSAYILAN_AYAR: Record<string, string> = {
  iban: "",
  iban_alici: "",
  forma_fiyat: "500",
  forma_kapora: "100",
  forma_hedef: "5",
  forma_bedenler: "S,M,L,XL,XXL",
  okul_randevu_url: "https://ubys.iyte.edu.tr",
  okul_saha_bilgi: "Okul sahası öğrenci e-postasıyla, okulun sisteminden alınır.",
  koy_url: "/koy-sahasi",
  koy_adres: "",
};

export async function tohumla(sql: postgres.Sql) {
  const ilk = await sql`insert into ayar (anahtar, deger) values ('tohum', now()::text) on conflict do nothing returning anahtar`;
  if (!ilk.length) return;
  // Yeni kurulumda tohum zaten guncel bicimde (kadro, asist, 3.luk); eski veriye yonelik gecisler atlanir
  await sql`insert into ayar (anahtar, deger) values ('gecis_v2', 'tohum') on conflict do nothing`;
  await sql`insert into ayar (anahtar, deger) values ('gecis_v3', 'tohum') on conflict do nothing`;
  for (const [k, v] of Object.entries(VARSAYILAN_AYAR)) {
    await sql`insert into ayar (anahtar, deger) values (${k}, ${v}) on conflict do nothing`;
  }
  await tohumEtkinlik(sql);
  await tohumTurnuva(sql);
  await tohumForma(sql);
  await tohumSaha(sql);
}

async function tohumEtkinlik(sql: postgres.Sql) {
  const bugun = new Date();
  const gun = (n: number) => new Date(bugun.getTime() + n * 86_400_000).toISOString().slice(0, 10);
  const liste = [
    { tarih: gun(6), saat: "14.00", ad: "Kampüs Turnuvası", tur: "Turnuva", yer: "Kampüs sahası" },
    { tarih: gun(13), saat: "19.00", ad: "Derbi İzleme", tur: "Buluşma", yer: "Kampüs kafe" },
    { tarih: gun(20), saat: "16.00", ad: "Yeni Üye Maçı", tur: "Maç", yer: "Kampüs sahası" },
  ];
  for (const e of liste) {
    await sql`insert into etkinlik (tarih, saat, ad, tur, yer, ornek) values (${e.tarih}, ${e.saat}, ${e.ad}, ${e.tur}, ${e.yer}, true)`;
  }
}
