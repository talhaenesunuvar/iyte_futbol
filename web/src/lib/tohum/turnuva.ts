import "server-only";
import type postgres from "postgres";
import { GRUP_HARF, elemeEslesme, grupFiksturu, kaybeden, kazanan, puanDurumu, type Asama, type Mac, type Takim } from "../turnuva-hesap";

// Ornek "İYTE Cup 2026 Güz": 32 takim (renk + 7 kisilik kadro), 8 grup, grup maclari, finale kadar eleme ve 3.luk maci oynanmis; gollerin ~%60'i asistli.
// Tamamen deterministik (tohumlu PRNG); her kurulumda ayni sonuclar.

const TAKIMLAR = [
  "Makine FK", "Kimya Kartalları", "Fizik Atomspor", "Mimarlık United", "Bilgisayar Byte FK", "Elektrik Voltspor", "İnşaat Betonspor", "Matematik Sigma",
  "Moleküler Biyoloji FK", "Gıda Mühendisliği", "Malzeme Alaşımspor", "Çevre Yeşilspor", "Biyomühendislik FK", "Fotonik Işıkspor", "Enerji Sistemleri", "Şehir Planlama FK",
  "Endüstriyel Tasarım", "Restorasyon Taşspor", "Kimya Müh. Reaktör", "Kuzey Yurdu", "Güney Yurdu", "Kampüs Gücü", "Urla Rüzgarı", "Gülbahçe FK",
  "Teknopark Ajax", "Kütüphane Gece Kuşları", "Hazırlık Çaylakları", "Doktora Veteranları", "Yüksek Lisans FK", "Kafeterya Spor", "Rektörlük Yokuşu", "Liman Spor",
];
// Ornek takim renkleri (deterministik; panelden degisir)
export const RENKLER = ["#8B151A", "#1F4E8C", "#2E7D32", "#F2A900", "#6A1B9A", "#00838F", "#D84315", "#37474F",
  "#C2185B", "#5D4037", "#1565C0", "#558B2F", "#EF6C00", "#4527A0", "#00695C", "#AD1457"];
export const NUMARALAR = [1, 4, 5, 7, 8, 9, 10, 11, 14, 17];
export const AD = ["Ahmet", "Mehmet", "Emre", "Can", "Burak", "Kerem", "Mert", "Arda", "Yiğit", "Egemen", "Oğuz", "Barış", "Kaan", "Onur", "Deniz", "Efe", "Tolga", "Umut", "Serkan", "Berk", "Alp", "Eren", "Furkan", "Tuna"];
export const SOYAD = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Öztürk", "Aydın", "Arslan", "Doğan", "Koç", "Kurt", "Özkan", "Polat", "Erdem", "Aksoy", "Güneş", "Tekin", "Ünal", "Karaca", "Yıldız", "Bulut", "Korkmaz", "Sarı", "Acar"];

export const ORNEK_KURALLAR = `Maçlar 2 × 40 dakika, toplam 80 dakika oynanır; devre arası 10 dakikadır.
Her takım maç başına en fazla 5 oyuncu değişikliği yapabilir.
32 takım 4 torbadan kurayla 8 gruba ayrılır; her grupta tek devre lig usulü oynanır.
Galibiyet 3, beraberlik 1, mağlubiyet 0 puan. Eşitlikte averaj, sonra atılan gol bakılır.
Her gruptan ilk 2 takım (16 takım) son 16'ya kalır.
Son 16'dan itibaren tek maç eleme: rövanş yok, ikinci şans yok, kaybeden elenir.
Eleme maçlarında beraberlikte doğrudan seri penaltı atışları yapılır.
Kadrolar yalnızca İYTE öğrencilerinden oluşur; başvuruda okul e-postası zorunludur.`;

