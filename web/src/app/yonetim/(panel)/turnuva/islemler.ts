"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { yetkiGerekli } from "@/lib/yetki";
import { bitir, metin, tamsayi } from "@/lib/islem";
import { ETIKET } from "@/lib/ayar";
import {
  DURUMLAR, ELEME, ELEME_BOY, GRUP_HARF, elemeEslesme, grupFiksturu, ilerlet, puanDurumu, renkGecerli, skorTazele, turnuvaPanel, yereldenIso,
  type Asama, type Durum,
} from "@/lib/turnuva";

const yol = (id: number) => `/yonetim/turnuva/${id}`;
// Hata mesaji sayfaya ?hata= ile doner (uretimde atilan hata mesaji gizlenir)
function geri(id: number | null, hata: string, bolum = "", hedef = ""): never {
  redirect(`${hedef || (id ? yol(id) : "/yonetim/turnuva")}?hata=${encodeURIComponent(hata)}${bolum ? `#${bolum}` : ""}`);
}
// Canli mac sayfasindan gelen formlar hatada oraya doner ("don" alani; yalnizca panel turnuva yollari)
const donus = (f: FormData) => {
  const d = String(f.get("don") ?? "");
  return /^\/yonetim\/turnuva\/mac\/\d+$/.test(d) ? d : "";
};
// Logo: istemci 128 px PNG/JPEG/WebP'ye kucultup data URL gonderir. "" = degistirme, "sil" = kaldir.
const LOGO_AZAMI = 80_000;
function logoDegeri(f: FormData): string | null | undefined {
  const v = String(f.get("logo") ?? "");
  if (!v) return undefined;
  if (v === "sil") return null;
  if (v.length > LOGO_AZAMI || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) throw new Error("Logo geçersiz ya da çok büyük.");
  return v;
}
const renkDegeri = (f: FormData) => {
  const r = metin(f, "renk", 7);
  return renkGecerli(r) ? r.toUpperCase() : null;
};
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
  const r = await sql`insert into takim (turnuva_id, ad, grup, torba, renk) values (${tid}, ${ad}, ${grupDegeri(f)}, ${torbaDegeri(f)}, ${renkDegeri(f)})
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
  let logo: string | null | undefined;
  try { logo = logoDegeri(f); } catch { geri(tid, "Logo geçersiz ya da çok büyük (en fazla ~60 KB).", "takimlar"); }
  const sql = await db();
  try {
    await sql`update takim set ad = ${ad}, grup = ${grupDegeri(f)}, torba = ${torbaDegeri(f)}, renk = ${renkDegeri(f)} where id = ${id} and turnuva_id = ${tid}`;
    if (logo !== undefined) await sql`update takim set logo = ${logo} where id = ${id} and turnuva_id = ${tid}`;
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
  // Yari final varsa (ilk tur yari ya da daha erken) bos 3.luk maci; yari finalde kaybedenler buraya iner
  if (ELEME.indexOf(es.asama) <= ELEME.indexOf("yari")) satir.push({ turnuva_id: tid, asama: "ucuncu", sira: 1, ev_id: null, dep_id: null, saha: "Kampüs sahası" });
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
  const hakem = metin(f, "hakem", 60);
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
  await sql`update mac set zaman = ${zaman}, saha = ${saha}, hakem = ${hakem}, ev_id = ${evId}, dep_id = ${depId},
    ev_gol = ${ev}, dep_gol = ${dep}, ev_pen = ${evp}, dep_pen = ${depp} where id = ${id}`;
  if (m.asama !== "grup") await ilerlet(sql, id);
  bitir(ETIKET.turnuva);
}

// Gol: "kim" = "o:<oyuncuId>" (kadrodan) ya da "t:<takimId>" + serbest "oyuncu" adi.
// "asist" = "a:<oyuncuId>" ya da "" + serbest "asist_ad". Asist golu atanla ayni takimdan olmali.
export async function golEkleAction(f: FormData) {
  await yetkiGerekli();
  const macId = kimlik(f, "mac_id");
  const tid = kimlik(f, "turnuva_id");
  const hedef = donus(f);
  const bolum = hedef ? "" : `mac-${macId}`;
  const dk = tamsayi(f, "dakika");
  const dakika = dk !== null && dk >= 1 && dk <= 130 ? dk : null;
  const sql = await db();
  const [m] = await sql<{ ev_id: number | null; dep_id: number | null }[]>`select ev_id, dep_id from mac where id = ${macId} and turnuva_id = ${tid}`;
  if (!m || m.ev_id === null || m.dep_id === null) geri(tid, "Maç bulunamadı ya da takımları belli değil.", bolum, hedef);
  const kim = metin(f, "kim", 20);
  let takimId: number | null = null, oyuncu = "", oyuncuId: number | null = null;
  const om = /^o:(\d+)$/.exec(kim), tm = /^t:(\d+)$/.exec(kim);
  if (om) {
    const [o] = await sql<{ id: number; takim_id: number; ad: string }[]>`select id, takim_id, ad from oyuncu where id = ${Number(om[1])}`;
    if (!o) geri(tid, "Oyuncu bulunamadı.", bolum, hedef);
    takimId = o.takim_id; oyuncu = o.ad; oyuncuId = o.id;
  } else {
    takimId = tm ? Number(tm[1]) : tamsayi(f, "takim_id");
    oyuncu = metin(f, "oyuncu", 60);
    if (oyuncu.length < 2) geri(tid, "Golü atan oyuncuyu seç ya da adını yaz.", bolum, hedef);
  }
  if (takimId !== m.ev_id && takimId !== m.dep_id) geri(tid, "Takım bu maçta oynamıyor.", bolum, hedef);
  let asist = "", asistId: number | null = null;
  const as = metin(f, "asist", 20), am = /^a:(\d+)$/.exec(as);
  if (am) {
    const [o] = await sql<{ id: number; takim_id: number; ad: string }[]>`select id, takim_id, ad from oyuncu where id = ${Number(am[1])}`;
    if (o && o.takim_id === takimId && o.id !== oyuncuId) { asist = o.ad; asistId = o.id; }
  } else {
    asist = metin(f, "asist_ad", 60);
    if (asist && asist.toLocaleLowerCase("tr") === oyuncu.toLocaleLowerCase("tr")) asist = "";
  }
  await sql`insert into gol (mac_id, takim_id, oyuncu, oyuncu_id, asist, asist_id, dakika)
    values (${macId}, ${takimId}, ${oyuncu}, ${oyuncuId}, ${asist}, ${asistId}, ${dakika})`;
  await skorTazele(sql, macId);
  bitir(ETIKET.turnuva);
}

export async function golSilAction(f: FormData) {
  await yetkiGerekli();
  const id = kimlik(f);
  const tid = kimlik(f, "turnuva_id");
  const sql = await db();
  const r = await sql<{ mac_id: number }[]>`delete from gol g using mac m where g.id = ${id} and m.id = g.mac_id and m.turnuva_id = ${tid} returning g.mac_id`;
  if (r[0]) await skorTazele(sql, r[0].mac_id);
  bitir(ETIKET.turnuva);
}

// CANLI MAC: baslat (skor gollerden hesaplanir) / bitir (eleme maclarinda beraberlikte penalti gerekli, sonra kazanan ilerler)
export async function canliAction(f: FormData) {
  await yetkiGerekli();
  const id = kimlik(f);
  const tid = kimlik(f, "turnuva_id");
  const hedef = `/yonetim/turnuva/mac/${id}`;
  const islem = metin(f, "islem", 10);
  const sql = await db();
  const [m] = await sql<{ asama: Asama; ev_id: number | null; dep_id: number | null; ev_gol: number | null; dep_gol: number | null }[]>`
    select asama, ev_id, dep_id, ev_gol, dep_gol from mac where id = ${id} and turnuva_id = ${tid}`;
  if (!m || m.ev_id === null || m.dep_id === null) geri(tid, "Maçın iki takımı da belli olmalı.", "", hedef);
  if (islem === "baslat") {
    await sql`update mac set canli = true, ev_pen = null, dep_pen = null where id = ${id}`;
    await skorTazele(sql, id);
  } else if (islem === "bitir") {
    let evp = skor(f, "ev_pen"), depp = skor(f, "dep_pen");
    const ev = m.ev_gol ?? 0, dep = m.dep_gol ?? 0;
    if (evp === null || depp === null || ev !== dep) { evp = null; depp = null; }
    if (m.asama !== "grup" && ev === dep && (evp === null || evp === depp)) geri(tid, "Eleme maçı berabere: penaltı sonucunu gir (eşit olamaz).", "", hedef);
    await sql`update mac set canli = false, ev_gol = ${ev}, dep_gol = ${dep}, ev_pen = ${evp}, dep_pen = ${depp} where id = ${id}`;
    if (m.asama !== "grup") await ilerlet(sql, id);
  }
  bitir(ETIKET.turnuva);
}

// KARTLAR: "kim" golle ayni bicim ("o:<oyuncuId>" ya da "t:<takimId>" + serbest "oyuncu"); renk sari | kirmizi
export async function kartEkleAction(f: FormData) {
  await yetkiGerekli();
  const macId = kimlik(f, "mac_id");
  const tid = kimlik(f, "turnuva_id");
  const hedef = donus(f);
  const bolum = hedef ? "" : `mac-${macId}`;
  const renk = metin(f, "renk", 10);
  if (renk !== "sari" && renk !== "kirmizi") geri(tid, "Kart rengi seç.", bolum, hedef);
  const dk = tamsayi(f, "dakika");
  const dakika = dk !== null && dk >= 1 && dk <= 130 ? dk : null;
  const sql = await db();
  const [m] = await sql<{ ev_id: number | null; dep_id: number | null }[]>`select ev_id, dep_id from mac where id = ${macId} and turnuva_id = ${tid}`;
  if (!m || m.ev_id === null || m.dep_id === null) geri(tid, "Maç bulunamadı ya da takımları belli değil.", bolum, hedef);
  const kim = metin(f, "kim", 20);
  let takimId: number | null, oyuncu: string, oyuncuId: number | null = null;
  const om = /^o:(\d+)$/.exec(kim), tm = /^t:(\d+)$/.exec(kim);
  if (om) {
    const [o] = await sql<{ id: number; takim_id: number; ad: string }[]>`select id, takim_id, ad from oyuncu where id = ${Number(om[1])}`;
    if (!o) geri(tid, "Oyuncu bulunamadı.", bolum, hedef);
    takimId = o.takim_id; oyuncu = o.ad; oyuncuId = o.id;
  } else {
    takimId = tm ? Number(tm[1]) : null;
    oyuncu = metin(f, "oyuncu", 60);
    if (oyuncu.length < 2) geri(tid, "Kartı gören oyuncuyu seç ya da adını yaz.", bolum, hedef);
  }
  if (takimId !== m.ev_id && takimId !== m.dep_id) geri(tid, "Takım bu maçta oynamıyor.", bolum, hedef);
  await sql`insert into kart (mac_id, takim_id, oyuncu, oyuncu_id, renk, dakika) values (${macId}, ${takimId}, ${oyuncu}, ${oyuncuId}, ${renk}, ${dakika})`;
  bitir(ETIKET.turnuva);
}

export async function kartSilAction(f: FormData) {
  await yetkiGerekli();
  const id = kimlik(f);
  const tid = kimlik(f, "turnuva_id");
  const sql = await db();
  await sql`delete from kart x using mac m where x.id = ${id} and m.id = x.mac_id and m.turnuva_id = ${tid}`;
  bitir(ETIKET.turnuva);
}

// KADROLAR
async function takimKontrol(tid: number, takimId: number) {
  const sql = await db();
  const [k] = await sql`select 1 from takim where id = ${takimId} and turnuva_id = ${tid}`;
  return !!k;
}

// Oyuncu alanlari. yas herkese acik; bolum ve ogrenci_no yalniz panelde gorunur.
function oyuncuAlanlari(f: FormData) {
  const no = tamsayi(f, "numara"), yas = tamsayi(f, "yas");
  return {
    ad: metin(f, "ad", 60),
    numara: no !== null && no >= 0 && no <= 99 ? no : null,
    yas: yas !== null && yas >= 10 && yas <= 80 ? yas : null,
    bolum: metin(f, "bolum", 80),
    ogrenci_no: metin(f, "ogrenci_no", 20).replace(/[^0-9A-Za-z]/g, ""),
  };
}

export async function oyuncuEkleAction(f: FormData) {
  await yetkiGerekli();
  const tid = kimlik(f, "turnuva_id");
  const takimId = kimlik(f, "takim_id");
  const o = oyuncuAlanlari(f);
  if (o.ad.length < 2) geri(tid, "Oyuncu adı gerekli.", `kadro-${takimId}`);
  if (!(await takimKontrol(tid, takimId))) geri(tid, "Takım bulunamadı.", "kadrolar");
  const sql = await db();
  await sql`insert into oyuncu (takim_id, ad, numara, yas, bolum, ogrenci_no) values (${takimId}, ${o.ad}, ${o.numara}, ${o.yas}, ${o.bolum}, ${o.ogrenci_no})`;
  bitir(ETIKET.turnuva);
}

// Oyuncu duzenleme. Ad degisirse kayitli gol/asist/kartlardaki ad da guncellenir (istatistik kopmasin).
export async function oyuncuGuncelleAction(f: FormData) {
  await yetkiGerekli();
  const id = kimlik(f);
  const tid = kimlik(f, "turnuva_id");
  const o = oyuncuAlanlari(f);
  const sql = await db();
  const [eski] = await sql<{ takim_id: number }[]>`select o.takim_id from oyuncu o join takim k on k.id = o.takim_id where o.id = ${id} and k.turnuva_id = ${tid}`;
  if (!eski) geri(tid, "Oyuncu bulunamadı.", "kadrolar");
  if (o.ad.length < 2) geri(tid, "Oyuncu adı gerekli.", `kadro-${eski.takim_id}`);
  await sql`update oyuncu set ad = ${o.ad}, numara = ${o.numara}, yas = ${o.yas}, bolum = ${o.bolum}, ogrenci_no = ${o.ogrenci_no} where id = ${id}`;
  await sql`update gol set oyuncu = ${o.ad} where oyuncu_id = ${id}`;
  await sql`update gol set asist = ${o.ad} where asist_id = ${id}`;
  await sql`update kart set oyuncu = ${o.ad} where oyuncu_id = ${id}`;
  bitir(ETIKET.turnuva);
}

// Toplu: her satir "10 Ahmet Yilmaz" ya da "Ahmet Yilmaz"; en fazla 40 satir
export async function kadroTopluAction(f: FormData) {
  await yetkiGerekli();
  const tid = kimlik(f, "turnuva_id");
  const takimId = kimlik(f, "takim_id");
  if (!(await takimKontrol(tid, takimId))) geri(tid, "Takım bulunamadı.", "kadrolar");
  const satirlar = metin(f, "liste", 4000).split(/\r?\n/).map((x) => x.trim()).filter(Boolean).slice(0, 40);
  const yeni = satirlar.map((x) => {
    const m = /^(\d{1,2})\s*[.)\-–:]?\s+(.+)$/.exec(x);
    return { takim_id: takimId, numara: m ? Number(m[1]) : null, ad: (m ? m[2] : x).slice(0, 60) };
  }).filter((o) => o.ad.length >= 2);
  if (!yeni.length) geri(tid, "Listede oyuncu bulunamadı. Her satıra bir oyuncu yaz.", `kadro-${takimId}`);
  const sql = await db();
  await sql`insert into oyuncu ${sql(yeni, "takim_id", "ad", "numara")}`;
  bitir(ETIKET.turnuva);
}

export async function oyuncuSilAction(f: FormData) {
  await yetkiGerekli();
  const id = kimlik(f);
  const tid = kimlik(f, "turnuva_id");
  const sql = await db();
  await sql`delete from oyuncu o using takim k where o.id = ${id} and k.id = o.takim_id and k.turnuva_id = ${tid}`;
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
