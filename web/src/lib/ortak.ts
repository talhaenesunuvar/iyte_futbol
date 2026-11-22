// Ortak yardimcilar: ornek veri, menu, sinir/ara, gorunurluk, 3B top cizimi.
// Prototipteki tasarimlar/ortak/ortak.js'in TypeScript karsiligi.

// Menu. # bolumleri ana sayfada; BOLUMLU sayfalarda sayfa ici baglanti (yumusak kaydirma), digerlerinde "/#..." ile ana sayfaya gider.
export const MENU: [string, string][] = [
  ["Ana Sayfa", "/"],
  ["Hakkımızda", "/#hakkimizda"],
  ["Etkinlikler", "/#etkinlikler"],
  ["Turnuva", "/turnuva"],
  ["Forma", "/forma"],
  ["Sahalar", "/sahalar"],
  ["İletişim", "/#iletisim"],
];
// Hakkimizda/Etkinlikler/Iletisim bolumlerini iceren sayfalar (ana sayfa, Skorbord)
export const BOLUMLU = new Set(["/", "/skorbord"]);

export type Olay = { gun: string; ay: string; kisa: string; hafta: string; ad: string; ust: string; tur: string; yer: string; saat: string };

// Ornek icerik. Gercek etkinlikler FastAPI'den gelecek.
export const OLAYLAR: Olay[] = [
  { gun: "14", ay: "Kasım", kisa: "14 KAS", hafta: "Cumartesi", ad: "Kampüs Turnuvası", ust: "KAMPÜS TURNUVASI", tur: "Turnuva", yer: "Kampüs sahası", saat: "14.00" },
  { gun: "21", ay: "Kasım", kisa: "21 KAS", hafta: "Cumartesi", ad: "Derbi İzleme", ust: "DERBİ İZLEME", tur: "Buluşma", yer: "Kampüs kafe", saat: "19.00" },
  { gun: "28", ay: "Kasım", kisa: "28 KAS", hafta: "Cumartesi", ad: "Yeni Üye Maçı", ust: "YENİ ÜYE MAÇI", tur: "Maç", yer: "Kampüs sahası", saat: "16.00" },
];

export const sinir = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const ara = (a: number, b: number, t: number) => a + (b - a) * t;

export function gorunurken(el: Element, cb: (g: boolean) => void) {
  const io = new IntersectionObserver((es) => cb(es[0].isIntersecting), { threshold: 0 });
  io.observe(el);
  return io;
}

// Kaydirinca beliren .r ogeleri. Temizleme fonksiyonu dondurur.
export function beliren(kok: ParentNode, azalt: boolean) {
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
    { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
  );
  kok.querySelectorAll(".r").forEach((e) => (azalt ? e.classList.add("in") : io.observe(e)));
  return () => io.disconnect();
}

// Kesik ikosahedron: 12 besgen, koselerden ucte birlik kesimle.
type V3 = [number, number, number];
const P = (1 + Math.sqrt(5)) / 2;
const nrm = (a: number[]): V3 => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
const V: V3[] = ([[-1, P, 0], [1, P, 0], [-1, -P, 0], [1, -P, 0], [0, -1, P], [0, 1, P], [0, -1, -P], [0, 1, -P], [P, 0, -1], [P, 0, 1], [-P, 0, -1], [-P, 0, 1]] as V3[]).map(nrm);
const E: [number, number][] = [];
const KOM: number[][] = V.map(() => []);
V.forEach((a, i) => V.forEach((b, j) => {
  if (i < j && Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1.2) { E.push([i, j]); KOM[i].push(j); KOM[j].push(i); }
}));
const ara3 = (a: V3, b: V3, t: number) => nrm([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
const BES = V.map((v, i) => {
  const k = KOM[i].map((j) => ara3(v, V[j], 1 / 3));
  const u = nrm([k[0][0] - v[0], k[0][1] - v[1], k[0][2] - v[2]]);
  const w = [v[1] * u[2] - v[2] * u[1], v[2] * u[0] - v[0] * u[2], v[0] * u[1] - v[1] * u[0]];
  const aci = (a: V3) => Math.atan2(a[0] * w[0] + a[1] * w[1] + a[2] * w[2], a[0] * u[0] + a[1] * u[1] + a[2] * u[2]);
  return k.sort((a, b) => aci(a) - aci(b));
});

export function topCiz(
  x: CanvasRenderingContext2D, cx: number, cy: number, r: number, ax: number, ay: number,
  o: { zemin?: string; mur?: string; dikis?: string; duz?: boolean } = {},
) {
  const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay);
  const don = (p: V3): V3 => { const X = p[0] * cb + p[2] * sb, Z = -p[0] * sb + p[2] * cb, Y = p[1] * ca - Z * sa; return [X, Y, p[1] * sa + Z * ca]; };
  x.save();
  x.beginPath(); x.arc(cx, cy, r, 0, 6.2832);
  x.fillStyle = o.zemin || "#fff"; x.fill(); x.clip();
  x.fillStyle = o.mur || "#1A1A1A"; x.strokeStyle = o.dikis || "#1A1A1A"; x.lineWidth = Math.max(1, r * 0.022); x.lineJoin = "round";
  BES.forEach((k) => {
    const t = k.map(don), z = (t[0][2] + t[1][2] + t[2][2] + t[3][2] + t[4][2]) / 5;
    if (z < -0.15) return;
    x.beginPath();
    t.forEach((p, i) => (i ? x.lineTo(cx + p[0] * r, cy + p[1] * r) : x.moveTo(cx + p[0] * r, cy + p[1] * r)));
    x.closePath(); x.fill(); x.stroke();
  });
  E.forEach((e) => {
    const a = don(ara3(V[e[0]], V[e[1]], 1 / 3)), b = don(ara3(V[e[1]], V[e[0]], 1 / 3));
    if (a[2] < 0 || b[2] < 0) return;
    x.beginPath(); x.moveTo(cx + a[0] * r, cy + a[1] * r); x.lineTo(cx + b[0] * r, cy + b[1] * r); x.stroke();
  });
  if (!o.duz) {
    const g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.05);
    g.addColorStop(0, "rgba(255,255,255,.0)"); g.addColorStop(0.7, "rgba(26,26,26,.04)"); g.addColorStop(1, "rgba(26,26,26,.34)");
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  x.restore();
}

// "Bize ulas" butonlari WhatsApp sohbetine gider
export const WHATSAPP = "https://wa.me/905511378177";
