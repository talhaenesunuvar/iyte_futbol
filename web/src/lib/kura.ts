// Kura cekimi saf hesaplari (Derin, 2026-11-24): kayitli cekim sirasini mevcut gruplarla uzlastirir,
// deneme kurasi uretir. Veritabanina dokunmaz; hem sunucu sayfasi hem istemci animasyonu kullanir.
import { GRUP_HARF, type Takim } from "./turnuva-hesap";

// Bir cekim adimi: torbadan cikan takim ve gittigi grup. turnuva.kura bu dizinin JSON'u.
export type KuraAdim = { takim_id: number; torba: number | null; grup: string };
export type KuraTakim = Pick<Takim, "id" | "ad" | "torba" | "grup" | "logo_v" | "renk">;

// Grup sayisi: panel kurasi ile ayni kural (kontenjan / 4, 1..16)
export const grupSayisi = (kontenjan: number) => Math.min(GRUP_HARF.length, Math.max(1, Math.round(kontenjan / 4)));

// turnuva.kura metnini guvenle cozer; bozuk kayit null
export function kuraCoz(ham: string | null | undefined): KuraAdim[] | null {
  if (!ham) return null;
  try {
    const v: unknown = JSON.parse(ham);
    if (!Array.isArray(v)) return null;
    const l: KuraAdim[] = [];
    for (const x of v) {
      if (!x || typeof x !== "object") continue;
      const { takim_id, torba, grup } = x as Record<string, unknown>;
      if (typeof takim_id !== "number" || typeof grup !== "string") continue;
      l.push({ takim_id, torba: typeof torba === "number" ? torba : null, grup });
    }
    return l.length ? l : null;
  } catch {
    return null;
  }
}

// Torba sirasi: 1, 2, 3, ... torbasizlar en sonda
const torbaSira = (p: number | null) => (p === null ? Number.MAX_SAFE_INTEGER : p);

// Animasyonun oynatacagi sira. Esas olan takimlarin BUGUNKU grubu ve torbasidir:
// - kayitli siradaki takim silindiyse ya da artik grubu yoksa adim atlanir,
// - kuradan sonra panelden grubu/torbasi degistiyse adim mevcut degerle oynar,
// - grubu olup kayitta olmayan takimlar (kuradan sonra eklenen) sona eklenir.
// Boylece animasyon bittiginde gruplar takim.grup ile birebir aynidir.
export function kuraUzlastir(kayit: KuraAdim[] | null, takimlar: KuraTakim[]): { adimlar: KuraAdim[]; kayitli: boolean } {
  const tk = new Map(takimlar.map((t) => [t.id, t]));
  const goruldu = new Set<number>();
  const adimlar: KuraAdim[] = [];
  for (const a of kayit ?? []) {
    const t = tk.get(a.takim_id);
    if (!t || !t.grup || goruldu.has(t.id)) continue;
    goruldu.add(t.id);
    adimlar.push({ takim_id: t.id, torba: t.torba, grup: t.grup });
  }
  const kayitli = adimlar.length > 0;
  const kalan = takimlar
    .filter((t) => t.grup && !goruldu.has(t.id))
    .sort((a, b) => torbaSira(a.torba) - torbaSira(b.torba) || a.grup!.localeCompare(b.grup!) || a.ad.localeCompare(b.ad, "tr"));
  for (const t of kalan) adimlar.push({ takim_id: t.id, torba: t.torba, grup: t.grup! });
  // Torba degisikligi sirayi bozduysa torba torba diz (ayni torbada kayitli sira korunur; sort kararlidir)
  adimlar.sort((a, b) => torbaSira(a.torba) - torbaSira(b.torba));
  return { adimlar, kayitli };
}

// Kura uretimi: panel kurasi (sunucu, crypto randomInt) ve deneme kurasi (istemci, KAYDEDILMEZ) ayni kurali kullanir.
// Torba torba, takimlar rastgele sirayla cekilir; her takim bu torbadan henuz takim almamis gruplardan
// (esitlikte en az takimi olanlardan) rastgele birine gider. Torbasiz takimlar en sonda, en bos gruplara.
// rastgele(n): 0..n-1 arasi tamsayi.
export function kuraUret(takimlar: { id: number; torba: number | null }[], harfler: string[], rastgele: (n: number) => number): KuraAdim[] {
  const G = harfler.length;
  const say = new Array(G).fill(0);
  const sira: KuraAdim[] = [];
  const karistir = <T,>(l: T[]) => {
    const a = [...l];
    for (let i = a.length - 1; i > 0; i--) { const j = rastgele(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const sec = (aday: number[]) => {
    const en = Math.min(...aday.map((g) => say[g]));
    const uygun = aday.filter((g) => say[g] === en);
    return uygun[rastgele(uygun.length)];
  };
  const torbalar = [...new Set(takimlar.map((t) => t.torba).filter((x): x is number => x !== null))].sort((a, b) => a - b);
  for (const p of torbalar) {
    let alan = new Set<number>();
    for (const t of karistir(takimlar.filter((x) => x.torba === p))) {
      if (alan.size === G) alan = new Set();
      const g = sec([...Array(G).keys()].filter((i) => !alan.has(i)));
      alan.add(g);
      say[g]++;
      sira.push({ takim_id: t.id, torba: p, grup: harfler[g] });
    }
  }
  for (const t of karistir(takimlar.filter((x) => x.torba === null))) {
    const g = sec([...Array(G).keys()]);
    say[g]++;
    sira.push({ takim_id: t.id, torba: null, grup: harfler[g] });
  }
  return sira;
}
