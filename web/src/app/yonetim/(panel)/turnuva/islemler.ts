"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { yetkiGerekli } from "@/lib/yetki";
import { bitir, metin, tamsayi } from "@/lib/islem";
import { ETIKET } from "@/lib/ayar";
import {
  DURUMLAR, ELEME, ELEME_BOY, GRUP_HARF, elemeEslesme, grupFiksturu, ilerlet, puanDurumu, turnuvaPanel, yereldenIso,
  type Asama, type Durum,
} from "@/lib/turnuva";

const yol = (id: number) => `/yonetim/turnuva/${id}`;
// Hata mesaji sayfaya ?hata= ile doner (uretimde atilan hata mesaji gizlenir)
function geri(id: number | null, hata: string, bolum = ""): never {
  redirect(`${id ? yol(id) : "/yonetim/turnuva"}?hata=${encodeURIComponent(hata)}${bolum ? `#${bolum}` : ""}`);
}
const kimlik = (f: FormData, k = "id") => {
  const n = tamsayi(f, k);
  if (n === null || n <= 0) throw new Error("Geçersiz kimlik.");
  return n;
};
const skor = (f: FormData, k: string) => {
  const n = tamsayi(f, k);
  return n === null || n < 0 || n > 99 ? null : n;
};
function karistir<T>(l: T[]) {
  const a = [...l];
  for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// TURNUVA
export async function turnuvaKaydetAction(f: FormData) {
  await yetkiGerekli();
  const id = tamsayi(f, "id");
  const ad = metin(f, "ad", 80);
  const sezon = metin(f, "sezon", 40);
  const durumS = metin(f, "durum", 20) as Durum;
  const durum: Durum = DURUMLAR.includes(durumS) ? durumS : "basvuru";
  const aciklama = metin(f, "aciklama", 1000);
  const kurallar = metin(f, "kurallar", 5000);
  const kontenjan = Math.min(64, Math.max(2, tamsayi(f, "kontenjan") ?? 32));
  const basvuruAcik = f.get("basvuru_acik") === "on";
  const aktif = f.get("aktif") === "on";
  if (ad.length < 2) geri(id, "Turnuva adı gerekli.");
  const sql = await db();
  let tid = id;
  if (tid) {
    await sql`update turnuva set ad = ${ad}, sezon = ${sezon}, durum = ${durum}, aciklama = ${aciklama}, kurallar = ${kurallar},
      kontenjan = ${kontenjan}, basvuru_acik = ${basvuruAcik}, aktif = ${aktif} where id = ${tid}`;
  } else {
    const [r] = await sql<{ id: number }[]>`insert into turnuva (ad, sezon, durum, aciklama, kurallar, kontenjan, basvuru_acik, aktif)
      values (${ad}, ${sezon}, ${durum}, ${aciklama}, ${kurallar}, ${kontenjan}, ${basvuruAcik}, ${aktif}) returning id`;
    tid = r.id;
  }
  if (aktif) await sql`update turnuva set aktif = false where id <> ${tid} and aktif`;
  bitir(ETIKET.turnuva);
  if (!id) redirect(yol(tid));
}

export async function turnuvaSilAction(f: FormData) {
  await yetkiGerekli();
  const id = kimlik(f);
  const sql = await db();
  await sql`delete from turnuva where id = ${id}`;
  bitir(ETIKET.turnuva);
  redirect("/yonetim/turnuva");
}

// TAKIMLAR
function grupDegeri(f: FormData) {
  const g = metin(f, "grup", 2).toUpperCase();
  return GRUP_HARF.includes(g) ? g : null;
}
function torbaDegeri(f: FormData) {
  const t = tamsayi(f, "torba");
  return t !== null && t >= 1 && t <= 8 ? t : null;
}

export async function takimEkleAction(f: FormData) {
  await yetkiGerekli();
  const tid = kimlik(f, "turnuva_id");
  const ad = metin(f, "ad", 60);
  if (ad.length < 2) geri(tid, "Takım adı gerekli.", "takimlar");
  const sql = await db();
  const r = await sql`insert into takim (turnuva_id, ad, grup, torba) values (${tid}, ${ad}, ${grupDegeri(f)}, ${torbaDegeri(f)})
    on conflict (turnuva_id, ad) do nothing returning id`;
  if (!r.length) geri(tid, "Bu adla bir takım zaten var.", "takimlar");
  bitir(ETIKET.turnuva);
}

export async function takimGuncelleAction(f: FormData) {
  await yetkiGerekli();
  const id = kimlik(f);
  const tid = kimlik(f, "turnuva_id");
  const ad = metin(f, "ad", 60);
  if (ad.length < 2) geri(tid, "Takım adı gerekli.", "takimlar");
  const sql = await db();
  try {
    await sql`update takim set ad = ${ad}, grup = ${grupDegeri(f)}, torba = ${torbaDegeri(f)} where id = ${id} and turnuva_id = ${tid}`;
  } catch {
    geri(tid, "Bu adla bir takım zaten var.", "takimlar");
  }
  bitir(ETIKET.turnuva);
}

export async function takimSilAction(f: FormData) {
  await yetkiGerekli();
  const id = kimlik(f);
  const tid = kimlik(f, "turnuva_id");
  const sql = await db();
  await sql`delete from takim where id = ${id} and turnuva_id = ${tid}`;
  bitir(ETIKET.turnuva);
}

// Kura: her torbadan her gruba bir takim; torbasiz takimlar en az takimi olan gruplara
export async function kuraCekAction(f: FormData) {
  await yetkiGerekli();
  const tid = kimlik(f, "turnuva_id");
  const sql = await db();
  const [t] = await sql<{ kontenjan: number }[]>`select kontenjan from turnuva where id = ${tid}`;
  if (!t) geri(null, "Turnuva bulunamadı.");
  const takimlar = await sql<{ id: number; torba: number | null }[]>`select id, torba from takim where turnuva_id = ${tid}`;
  if (takimlar.length < 2) geri(tid, "Kura için en az 2 takım gerekli.", "takimlar");
  const G = Math.min(GRUP_HARF.length, Math.max(1, Math.round(t.kontenjan / 4)));
  const say = new Array(G).fill(0);
  const atama: { id: number; grup: string }[] = [];
  const torbalar = [...new Set(takimlar.map((k) => k.torba).filter((x): x is number => x !== null))].sort((a, b) => a - b);
  for (const p of torbalar) {
    // Her torbada gruplari da karistir ki ilk gruplar hep dolmasin
    const sira = karistir([...Array(G).keys()]).sort((a, b) => say[a] - say[b]);
    karistir(takimlar.filter((k) => k.torba === p)).forEach((k, i) => {
      const g = sira[i % G];
      say[g]++;
      atama.push({ id: k.id, grup: GRUP_HARF[g] });
    });
  }
  for (const k of karistir(takimlar.filter((x) => x.torba === null))) {
    const g = say.indexOf(Math.min(...say));
    say[g]++;
    atama.push({ id: k.id, grup: GRUP_HARF[g] });
  }
  for (const a of atama) await sql`update takim set grup = ${a.grup} where id = ${a.id}`;
  bitir(ETIKET.turnuva);
}

// Grup fiksturu: mevcut grup maclari (ve golleri) silinir, grup ici tek devre yeniden kurulur
export async function grupFiksturuAction(f: FormData) {
  await yetkiGerekli();
  const tid = kimlik(f, "turnuva_id");
  const sql = await db();
  const takimlar = await sql<{ id: number; grup: string }[]>`select id, grup from takim where turnuva_id = ${tid} and grup is not null order by grup, torba nulls last, id`;
  if (!takimlar.length) geri(tid, "Önce takımları gruplara yerleştir (kura çek).", "maclar");
  const gruplar = new Map<string, number[]>();
  for (const k of takimlar) gruplar.set(k.grup, [...(gruplar.get(k.grup) ?? []), k.id]);
  const satir: { turnuva_id: number; asama: string; grup: string; sira: number; ev_id: number; dep_id: number; saha: string }[] = [];
  for (const [g, ids] of gruplar) grupFiksturu(ids).forEach(([ev, dep], i) => satir.push({ turnuva_id: tid, asama: "grup", grup: g, sira: i + 1, ev_id: ev, dep_id: dep, saha: "Kampüs sahası" }));
  await sql`delete from mac where turnuva_id = ${tid} and asama = 'grup'`;
  if (satir.length) await sql`insert into mac ${sql(satir, "turnuva_id", "asama", "grup", "sira", "ev_id", "dep_id", "saha")}`;
  bitir(ETIKET.turnuva);
}

// Eleme agaci: grup siralamasindan ilk tur + bos sonraki turlar. Mevcut eleme maclari silinir.
export async function elemeOlusturAction(f: FormData) {
  await yetkiGerekli();
  const tid = kimlik(f, "turnuva_id");
  const v = await turnuvaPanel(tid);
  if (!v) geri(null, "Turnuva bulunamadı.");
  const es = elemeEslesme(puanDurumu(v.takimlar, v.maclar));
  if ("hata" in es) geri(tid, es.hata, "maclar");
  const sql = await db();
  await sql`delete from mac where turnuva_id = ${tid} and asama <> 'grup'`;
  const satir: { turnuva_id: number; asama: string; sira: number; ev_id: number | null; dep_id: number | null; saha: string }[] = [];
  es.ciftler.forEach(([ev, dep], i) => satir.push({ turnuva_id: tid, asama: es.asama, sira: i + 1, ev_id: ev, dep_id: dep, saha: "Kampüs sahası" }));
  for (const a of ELEME.slice(ELEME.indexOf(es.asama) + 1)) {
    for (let s = 1; s <= ELEME_BOY[a]; s++) satir.push({ turnuva_id: tid, asama: a, sira: s, ev_id: null, dep_id: null, saha: "Kampüs sahası" });
  }
  await sql`insert into mac ${sql(satir, "turnuva_id", "asama", "sira", "ev_id", "dep_id", "saha")}`;
  bitir(ETIKET.turnuva);
}

// MACLAR
export async function macKaydetAction(f: FormData) {
  await yetkiGerekli();
  const id = kimlik(f);
  const tid = kimlik(f, "turnuva_id");
  const zamanS = metin(f, "zaman", 20);
  const zaman = zamanS ? yereldenIso(zamanS) : null;
  if (zamanS && !zaman) geri(tid, "Tarih-saat geçersiz.", `mac-${id}`);
  const saha = metin(f, "saha", 60);
  let ev = skor(f, "ev_gol"), dep = skor(f, "dep_gol");
  if (ev === null || dep === null) { ev = null; dep = null; }
  let evp = skor(f, "ev_pen"), depp = skor(f, "dep_pen");
  if (evp === null || depp === null || ev === null || ev !== dep) { evp = null; depp = null; }
  const sql = await db();
  const [m] = await sql<{ asama: Asama; ev_id: number | null; dep_id: number | null }[]>`select asama, ev_id, dep_id from mac where id = ${id} and turnuva_id = ${tid}`;
  if (!m) geri(tid, "Maç bulunamadı.");
  let evId = m.ev_id, depId = m.dep_id;
  if (m.asama !== "grup" && f.has("ev_id")) {
    const takimlar = new Set((await sql<{ id: number }[]>`select id from takim where turnuva_id = ${tid}`).map((x) => x.id));
    const sec = (k: string) => { const n = tamsayi(f, k); return n !== null && takimlar.has(n) ? n : null; };
    evId = sec("ev_id"); depId = sec("dep_id");
    if (evId !== null && evId === depId) geri(tid, "Bir takım kendisiyle oynayamaz.", `mac-${id}`);
  }
  if (m.asama !== "grup" && ev !== null && ev === dep && evp === null) geri(tid, "Eleme maçında beraberlikte penaltı sonucu gerekli.", `mac-${id}`);
  await sql`update mac set zaman = ${zaman}, saha = ${saha}, ev_id = ${evId}, dep_id = ${depId},
    ev_gol = ${ev}, dep_gol = ${dep}, ev_pen = ${evp}, dep_pen = ${depp} where id = ${id}`;
  if (m.asama !== "grup") await ilerlet(sql, id);
  bitir(ETIKET.turnuva);
}

export async function golEkleAction(f: FormData) {
  await yetkiGerekli();
  const macId = kimlik(f, "mac_id");
  const tid = kimlik(f, "turnuva_id");
  const takimId = kimlik(f, "takim_id");
  const oyuncu = metin(f, "oyuncu", 60);
  const dk = tamsayi(f, "dakika");
  const dakika = dk !== null && dk >= 1 && dk <= 130 ? dk : null;
  if (oyuncu.length < 2) geri(tid, "Oyuncu adı gerekli.", `mac-${macId}`);
  const sql = await db();
  const [m] = await sql`select 1 from mac where id = ${macId} and turnuva_id = ${tid} and ${takimId} in (ev_id, dep_id)`;
  if (!m) geri(tid, "Takım bu maçta oynamıyor.", `mac-${macId}`);
  await sql`insert into gol (mac_id, takim_id, oyuncu, dakika) values (${macId}, ${takimId}, ${oyuncu}, ${dakika})`;
  bitir(ETIKET.turnuva);
}

export async function golSilAction(f: FormData) {
  await yetkiGerekli();
  const id = kimlik(f);
  const tid = kimlik(f, "turnuva_id");
  const sql = await db();
  await sql`delete from gol g using mac m where g.id = ${id} and m.id = g.mac_id and m.turnuva_id = ${tid}`;
  bitir(ETIKET.turnuva);
}

// BASVURULAR
export async function basvuruOnaylaAction(f: FormData) {
  await yetkiGerekli();
  const id = kimlik(f);
  const tid = kimlik(f, "turnuva_id");
  const sql = await db();
  const [b] = await sql<{ takim_ad: string }[]>`select takim_ad from basvuru where id = ${id} and turnuva_id = ${tid} and durum = 'bekliyor'`;
  if (!b) geri(tid, "Başvuru bulunamadı ya da zaten işlenmiş.", "basvurular");
  const r = await sql`insert into takim (turnuva_id, ad) values (${tid}, ${b.takim_ad}) on conflict (turnuva_id, ad) do nothing returning id`;
  if (!r.length) geri(tid, `"${b.takim_ad}" adında takım zaten var; önce takım adını düzelt.`, "basvurular");
  await sql`update basvuru set durum = 'onaylandi' where id = ${id}`;
  bitir(ETIKET.turnuva);
}

export async function basvuruReddetAction(f: FormData) {
  await yetkiGerekli();
  const id = kimlik(f);
  const tid = kimlik(f, "turnuva_id");
  const sql = await db();
  await sql`update basvuru set durum = 'reddedildi' where id = ${id} and turnuva_id = ${tid} and durum = 'bekliyor'`;
  bitir(ETIKET.turnuva);
}
