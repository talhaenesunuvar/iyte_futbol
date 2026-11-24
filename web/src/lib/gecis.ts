import "server-only";
import type postgres from "postgres";
import { AD, HAKEMLER, NUMARALAR, RENKLER, SOYAD, prng } from "./tohum/turnuva";
import { kaybeden, type Mac } from "./turnuva-hesap";

// Tek seferlik veri gecisleri. Sema (sema.ts) her acilista IF NOT EXISTS ile calisir; burasi ise mevcut
// veriyi yeni ozelliklere tasir. Her gecis ayar tablosundaki anahtarla bir kez calisir (paralel acilista yalnizca biri).
export async function gecisler(sql: postgres.Sql) {
  await gecisV2(sql);
  await gecisV3(sql);
  await gecisV4(sql);
  await gecisV5(sql);
}

// V5 (2026-11-24): ornek turnuvanin oyuncularina ornek mevki, bolum ve sinif (artik herkese acik).
// 1 numara kaleci; digerleri numaraya gore defans/orta saha/forvet. Gercek turnuvalara dokunmaz.
const ORNEK_BOLUM = ["Bilgisayar Müh.", "Makine Müh.", "Elektrik-Elektronik Müh.", "İnşaat Müh.", "Kimya Müh.", "Fizik", "Mimarlık", "Moleküler Biyoloji", "Matematik", "Gıda Müh."];
const ORNEK_SINIF = ["Hazırlık", "1. sınıf", "2. sınıf", "3. sınıf", "4. sınıf", "Yüksek lisans"];
function ornekMevki(no: number | null, r: () => number) {
  if (no === 1) return "Kaleci";
  if (no !== null && [2, 3, 4, 5, 6].includes(no)) return "Defans";
  if (no !== null && [7, 8, 10, 14].includes(no)) return "Orta saha";
  if (no !== null && [9, 11, 17].includes(no)) return "Forvet";
  return ["Defans", "Orta saha", "Forvet"][Math.floor(r() * 3)];
}
async function gecisV5(sql: postgres.Sql) {
  const ilk = await sql`insert into ayar (anahtar, deger) values ('gecis_v5', now()::text) on conflict do nothing returning anahtar`;
  if (!ilk.length) return;
  const r = prng(5150);
  const oyuncular = await sql<{ id: number; numara: number | null }[]>`
    select o.id, o.numara from oyuncu o join takim k on k.id = o.takim_id join turnuva t on t.id = k.turnuva_id
    where t.ornek and o.mevki = '' order by o.id`;
  for (const o of oyuncular) {
    const bolum = ORNEK_BOLUM[Math.floor(r() * ORNEK_BOLUM.length)];
    const sinif = ORNEK_SINIF[Math.floor(r() * ORNEK_SINIF.length)];
    await sql`update oyuncu set mevki = ${ornekMevki(o.numara, r)}, bolum = case when bolum = '' then ${bolum} else bolum end,
      sinif = case when sinif = '' then ${sinif} else sinif end where id = ${o.id}`;
  }
}

// V4 (2026-11-23): ornek turnuvanin oyuncularina ornek yas, oynanmis maclarina birkac sari/kirmizi kart.
// Bolum ve ogrenci no ornek veride bos kalir (yalniz yonetim girer). Gercek turnuvalara dokunmaz.
async function gecisV4(sql: postgres.Sql) {
  const ilk = await sql`insert into ayar (anahtar, deger) values ('gecis_v4', now()::text) on conflict do nothing returning anahtar`;
  if (!ilk.length) return;
  const r = prng(9090);
  const oyuncular = await sql<{ id: number }[]>`
    select o.id from oyuncu o join takim k on k.id = o.takim_id join turnuva t on t.id = k.turnuva_id where t.ornek and o.yas is null order by o.id`;
  for (const o of oyuncular) await sql`update oyuncu set yas = ${18 + Math.floor(r() * 8)} where id = ${o.id}`;
  const maclar = await sql<{ id: number; ev_id: number; dep_id: number }[]>`
    select m.id, m.ev_id, m.dep_id from mac m join turnuva t on t.id = m.turnuva_id
    where t.ornek and m.ev_gol is not null and m.ev_id is not null and m.dep_id is not null
      and not exists (select 1 from kart x where x.mac_id = m.id) order by m.id`;
  for (const m of maclar) {
    const adet = Math.floor(r() * 3);
    for (let i = 0; i < adet; i++) {
      const tk = r() < 0.5 ? m.ev_id : m.dep_id;
      const l = await sql<{ id: number; ad: string }[]>`select id, ad from oyuncu where takim_id = ${tk} order by id`;
      const o = l[Math.floor(r() * l.length)];
      if (!o) continue;
      const renk = r() < 0.12 ? "kirmizi" : "sari";
      await sql`insert into kart (mac_id, takim_id, oyuncu, oyuncu_id, renk, dakika) values (${m.id}, ${tk}, ${o.ad}, ${o.id}, ${renk}, ${5 + Math.floor(r() * 75)})`;
    }
  }
}

// V3 (2026-11-22): ornek turnuvanin hakemsiz maclarina ornek hakem adi. Gercek turnuvalara dokunmaz.
async function gecisV3(sql: postgres.Sql) {
  const ilk = await sql`insert into ayar (anahtar, deger) values ('gecis_v3', now()::text) on conflict do nothing returning anahtar`;
  if (!ilk.length) return;
  const maclar = await sql<{ id: number }[]>`select m.id from mac m join turnuva t on t.id = m.turnuva_id where t.ornek and m.hakem = '' order by m.id`;
  for (const [i, m] of maclar.entries()) await sql`update mac set hakem = ${HAKEMLER[(i * 7 + 3) % HAKEMLER.length]} where id = ${m.id}`;
}