export function prng(tohum: number) {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ornek hakemler (gecis v3 de kullanir)
export const HAKEMLER = ["Serkan Aydın", "Murat Kılıç", "Elif Doğan", "Burak Şahin", "Ozan Yurt", "Deniz Acar"];

export async function tohumTurnuva(sql: postgres.Sql) {
  const r = prng(2026);
  const sec = <T,>(l: T[]) => l[Math.floor(r() * l.length)];
  const golSay = () => { const x = r(); return x < 0.18 ? 0 : x < 0.45 ? 1 : x < 0.7 ? 2 : x < 0.87 ? 3 : x < 0.96 ? 4 : 5; };
  // Istanbul saatiyle ISO (UTC+3)
  const zaman = (gun: number, saat: number) => new Date(Date.UTC(2026, 10, gun, saat - 3, 0)).toISOString();

  const [t] = await sql<{ id: number }[]>`
    insert into turnuva (ad, sezon, durum, aciklama, kurallar, kontenjan, basvuru_acik, aktif, ornek)
    values ('İYTE Cup', '2026 Güz', 'bitti',
      'Kampüsün en büyük futbol turnuvası. 32 takım, 8 grup, tek maç eleme. Sahaya çık, tarih yaz!',
      ${ORNEK_KURALLAR}, 32, false, true, true)
    returning id`;
  const tid = t.id;

  const takimSatir = TAKIMLAR.map((ad, i) => ({ turnuva_id: tid, ad, grup: GRUP_HARF[i % 8], torba: Math.floor(i / 8) + 1, renk: RENKLER[i % RENKLER.length] }));
  const takimlar = await sql<Takim[]>`insert into takim ${sql(takimSatir, "turnuva_id", "ad", "grup", "torba", "renk")} returning id, ad, grup, torba, renk, null as logo_v`;
  // Her takima 7 kisilik deterministik kadro (takim icinde ad tekrari yok); ilk iki oyuncu daha golcu
  const kadro = new Map<number, string[]>(takimlar.map((k) => {
    const l: string[] = [];
    while (l.length < 7) { const a = `${sec(AD)} ${sec(SOYAD)}`; if (!l.includes(a)) l.push(a); }
    return [k.id, l];
  }));
  const oyuncuSatir = takimlar.flatMap((k) => kadro.get(k.id)!.map((ad, i) => ({ takim_id: k.id, ad, numara: NUMARALAR[i] })));
  const oyuncuId = new Map((await sql<{ id: number; takim_id: number; ad: string }[]>`insert into oyuncu ${sql(oyuncuSatir, "takim_id", "ad", "numara")} returning id, takim_id, ad`)
    .map((o) => [`${o.takim_id}|${o.ad}`, o.id]));
  const golcu = (tk: number) => { const l = kadro.get(tk)!; const x = r(); return x < 0.3 ? l[0] : x < 0.5 ? l[1] : l[2 + Math.floor(r() * 5)]; };
  // %60 asistli; asist golu atandan farkli bir takim arkadasi
  const asistci = (tk: number, golAtan: string) => {
    if (r() > 0.6) return "";
    const l = kadro.get(tk)!.filter((a) => a !== golAtan);
    return l[Math.floor(r() * l.length)];
  };

  type Yeni = Omit<Mac, "id"> & { turnuva_id: number };
  const hakem = () => HAKEMLER[Math.floor(r() * HAKEMLER.length)];
  const maclar: Yeni[] = [];
  const goller: { anahtar: string; takim_id: number; oyuncu: string; asist: string; dakika: number }[] = [];
  const anahtar = (m: { asama: string; grup: string | null; sira: number }) => `${m.asama}|${m.grup ?? ""}|${m.sira}`;
  const golYaz = (m: Yeni) => {
    const dk = (n: number) => Array.from({ length: n }, () => 1 + Math.floor(r() * 80));
    const ekle = (tk: number, d: number) => { const o = golcu(tk); goller.push({ anahtar: anahtar(m), takim_id: tk, oyuncu: o, asist: asistci(tk, o), dakika: d }); };
    for (const d of dk(m.ev_gol!)) ekle(m.ev_id!, d);
    for (const d of dk(m.dep_gol!)) ekle(m.dep_id!, d);
  };

  // Grup maclari: 2-13 Kasim
  GRUP_HARF.slice(0, 8).forEach((g, gi) => {
    const ids = takimlar.filter((k) => k.grup === g).map((k) => k.id);
    grupFiksturu(ids).forEach(([ev, dep], i) => {
      const m: Yeni = {
        turnuva_id: tid, asama: "grup", grup: g, sira: i + 1, ev_id: ev, dep_id: dep,
        zaman: zaman(2 + Math.floor(i / 2) * 4 + (gi % 4), 17 + (gi % 2) * 2 + (i % 2)), saha: "Kampüs sahası",
        ev_gol: golSay(), dep_gol: golSay(), ev_pen: null, dep_pen: null, canli: false, hakem: hakem(),
      };
      golYaz(m);
      maclar.push(m);
    });
  });

  // Eleme: son16 14-15 Kas, ceyrek 17, yari 19, final 21. Kazananlar sirayla bir sonraki turun ciftlerini kurar.
  const puan = puanDurumu(takimlar, maclar.map((m, i) => ({ ...m, id: -i - 1 })));
  const es = elemeEslesme(puan);
  if ("hata" in es) throw new Error(es.hata);
  const gunler: Record<string, number[]> = { son16: [14, 14, 14, 14, 15, 15, 15, 15], ceyrek: [17, 17, 17, 17], yari: [19, 19], final: [21] };
  let tur: [number, number][] = es.ciftler;
  let yariKaybeden: (number | null)[] = [];
  for (const asama of ["son16", "ceyrek", "yari", "final"] as Asama[]) {
    const galip: number[] = [];
    tur.forEach(([ev, dep], i) => {
      const sira = i + 1;
      let eg = Math.min(golSay(), 3);
      let dg = Math.min(golSay(), 3);
      // Penaltili maclar yalnizca son16 #3 ve final; diger beraberlikler bir golle bozulur
      const penalti = (asama === "son16" && sira === 3) || asama === "final";
      if (penalti) dg = eg;
      else if (eg === dg) { if (sira % 2) eg++; else dg++; }
      const m: Yeni = {
        turnuva_id: tid, asama, grup: null, sira, ev_id: ev, dep_id: dep,
        zaman: zaman(gunler[asama][i], asama === "final" ? 20 : 17 + (i % 4)), saha: "Kampüs sahası",
        ev_gol: eg, dep_gol: dg, ev_pen: null, dep_pen: null, canli: false, hakem: hakem(),
      };
      if (eg === dg) { m.ev_pen = asama === "final" ? 5 : 3; m.dep_pen = asama === "final" ? 4 : 5; }
      golYaz(m);
      maclar.push(m);
      galip.push(kazanan({ ...m, id: 0 })!);
      if (asama === "yari") yariKaybeden.push(kaybeden({ ...m, id: 0 }));
    });
    // 3.luk maci: yari finalde kaybedenler, finalden once (21 Kas 17.00), penaltisiz
    if (asama === "yari" && yariKaybeden.length === 2) {
      const u: Yeni = {
        turnuva_id: tid, asama: "ucuncu", grup: null, sira: 1, ev_id: yariKaybeden[0], dep_id: yariKaybeden[1],
        zaman: zaman(21, 17), saha: "Kampüs sahası", ev_gol: 2, dep_gol: 1, ev_pen: null, dep_pen: null, canli: false, hakem: hakem(),
      };
      golYaz(u);
      maclar.push(u);
      yariKaybeden = [];
    }
    tur = [];
    for (let i = 0; i + 1 < galip.length; i += 2) tur.push([galip[i], galip[i + 1]]);
  }

  const eklenen = await sql<{ id: number; asama: string; grup: string | null; sira: number }[]>`
    insert into mac ${sql(maclar, "turnuva_id", "asama", "grup", "sira", "ev_id", "dep_id", "zaman", "saha", "ev_gol", "dep_gol", "ev_pen", "dep_pen", "hakem")}
    returning id, asama, grup, sira`;
  const idBul = new Map(eklenen.map((m) => [anahtar(m), m.id]));
  const golSatir = goller.map((g) => ({
    mac_id: idBul.get(g.anahtar)!, takim_id: g.takim_id, oyuncu: g.oyuncu, dakika: g.dakika,
    oyuncu_id: oyuncuId.get(`${g.takim_id}|${g.oyuncu}`) ?? null, asist: g.asist, asist_id: g.asist ? oyuncuId.get(`${g.takim_id}|${g.asist}`) ?? null : null,
  }));
  if (golSatir.length) await sql`insert into gol ${sql(golSatir, "mac_id", "takim_id", "oyuncu", "dakika", "oyuncu_id", "asist", "asist_id")}`;
}
