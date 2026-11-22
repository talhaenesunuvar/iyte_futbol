import "server-only";
import type postgres from "postgres";
import { GRUP_HARF, elemeEslesme, grupFiksturu, kazanan, puanDurumu, type Asama, type Mac, type Takim } from "../turnuva-hesap";

// Ornek "İYTE Cup 2026 Güz": 32 takim, 8 grup, grup maclari ve finale kadar eleme oynanmis.
// Tamamen deterministik (tohumlu PRNG); her kurulumda ayni sonuclar.

const TAKIMLAR = [
  "Makine FK", "Kimya Kartalları", "Fizik Atomspor", "Mimarlık United", "Bilgisayar Byte FK", "Elektrik Voltspor", "İnşaat Betonspor", "Matematik Sigma",
  "Moleküler Biyoloji FK", "Gıda Mühendisliği", "Malzeme Alaşımspor", "Çevre Yeşilspor", "Biyomühendislik FK", "Fotonik Işıkspor", "Enerji Sistemleri", "Şehir Planlama FK",
  "Endüstriyel Tasarım", "Restorasyon Taşspor", "Kimya Müh. Reaktör", "Kuzey Yurdu", "Güney Yurdu", "Kampüs Gücü", "Urla Rüzgarı", "Gülbahçe FK",
  "Teknopark Ajax", "Kütüphane Gece Kuşları", "Hazırlık Çaylakları", "Doktora Veteranları", "Yüksek Lisans FK", "Kafeterya Spor", "Rektörlük Yokuşu", "Liman Spor",
];
const AD = ["Ahmet", "Mehmet", "Emre", "Can", "Burak", "Kerem", "Mert", "Arda", "Yiğit", "Egemen", "Oğuz", "Barış", "Kaan", "Onur", "Deniz", "Efe", "Tolga", "Umut", "Serkan", "Berk", "Alp", "Eren", "Furkan", "Tuna"];
const SOYAD = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Öztürk", "Aydın", "Arslan", "Doğan", "Koç", "Kurt", "Özkan", "Polat", "Erdem", "Aksoy", "Güneş", "Tekin", "Ünal", "Karaca", "Yıldız", "Bulut", "Korkmaz", "Sarı", "Acar"];

export const ORNEK_KURALLAR = `Maçlar 2 × 40 dakika, toplam 80 dakika oynanır; devre arası 10 dakikadır.
Her takım maç başına en fazla 5 oyuncu değişikliği yapabilir.
32 takım 4 torbadan kurayla 8 gruba ayrılır; her grupta tek devre lig usulü oynanır.
Galibiyet 3, beraberlik 1, mağlubiyet 0 puan. Eşitlikte averaj, sonra atılan gol bakılır.
Her gruptan ilk 2 takım (16 takım) son 16'ya kalır.
Son 16'dan itibaren tek maç eleme: rövanş yok, ikinci şans yok, kaybeden elenir.
Eleme maçlarında beraberlikte doğrudan seri penaltı atışları yapılır.
Kadrolar yalnızca İYTE öğrencilerinden oluşur; başvuruda okul e-postası zorunludur.`;

function prng(tohum: number) {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

  const takimSatir = TAKIMLAR.map((ad, i) => ({ turnuva_id: tid, ad, grup: GRUP_HARF[i % 8], torba: Math.floor(i / 8) + 1 }));
  const takimlar = await sql<Takim[]>`insert into takim ${sql(takimSatir, "turnuva_id", "ad", "grup", "torba")} returning id, ad, grup, torba`;
  // Her takima 7 kisilik deterministik kadro; ilk iki oyuncu daha golcu
  const kadro = new Map<number, string[]>(takimlar.map((k) => [k.id, Array.from({ length: 7 }, () => `${sec(AD)} ${sec(SOYAD)}`)]));
  const golcu = (tk: number) => { const l = kadro.get(tk)!; const x = r(); return x < 0.3 ? l[0] : x < 0.5 ? l[1] : l[2 + Math.floor(r() * 5)]; };

  type Yeni = Omit<Mac, "id"> & { turnuva_id: number };
  const maclar: Yeni[] = [];
  const goller: { anahtar: string; takim_id: number; oyuncu: string; dakika: number }[] = [];
  const anahtar = (m: { asama: string; grup: string | null; sira: number }) => `${m.asama}|${m.grup ?? ""}|${m.sira}`;
  const golYaz = (m: Yeni) => {
    const dk = (n: number) => Array.from({ length: n }, () => 1 + Math.floor(r() * 80));
    for (const d of dk(m.ev_gol!)) goller.push({ anahtar: anahtar(m), takim_id: m.ev_id!, oyuncu: golcu(m.ev_id!), dakika: d });
    for (const d of dk(m.dep_gol!)) goller.push({ anahtar: anahtar(m), takim_id: m.dep_id!, oyuncu: golcu(m.dep_id!), dakika: d });
  };

  // Grup maclari: 2-13 Kasim
  GRUP_HARF.slice(0, 8).forEach((g, gi) => {
    const ids = takimlar.filter((k) => k.grup === g).map((k) => k.id);
    grupFiksturu(ids).forEach(([ev, dep], i) => {
      const m: Yeni = {
        turnuva_id: tid, asama: "grup", grup: g, sira: i + 1, ev_id: ev, dep_id: dep,
        zaman: zaman(2 + Math.floor(i / 2) * 4 + (gi % 4), 17 + (gi % 2) * 2 + (i % 2)), saha: "Kampüs sahası",
        ev_gol: golSay(), dep_gol: golSay(), ev_pen: null, dep_pen: null,
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
        ev_gol: eg, dep_gol: dg, ev_pen: null, dep_pen: null,
      };
      if (eg === dg) { m.ev_pen = asama === "final" ? 5 : 3; m.dep_pen = asama === "final" ? 4 : 5; }
      golYaz(m);
      maclar.push(m);
      galip.push(kazanan({ ...m, id: 0 })!);
    });
    tur = [];
    for (let i = 0; i + 1 < galip.length; i += 2) tur.push([galip[i], galip[i + 1]]);
  }

  const eklenen = await sql<{ id: number; asama: string; grup: string | null; sira: number }[]>`
    insert into mac ${sql(maclar, "turnuva_id", "asama", "grup", "sira", "ev_id", "dep_id", "zaman", "saha", "ev_gol", "dep_gol", "ev_pen", "dep_pen")}
    returning id, asama, grup, sira`;
  const idBul = new Map(eklenen.map((m) => [anahtar(m), m.id]));
  const golSatir = goller.map((g) => ({ mac_id: idBul.get(g.anahtar)!, takim_id: g.takim_id, oyuncu: g.oyuncu, dakika: g.dakika }));
  if (golSatir.length) await sql`insert into gol ${sql(golSatir, "mac_id", "takim_id", "oyuncu", "dakika")}`;
}