// V2 (2026-11-22): canli DB'deki ORNEK turnuvaya (ornek = true) renk, kadro, asist ve 3.luk maci ekler.
// Gercek turnuvalara ve kullanicinin girdigi kayitlara dokunmaz. Yeni kurulumda tohum zaten yeni bicimde
// oldugu icin tohumla() bu anahtari onceden yazar ve gecis atlanir.
async function gecisV2(sql: postgres.Sql) {
  const ilk = await sql`insert into ayar (anahtar, deger) values ('gecis_v2', now()::text) on conflict do nothing returning anahtar`;
  if (!ilk.length) return;
  const turnuvalar = await sql<{ id: number }[]>`select id from turnuva where ornek`;
  for (const { id } of turnuvalar) await ornekTurnuvayiGuncelle(sql, id);
}

async function ornekTurnuvayiGuncelle(sql: postgres.Sql, tid: number) {
  const r = prng(4242 + tid);
  const sec = <T,>(l: T[]) => l[Math.floor(r() * l.length)];
  const takimlar = await sql<{ id: number; renk: string | null }[]>`select id, renk from takim where turnuva_id = ${tid} order by id`;

  // 1) Renk (bos olanlara)
  for (const [i, k] of takimlar.entries()) {
    if (!k.renk) await sql`update takim set renk = ${RENKLER[i % RENKLER.length]} where id = ${k.id}`;
  }

  // 2) Kadro: kadrosu olmayan takima, gol atan oyunculari + tamamlayici adlarla 7 kisi
  const kadro = new Map<number, { id: number; ad: string }[]>();
  for (const k of takimlar) {
    let l = await sql<{ id: number; ad: string }[]>`select id, ad from oyuncu where takim_id = ${k.id} order by numara nulls last, id`;
    if (!l.length) {
      const adlar = (await sql<{ oyuncu: string }[]>`
        select g.oyuncu from gol g where g.takim_id = ${k.id} group by g.oyuncu order by count(*) desc, g.oyuncu`).map((x) => x.oyuncu).slice(0, 7);
      while (adlar.length < 7) { const a = `${sec(AD)} ${sec(SOYAD)}`; if (!adlar.includes(a)) adlar.push(a); }
      const satir = adlar.map((ad, i) => ({ takim_id: k.id, ad, numara: NUMARALAR[i] }));
      l = await sql<{ id: number; ad: string }[]>`insert into oyuncu ${sql(satir, "takim_id", "ad", "numara")} returning id, ad`;
    }
    kadro.set(k.id, l);
  }

  // 3) Gollerde oyuncu baglantisi + ~%60 asist (asisti olmayan gollere)
  const goller = await sql<{ id: number; takim_id: number; oyuncu: string; oyuncu_id: number | null; asist: string }[]>`
    select g.id, g.takim_id, g.oyuncu, g.oyuncu_id, g.asist from gol g join mac m on m.id = g.mac_id where m.turnuva_id = ${tid} order by g.id`;
  for (const g of goller) {
    const l = kadro.get(g.takim_id) ?? [];
    const o = l.find((x) => x.ad === g.oyuncu);
    const oid = g.oyuncu_id ?? o?.id ?? null;
    let asist = g.asist, asistId: number | null = null;
    if (!asist && r() < 0.6) {
      const aday = l.filter((x) => x.ad !== g.oyuncu);
      const a = aday[Math.floor(r() * aday.length)];
      if (a) { asist = a.ad; asistId = a.id; }
    }
    await sql`update gol set oyuncu_id = ${oid}, asist = ${asist}, asist_id = coalesce(asist_id, ${asistId}) where id = ${g.id}`;
  }

  // 4) 3.luk maci: yoksa ve iki yari final de sonuclanmissa, kaybedenlerle oynanmis bir mac
  const [var_] = await sql`select 1 from mac where turnuva_id = ${tid} and asama = 'ucuncu'`;
  if (var_) return;
  const yari = await sql<(Omit<Mac, "zaman">)[]>`
    select id, asama, grup, sira, ev_id, dep_id, saha, ev_gol, dep_gol, ev_pen, dep_pen, canli, hakem from mac where turnuva_id = ${tid} and asama = 'yari' order by sira`;
  if (yari.length !== 2) return;
  const [ev, dep] = yari.map((m) => kaybeden({ ...m, zaman: null }));
  const [fin] = await sql<{ zaman: Date | null }[]>`select zaman from mac where turnuva_id = ${tid} and asama = 'final'`;
  const zaman = fin?.zaman ? new Date(new Date(fin.zaman).getTime() - 3 * 3_600_000) : null;
  const [u] = await sql<{ id: number }[]>`
    insert into mac (turnuva_id, asama, grup, sira, ev_id, dep_id, zaman, saha, ev_gol, dep_gol)
    values (${tid}, 'ucuncu', null, 1, ${ev}, ${dep}, ${zaman}, 'Kampüs sahası', ${ev === null || dep === null ? null : 2}, ${ev === null || dep === null ? null : 1}) returning id`;
  if (ev === null || dep === null) return;
  const golEkle = async (tk: number, dk: number, asistli: boolean) => {
    const l = kadro.get(tk) ?? [];
    const o = l[Math.floor(r() * Math.min(3, l.length))];
    const a = asistli ? l.find((x) => x.id !== o?.id) : undefined;
    if (!o) return;
    await sql`insert into gol (mac_id, takim_id, oyuncu, oyuncu_id, asist, asist_id, dakika)
      values (${u.id}, ${tk}, ${o.ad}, ${o.id}, ${a?.ad ?? ""}, ${a?.id ?? null}, ${dk})`;
  };
  await golEkle(ev, 23, true);
  await golEkle(dep, 51, false);
  await golEkle(ev, 74, true);
}
