import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";
import { ETIKET, ayarlar, ayarlarTaze, sayi, type Ayarlar } from "./ayar";
import { kisaKod } from "./islem";

// Forma on siparisi. Toplu uretim icin parti hedef kisiye ulasmali. Her siparis kapora ile baslar;
// onayli = kapora_alindi + odendi. Onayli sayi hedefe ulasinca parti 'doldu' olur ve kalan odeme istenir.

export type SiparisDurum = "kapora_bekliyor" | "kapora_alindi" | "odendi" | "iptal";
export type PartiDurum = "acik" | "doldu" | "siparis" | "teslim";

export const SIPARIS_DURUM: Record<SiparisDurum, string> = {
  kapora_bekliyor: "Kapora bekliyor",
  kapora_alindi: "Kapora alındı",
  odendi: "Ödendi",
  iptal: "İptal",
};
export const PARTI_DURUM: Record<PartiDurum, string> = {
  acik: "Açık",
  doldu: "Doldu, ödeme bekleniyor",
  siparis: "Sipariş verildi",
  teslim: "Teslim edildi",
};

export const fiyatlar = (a: Ayarlar) => ({
  fiyat: sayi(a.forma_fiyat, 500),
  kapora: sayi(a.forma_kapora, 100),
  hedef: Math.max(1, sayi(a.forma_hedef, 5)),
  bedenler: a.forma_bedenler.split(",").map((b) => b.trim()).filter(Boolean),
});

// "Ahmet Yilmaz" -> "Ahmet Y."
export function basHarf(ad: string) {
  const p = ad.trim().split(/\s+/);
  if (p.length < 2) return p[0] ?? "";
  return `${p[0]} ${p[p.length - 1][0].toLocaleUpperCase("tr")}.`;
}

export type FormaOzet = { fiyat: number; kapora: number; hedef: number; onayli: number; bekleyen: number; partiNo: number | null };
export type FormaVitrin = FormaOzet & { kisiler: { ad: string; onayli: boolean }[]; bedenler: string[]; iban: string; ibanAlici: string };

// Herkese acik: en eski acik parti (yoksa son parti degil, null) ve ilerleme
export async function formaVitrin(): Promise<FormaVitrin> {
  "use cache";
  cacheTag(ETIKET.forma, ETIKET.ayar);
  cacheLife("minutes");
  const a = await ayarlar();
  const f = fiyatlar(a);
  const sql = await db();
  const [p] = await sql<{ id: number; hedef: number }[]>`select id, hedef from forma_parti where durum = 'acik' order by id limit 1`;
  const satir = p
    ? await sql<{ ad: string; durum: SiparisDurum }[]>`select ad, durum from forma_siparis where parti_id = ${p.id} and durum <> 'iptal' order by id`
    : [];
  const onayli = satir.filter((s) => s.durum === "kapora_alindi" || s.durum === "odendi").length;
  return {
    fiyat: f.fiyat,
    kapora: f.kapora,
    hedef: p?.hedef ?? f.hedef,
    onayli,
    bekleyen: satir.length - onayli,
    partiNo: p?.id ?? null,
    kisiler: satir.map((s) => ({ ad: basHarf(s.ad), onayli: s.durum !== "kapora_bekliyor" })),
    bedenler: f.bedenler,
    iban: a.iban,
    ibanAlici: a.iban_alici,
  };
}

export async function formaOzet(): Promise<FormaOzet> {
  "use cache";
  cacheTag(ETIKET.forma, ETIKET.ayar);
  cacheLife("minutes");
  const v = await formaVitrin();
  return { fiyat: v.fiyat, kapora: v.kapora, hedef: v.hedef, onayli: v.onayli, bekleyen: v.bekleyen, partiNo: v.partiNo };
}

export type SiparisGirdi = { ad: string; telefon: string; beden: string; arka_isim: string; numara: number | null; ornek?: boolean; durum?: SiparisDurum };

// Siparisi hedefin altinda kisi olan en eski acik partiye ekler; yoksa yeni parti acar. Kod doner.
export async function siparisEkle(g: SiparisGirdi): Promise<{ kod: string; partiId: number }> {
  const sql = await db();
  const f = fiyatlar(await ayarlarTaze());
  // Islem (transaction) kullanilmaz: yerel PGlite cogullayicisinda guvenilir degil. Ayni anda iki kayit
  // partiyi hedefin bir fazlasina tasiyabilir; zararsiz (fazla kisi de uretime girer).
  const t = sql;
  {
    const [uygun] = await t<{ id: number }[]>`
      select p.id from forma_parti p
      where p.durum = 'acik'
        and (select count(*) from forma_siparis s where s.parti_id = p.id and s.durum <> 'iptal') < p.hedef
      order by p.id limit 1`;
    const partiId = uygun?.id ?? (await t<{ id: number }[]>`insert into forma_parti (hedef) values (${f.hedef}) returning id`)[0].id;
    for (let i = 0; ; i++) {
      const kod = kisaKod("F");
      try {
        await t`insert into forma_siparis (parti_id, ad, telefon, beden, arka_isim, numara, kod, durum, ornek)
          values (${partiId}, ${g.ad}, ${g.telefon}, ${g.beden}, ${g.arka_isim}, ${g.numara}, ${kod}, ${g.durum ?? "kapora_bekliyor"}, ${g.ornek ?? false})`;
        return { kod, partiId };
      } catch (e) {
        if ((e as { code?: string }).code !== "23505" || i > 3) throw e;
      }
    }
  }
}

// Onayli sayi hedefe ulastiysa 'acik' partiyi 'doldu' yapar; altina dustuyse geri 'acik'.
export async function partiDurumGuncelle(partiId: number) {
  const sql = await db();
  await sql`
    update forma_parti p set durum = case
      when (select count(*) from forma_siparis s where s.parti_id = p.id and s.durum in ('kapora_alindi','odendi')) >= p.hedef then 'doldu'
      else 'acik' end
    where p.id = ${partiId} and p.durum in ('acik','doldu')`;
}
