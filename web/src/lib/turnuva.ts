import "server-only";
import type postgres from "postgres";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";
import { ETIKET } from "./ayar";
import {
  golKralligi, kaybeden, kazanan, oynandi, sonrakiAsama, sonrakiYer,
  type Asama, type Durum, type Gol, type Kart, type Mac, type Oyuncu, type OyuncuGizli, type Takim, type Turnuva,
} from "./turnuva-hesap";

export * from "./turnuva-hesap";

export type TurnuvaVerisi = { turnuva: Turnuva; takimlar: Takim[]; maclar: Mac[]; goller: Gol[]; oyuncular: Oyuncu[]; kartlar: Kart[] };

async function turnuvaYukle(sql: postgres.Sql, id: number): Promise<TurnuvaVerisi | null> {
  const [t] = await sql<Turnuva[]>`select id, ad, sezon, durum, aciklama, kurallar, kontenjan, basvuru_acik, aktif, ornek from turnuva where id = ${id}`;
  if (!t) return null;
  // Logonun kendisi sayfaya gomulmez (32 takim x ~20 KB); yalnizca surum ozeti gelir, gorsel /turnuva/logo/[id]
  const takimlar = await sql<Takim[]>`select id, ad, grup, torba, renk, case when logo is null then null else left(md5(logo), 10) end as logo_v
    from takim where turnuva_id = ${id} order by grup nulls last, torba nulls last, ad`;
  const ham = await sql<(Omit<Mac, "zaman"> & { zaman: Date | null })[]>`
    select id, asama, grup, sira, ev_id, dep_id, zaman, saha, ev_gol, dep_gol, ev_pen, dep_pen, canli, hakem
    from mac where turnuva_id = ${id}
    order by case asama when 'grup' then 0 when 'son16' then 1 when 'ceyrek' then 2 when 'yari' then 3 when 'ucuncu' then 4 else 5 end, grup nulls last, sira, id`;
  const maclar: Mac[] = ham.map((m) => ({ ...m, zaman: m.zaman ? new Date(m.zaman).toISOString() : null }));
  const goller = await sql<Gol[]>`select g.id, g.mac_id, g.takim_id, g.oyuncu, g.oyuncu_id, g.asist, g.asist_id, g.dakika
    from gol g join mac m on m.id = g.mac_id where m.turnuva_id = ${id} order by g.mac_id, g.dakika nulls last, g.id`;
  // GIZLILIK: bolum ve ogrenci_no burada secilmez (bu veri herkese acik sayfalara gider)
  const oyuncular = await sql<Oyuncu[]>`select o.id, o.takim_id, o.ad, o.numara, o.yas from oyuncu o join takim k on k.id = o.takim_id
    where k.turnuva_id = ${id} order by o.takim_id, o.numara nulls last, o.ad`;
  const kartlar = await sql<Kart[]>`select x.id, x.mac_id, x.takim_id, x.oyuncu, x.oyuncu_id, x.renk, x.dakika
    from kart x join mac m on m.id = x.mac_id where m.turnuva_id = ${id} order by x.mac_id, x.dakika nulls last, x.id`;
  return { turnuva: t, takimlar, maclar, goller, oyuncular, kartlar };
}

async function vitrinId(sql: postgres.Sql): Promise<number | null> {
  const [r] = await sql<{ id: number }[]>`select id from turnuva order by aktif desc, olusturma desc, id desc limit 1`;
  return r?.id ?? null;
}

// HERKESE ACIK (onbellekli): aktif turnuva, yoksa en yenisi
export async function turnuvaVerisi(): Promise<TurnuvaVerisi | null> {
  "use cache";
  cacheTag(ETIKET.turnuva);
  cacheLife("minutes");
  const sql = await db();
  const id = await vitrinId(sql);
  return id === null ? null : turnuvaYukle(sql, id);
}

// Belirli turnuva (paylasim gorselleri panelden baska turnuvayi da isteyebilir)
export async function turnuvaVerisiIcin(id: number): Promise<TurnuvaVerisi | null> {
  "use cache";
  cacheTag(ETIKET.turnuva);
  cacheLife("minutes");
  return turnuvaYukle(await db(), id);
}

// Mac detay sayfasi: macin turnuvasi (onbellekli)
export async function macTurnuvasi(macId: number): Promise<number | null> {
  "use cache";
  cacheTag(ETIKET.turnuva);
  cacheLife("minutes");
  const sql = await db();
  const [r] = await sql<{ turnuva_id: number }[]>`select turnuva_id from mac where id = ${macId}`;
  return r?.turnuva_id ?? null;
}

// Takim / oyuncu sayfasi: kaydin turnuvasi (onbellekli)
export async function takimTurnuvasi(takimId: number): Promise<number | null> {
  "use cache";
  cacheTag(ETIKET.turnuva);
  cacheLife("minutes");
  const sql = await db();
  const [r] = await sql<{ turnuva_id: number }[]>`select turnuva_id from takim where id = ${takimId}`;
  return r?.turnuva_id ?? null;
}
export async function oyuncuTurnuvasi(oyuncuId: number): Promise<number | null> {
  "use cache";
  cacheTag(ETIKET.turnuva);
  cacheLife("minutes");
  const sql = await db();
  const [r] = await sql<{ turnuva_id: number }[]>`select k.turnuva_id from oyuncu o join takim k on k.id = o.takim_id where o.id = ${oyuncuId}`;
  return r?.turnuva_id ?? null;
}

// Takim logosu (data URL). Panel kaydedince ETIKET.turnuva dusurulur.
export async function takimLogosu(id: number): Promise<string | null> {
  "use cache";
  cacheTag(ETIKET.turnuva);
  cacheLife("hours");
  const sql = await db();
  const [r] = await sql<{ logo: string | null }[]>`select logo from takim where id = ${id}`;
  return r?.logo ?? null;
}

