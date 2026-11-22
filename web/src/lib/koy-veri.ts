import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";
import { ETIKET } from "./ayar";
import { kisaKod, tarihMi } from "./islem";
import { SLOTLAR, gectiMi, gunAnahtardan, gunler, haftaBasi, slotAnahtar, type KoyDoluluk } from "./koy-sahasi";

// Herkese acik doluluk: bugunden (Istanbul) itibaren aktif randevular ve kapali slotlar.
// Kim aldigi gonderilmez; yalnizca tarih + slot.
export async function koyDoluluk(): Promise<KoyDoluluk> {
  "use cache";
  cacheTag(ETIKET.koy);
  cacheLife("minutes");
  const sql = await db();
  const bugun = sql`(now() at time zone 'Europe/Istanbul')::date`;
  const r = await sql<{ tarih: string; slot: number }[]>`select tarih, slot from koy_randevu where durum = 'aktif' and tarih >= ${bugun}`;
  const k = await sql<{ tarih: string; slot: number; sebep: string }[]>`select tarih, slot, sebep from koy_kapali where tarih >= ${bugun}`;
  return {
    dolu: r.map((x) => slotAnahtar(x.tarih, x.slot)),
    kapali: k.map((x) => ({ anahtar: slotAnahtar(x.tarih, x.slot), sebep: x.sebep })),
  };
}

// Ortak randevu kaydi (herkese acik form ve panelden elle ekleme). Server action DEGIL; cagiran dogrular.
// gecmiseIzin: panel 7 gun sinirini asabilir.
export async function randevuKaydet(g: { tarih: string; slot: number; ad: string; telefon: string; notu: string }, gecmiseIzin = false): Promise<{ hata: string } | { kod: string }> {
  if (!tarihMi(g.tarih)) return { hata: "Gün geçersiz." };
  if (!Number.isInteger(g.slot) || g.slot < 0 || g.slot >= SLOTLAR.length) return { hata: "Saat geçersiz." };
  const simdi = new Date();
  if (!gecmiseIzin) {
    if (!gunler(simdi).some((x) => x.anahtar === g.tarih)) return { hata: "Randevu en çok 7 gün sonrası için alınabilir." };
  }
  if (gectiMi(gunAnahtardan(g.tarih), SLOTLAR[g.slot], simdi)) return { hata: "Bu saat geçti." };
  const sql = await db();
  const [kapali] = await sql`select 1 from koy_kapali where tarih = ${g.tarih} and slot = ${g.slot}`;
  if (kapali) return { hata: "Bu saat kapalı." };
  for (let i = 0; ; i++) {
    const kod = kisaKod("KS");
    try {
      await sql`insert into koy_randevu (tarih, slot, ad, telefon, hafta, notu, kod)
        values (${g.tarih}, ${g.slot}, ${g.ad}, ${g.telefon}, ${haftaBasi(g.tarih)}, ${g.notu}, ${kod})`;
      return { kod };
    } catch (e) {
      const h = e as { code?: string; constraint_name?: string };
      if (h.code !== "23505") throw e;
      if (h.constraint_name === "koy_randevu_slot") return { hata: "Bu saat az önce doldu, başka bir saat seç." };
      if (h.constraint_name === "koy_randevu_hafta") return { hata: "Bu telefonla bu hafta zaten bir randevu var. Haftada bir randevu alınabiliyor." };
      if (i > 3) throw e;
    }
  }
}

