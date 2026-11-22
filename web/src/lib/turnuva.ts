import "server-only";
import type postgres from "postgres";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";
import { ETIKET } from "./ayar";
import {
  golKralligi, kazanan, oynandi, sonrakiAsama, sonrakiYer,
  type Asama, type Durum, type Gol, type Mac, type Takim, type Turnuva,
} from "./turnuva-hesap";

export * from "./turnuva-hesap";

export type TurnuvaVerisi = { turnuva: Turnuva; takimlar: Takim[]; maclar: Mac[]; goller: Gol[] };

async function turnuvaYukle(sql: postgres.Sql, id: number): Promise<TurnuvaVerisi | null> {
  const [t] = await sql<Turnuva[]>`select id, ad, sezon, durum, aciklama, kurallar, kontenjan, basvuru_acik, aktif, ornek from turnuva where id = ${id}`;
  if (!t) return null;
  const takimlar = await sql<Takim[]>`select id, ad, grup, torba from takim where turnuva_id = ${id} order by grup nulls last, torba nulls last, ad`;
  const ham = await sql<(Omit<Mac, "zaman"> & { zaman: Date | null })[]>`
    select id, asama, grup, sira, ev_id, dep_id, zaman, saha, ev_gol, dep_gol, ev_pen, dep_pen
    from mac where turnuva_id = ${id}
    order by case asama when 'grup' then 0 when 'son16' then 1 when 'ceyrek' then 2 when 'yari' then 3 else 4 end, grup nulls last, sira, id`;
  const maclar: Mac[] = ham.map((m) => ({ ...m, zaman: m.zaman ? new Date(m.zaman).toISOString() : null }));
  const goller = await sql<Gol[]>`select g.id, g.mac_id, g.takim_id, g.oyuncu, g.dakika from gol g join mac m on m.id = g.mac_id where m.turnuva_id = ${id} order by g.mac_id, g.dakika nulls last, g.id`;
  return { turnuva: t, takimlar, maclar, goller };
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

export type TurnuvaOzet = {
  ad: string; sezon: string; durum: Durum; takim: number; mac: number; oynanan: number; gol: number;
  sampiyon: string | null; golKrali: { oyuncu: string; takim: string; gol: number } | null; basvuruAcik: boolean;
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
  return {
    ad: t.ad, sezon: t.sezon, durum: t.durum, takim: takimlar.length, mac: maclar.length,
    oynanan: maclar.filter(oynandi).length, gol: maclar.reduce((s, m) => s + (m.ev_gol ?? 0) + (m.dep_gol ?? 0), 0),
    sampiyon: sid === null ? null : takimlar.find((x) => x.id === sid)?.ad ?? null,
    golKrali: kral, basvuruAcik: t.basvuru_acik,
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

export type Basvuru = { id: number; takim_ad: string; kaptan: string; telefon: string; eposta: string; oyuncular: string; durum: string; olusturma: Date };
export async function basvurular(turnuvaId: number) {
  const sql = await db();
  return sql<Basvuru[]>`select id, takim_ad, kaptan, telefon, eposta, oyuncular, durum, olusturma from basvuru where turnuva_id = ${turnuvaId} order by (durum = 'bekliyor') desc, olusturma desc`;
}

// Eleme maci sonucu degisince kazanani bir sonraki turdaki yerine yazar (karar yoksa yeri bosaltir)
export async function ilerlet(sql: postgres.Sql, macId: number) {
  const [m] = await sql<(Omit<Mac, "zaman"> & { turnuva_id: number })[]>`
    select id, turnuva_id, asama, grup, sira, ev_id, dep_id, saha, ev_gol, dep_gol, ev_pen, dep_pen from mac where id = ${macId}`;
  if (!m) return;
  const sonraki = sonrakiAsama(m.asama as Asama);
  if (!sonraki) return;
  const k = kazanan({ ...m, zaman: null });
  const { sira, taraf } = sonrakiYer(m.sira);
  if (taraf === "ev") await sql`update mac set ev_id = ${k} where turnuva_id = ${m.turnuva_id} and asama = ${sonraki} and sira = ${sira}`;
  else await sql`update mac set dep_id = ${k} where turnuva_id = ${m.turnuva_id} and asama = ${sonraki} and sira = ${sira}`;
}