export type CanliOzet = { ev: string; dep: string; evGol: number; depGol: number };
export type TurnuvaOzet = {
  ad: string; sezon: string; durum: Durum; takim: number; mac: number; oynanan: number; gol: number;
  sampiyon: string | null; golKrali: { oyuncu: string; takim: string; gol: number } | null; basvuruAcik: boolean;
  canli: CanliOzet | null;
};

// Ana sayfa ozeti (onbellekli)
export async function turnuvaOzet(): Promise<TurnuvaOzet | null> {
  "use cache";
  cacheTag(ETIKET.turnuva);
  cacheLife("minutes");
  const v = await turnuvaVerisi();
  if (!v) return null;
  const { turnuva: t, takimlar, maclar, goller } = v;
  const final = maclar.find((m) => m.asama === "final");
  const sid = final ? kazanan(final) : null;
  const kral = golKralligi(goller, takimlar)[0] ?? null;
  const cm = maclar.find((m) => m.canli && m.ev_id !== null && m.dep_id !== null);
  const isim = (tid: number | null) => takimlar.find((x) => x.id === tid)?.ad ?? "?";
  return {
    ad: t.ad, sezon: t.sezon, durum: t.durum, takim: takimlar.length, mac: maclar.length,
    oynanan: maclar.filter(oynandi).length, gol: maclar.reduce((s, m) => s + (m.ev_gol ?? 0) + (m.dep_gol ?? 0), 0),
    sampiyon: sid === null ? null : takimlar.find((x) => x.id === sid)?.ad ?? null,
    golKrali: kral, basvuruAcik: t.basvuru_acik,
    canli: cm ? { ev: isim(cm.ev_id), dep: isim(cm.dep_id), evGol: cm.ev_gol ?? 0, depGol: cm.dep_gol ?? 0 } : null,
  };
}

// PANEL (onbelleksiz)
export async function turnuvaListesi() {
  const sql = await db();
  return sql<(Turnuva & { takim: number; bekleyen: number })[]>`
    select t.id, t.ad, t.sezon, t.durum, t.aciklama, t.kurallar, t.kontenjan, t.basvuru_acik, t.aktif, t.ornek,
      (select count(*)::int from takim k where k.turnuva_id = t.id) as takim,
      (select count(*)::int from basvuru b where b.turnuva_id = t.id and b.durum = 'bekliyor') as bekleyen
    from turnuva t order by t.aktif desc, t.olusturma desc, t.id desc`;
}

export async function turnuvaPanel(id: number) {
  const sql = await db();
  return turnuvaYukle(sql, id);
}

// YALNIZ PANEL (yetkiGerekli sonrasi): oyuncunun bolum ve ogrenci no'su. Onbelleksiz, herkese acik sayfalarda kullanma.
export async function oyuncuGizli(turnuvaId: number): Promise<Map<number, OyuncuGizli>> {
  const sql = await db();
  const l = await sql<OyuncuGizli[]>`select o.id, o.bolum, o.ogrenci_no from oyuncu o join takim k on k.id = o.takim_id where k.turnuva_id = ${turnuvaId}`;
  return new Map(l.map((x) => [x.id, x]));
}

export type Basvuru = { id: number; takim_ad: string; kaptan: string; telefon: string; eposta: string; oyuncular: string; durum: string; olusturma: Date };
export async function basvurular(turnuvaId: number) {
  const sql = await db();
  return sql<Basvuru[]>`select id, takim_ad, kaptan, telefon, eposta, oyuncular, durum, olusturma from basvuru where turnuva_id = ${turnuvaId} order by (durum = 'bekliyor') desc, olusturma desc`;
}

// Eleme maci sonucu degisince kazanani bir sonraki turdaki yerine yazar (karar yoksa yeri bosaltir).
// Yari finalde ayrica kaybeden 3.luk macina gider.
export async function ilerlet(sql: postgres.Sql, macId: number) {
  const [m] = await sql<(Omit<Mac, "zaman"> & { turnuva_id: number })[]>`
    select id, turnuva_id, asama, grup, sira, ev_id, dep_id, saha, ev_gol, dep_gol, ev_pen, dep_pen, canli, hakem from mac where id = ${macId}`;
  if (!m) return;
  const mac: Mac = { ...m, zaman: null };
  if (m.asama === "yari") {
    const kb = kaybeden(mac);
    if (m.sira === 1) await sql`update mac set ev_id = ${kb} where turnuva_id = ${m.turnuva_id} and asama = 'ucuncu' and sira = 1`;
    else await sql`update mac set dep_id = ${kb} where turnuva_id = ${m.turnuva_id} and asama = 'ucuncu' and sira = 1`;
  }
  const sonraki = sonrakiAsama(m.asama as Asama);
  if (!sonraki) return;
  const k = kazanan(mac);
  const { sira, taraf } = sonrakiYer(m.sira);
  if (taraf === "ev") await sql`update mac set ev_id = ${k} where turnuva_id = ${m.turnuva_id} and asama = ${sonraki} and sira = ${sira}`;
  else await sql`update mac set dep_id = ${k} where turnuva_id = ${m.turnuva_id} and asama = ${sonraki} and sira = ${sira}`;
}

// Canli macta skor gollerden turetilir (gol eklenince/silinince tutarli kalir)
export async function skorTazele(sql: postgres.Sql, macId: number) {
  await sql`update mac m set
    ev_gol = (select count(*)::int from gol g where g.mac_id = m.id and g.takim_id = m.ev_id),
    dep_gol = (select count(*)::int from gol g where g.mac_id = m.id and g.takim_id = m.dep_id)
    where m.id = ${macId} and m.canli`;
}
