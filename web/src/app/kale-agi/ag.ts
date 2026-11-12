// Kale agi simulasyonu: dalga denklemiyle esneyen ag, 3B top, tutup firlatma.
// Prototipteki 01-kale-agi.html icindeki Ag fonksiyonunun TypeScript karsiligi.
import { Yay, izdusum, lastik, tut, titre, azaltilmis } from "@/lib/akici";
import { ara, gorunurken, sinir, topCiz } from "@/lib/ortak";

type Top = {
  ev: "hazir" | "ucus" | "dusus" | "tut" | "donus";
  x: number; y: number; r: number; ax: number; ay: number; vx: number; vy: number;
  d: number; T: number; g?: number; r0?: number; r1?: number; guc?: number; kul?: boolean; al?: number; bY?: Yay;
};

export type AgSecenek = {
  ink: string; a: number; mur?: string; direk?: string; oto?: boolean; tut?: boolean;
  tutamak?: HTMLElement | null; ortu?: HTMLElement | null;
  vur?: (guc: number, kul: boolean) => void;
};

export function agKur(c: HTMLCanvasElement, o: AgSecenek) {
  const azalt = azaltilmis();
  let T!: { x: CanvasRenderingContext2D; w: number; h: number };
  let s = 34, cols = 0, rows = 0, z = new Float32Array(0), v = new Float32Array(0);
  let top: Top | null = null;
  const dus: Top[] = [];
  let cal = false, son = 0, hic = true, sonOto = 0, gorunur = true, bitti = false;
  let otoZam: ReturnType<typeof setTimeout> | undefined;
  // Bu enerjinin altinda ag zaten onbellekten (hareketsiz) ciziliyor (bkz. ciz); fizik ve dongu de durur.
  // Eskiden 0.02'ydi: gozle gorulmez titresim icin sut basina 2 sn fazladan 60 fps cizim vardi.
  const DURGUN = 0.8;
  const tuton = o.tutamak || null;
  let xY: Yay | null = null, yY: Yay | null = null, bellek: HTMLCanvasElement | null = null, enerji = 0, pX = 0, pY = 0;
  const temizle: (() => void)[] = [];

  function kur() {
    const r = c.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 1.5);
    c.width = Math.round(r.width * d); c.height = Math.round(r.height * d);
    const x = c.getContext("2d")!; x.setTransform(d, 0, 0, d, 0, 0); T = { x, w: r.width, h: r.height };
    s = T.w < 700 ? 26 : 34; cols = Math.ceil(T.w / s) + 2; rows = Math.ceil(T.h / s) + 2;
    z = new Float32Array(cols * rows); v = new Float32Array(cols * rows);
    bellek = document.createElement("canvas"); bellek.width = c.width; bellek.height = c.height;
    const q = bellek.getContext("2d")!; q.setTransform(d, 0, 0, d, 0, 0); agCiz(q);
    if (o.tut) hazirla(true);
  }
  function ev() { const d = T.w < 760; return { x: T.w * 0.8, y: T.h * (d ? 0.34 : 0.56), r: d ? 40 : 64 }; }
  function hazirla(hemen: boolean) {
    const e = ev();
    const t: Top = { ev: "hazir", x: e.x, y: e.y, r: e.r, ax: 0.4, ay: 0.2, vx: 0, vy: 0, d: 0, T: 0.4, g: hemen ? 1 : 0 };
    t.bY = new Yay(hemen ? 1 : 0, { response: 0.4, damping: 1, eps: 0.004, on: (x) => { t.g = x; baslat(); } });
    top = t;
    if (!hemen) t.bY.hedef(1);
    if (tuton) tuton.style.cssText = `left:${e.x - e.r - 12}px;top:${e.y - e.r - 12}px;width:${e.r * 2 + 24}px;height:${e.r * 2 + 24}px`;
  }
  function adim() {
    for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
      const i = y * cols + x;
      v[i] += (z[i - 1] + z[i + 1] + z[i - cols] + z[i + cols] - 4 * z[i]) * 0.24 - z[i] * 0.014; v[i] *= 0.972;
    }
    for (let i = 0; i < z.length; i++) z[i] += v[i];
  }
  function px(x: number, y: number, i: number) { const k = 1 - z[i] * 0.0017, cx = T.w / 2, cy = T.h * 0.42, X = x * s; pX = cx + (X - cx) * k; pY = cy + (y * s - cy) * k + z[i] * 0.32; }
  function cap(x: CanvasRenderingContext2D, i: number, j: number, di: number) {
    let ilk = true;
    while (i >= 0 && i < cols && j < rows) { px(i, j, j * cols + i); if (ilk) { x.moveTo(pX, pY); ilk = false; } else x.lineTo(pX, pY); i += di; j++; }
  }
  function agCiz(x: CanvasRenderingContext2D) {
    x.strokeStyle = o.ink; x.lineWidth = 1; x.globalAlpha = o.a; x.beginPath();
    for (let i = 0; i < cols; i++) { cap(x, i, 0, 1); cap(x, i, 0, -1); }
    for (let j = 1; j < rows; j++) { cap(x, 0, j, 1); cap(x, cols - 1, j, -1); }
    x.stroke(); x.globalAlpha = 1;
  }
  // Hizli top yonunde hafifce uzar: sert bir cizgi yerine hizi anlatir.
  function topunuCiz(b: Top, alfa?: number) {
    const x = T.x, h = Math.hypot(b.vx, b.vy), k = Math.min(0.16, h / 11000), a = Math.atan2(b.vy, b.vx), g = b.g == null ? 1 : b.g, r = b.r * g;
    if (r < 1) return;
    x.save(); x.globalAlpha = alfa == null ? 1 : alfa; x.translate(b.x, b.y); x.rotate(a); x.scale(1 + k, 1 - k); x.rotate(-a);
    topCiz(x, 0, 0, r, b.ax, b.ay, { mur: o.mur || "#8B151A", dikis: "#1A1A1A" }); x.restore();
  }
  function ciz() {
    const x = T.x; x.clearRect(0, 0, T.w, T.h);
    dus.forEach((b) => topunuCiz(b, b.al));
    if (enerji < 0.8 && bellek) x.drawImage(bellek, 0, 0, T.w, T.h); else agCiz(x);
    if (o.direk) {
      const m = T.w < 700 ? 8 : 14, u = 68 + m / 2, y0 = T.h + m, kr = T.w < 700 ? 20 : 32;
      x.strokeStyle = o.direk; x.lineWidth = m; x.beginPath(); x.moveTo(m / 2, y0);
      x.arcTo(m / 2, u, T.w - m / 2, u, kr); x.arcTo(T.w - m / 2, u, T.w - m / 2, y0, kr); x.lineTo(T.w - m / 2, y0); x.stroke();
    }
    if (top) topunuCiz(top);
  }
  function darbe(tx: number, ty: number, g: number) {
    enerji = Math.max(enerji, 1);
    const gx = tx / s, gy = ty / s, R = 5;
    for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
      const X = Math.round(gx) + i, Y = Math.round(gy) + j;
      if (X < 1 || Y < 1 || X >= cols - 1 || Y >= rows - 1) continue;
      v[Y * cols + X] += g * Math.exp(-(i * i + j * j) / 7);
    }
  }
  // Ucus her an yeniden yonlenebilir: yeni hedef, topun o anki konumundan hesaplanir.
  function firlat(tx: number, ty: number, sure: number, guc: number, kul: boolean) {
    pasifSifirla();
    if (xY && yY) { xY.acik = false; yY.acik = false; }
    if (!top || top.ev === "dusus") {
      if (o.tut) hazirla(true);
      else top = { ev: "hazir", x: T.w * 0.5 + (tx - T.w * 0.5) * 0.3, y: T.h + 90, r: Math.min(T.w, T.h) * 0.2, ax: 0, ay: 0, vx: 0, vy: 0, d: 0, T: 0.4, g: 1 };
    }
    const t = top!;
    if (t.ev !== "ucus") { t.ev = "ucus"; t.d = 0; t.r0 = t.r; t.r1 = T.w < 700 ? 18 : 26; t.T = sure; }
    const kal = Math.max(0.08, (1 - t.d) * t.T);
    t.vx = (tx - t.x) / kal; t.vy = (ty - t.y) / kal; t.guc = guc; t.kul = kul;
    if (tuton) tuton.style.pointerEvents = "none";
    baslat();
  }
  function vur() {
    const t = top!;
    darbe(t.x, t.y, 46 * (t.guc || 1));
    o.vur?.(t.guc || 1, !!t.kul);
    if (t.kul) titre((t.guc || 1) > 1.1 ? 18 : 10);
    t.ev = "dusus"; t.vy = 120; t.vx *= 0.04; t.al = 1; dus.push(t); top = null;
    if (o.tut) { hazirla(false); if (tuton) tuton.style.pointerEvents = ""; }
  }
  function pasifSifirla() { sonOto = performance.now(); }
  function otoSut() { firlat(T.w * (0.2 + Math.random() * 0.5), T.h * (0.22 + Math.random() * 0.34), 0.46, 1, false); }
  // Kullanici dokunana kadar top 6,5 sn'de bir kendiliginden gider. Bunun icin cizim dongusunu
  // acik tutmak yerine zamanlayici kurulur (pil); sayfa gorunmezken ve bitince iptal edilir.
  function otoPlanla() {
    clearTimeout(otoZam);
    if (!o.oto || !hic || azalt || !gorunur || bitti) return;
    otoZam = setTimeout(() => {
      if (!hic || !gorunur || bitti) return;
      if (!cal && top && top.ev === "hazir") otoSut(); else otoPlanla();
    }, Math.max(200, 6500 - (performance.now() - sonOto)));
  }
  function kare(tm: number) {
    if (!cal || bitti) return;
    const dt = Math.min(0.033, (tm - son) / 1e3 || 0.016); son = tm;
    if (enerji > DURGUN) adim();
    if (top && top.ev === "ucus") {
      top.ax += 0.11; top.ay += 0.07; top.d += dt / top.T; top.x += top.vx * dt; top.y += top.vy * dt;
      const e = Math.min(1, top.d); top.r = ara(top.r0!, top.r1!, 1 - Math.pow(1 - e, 2));
      if (top.d >= 1) vur();
    }
    for (let i = dus.length - 1; i >= 0; i--) {
      const b = dus[i]; b.vy += 900 * dt; b.y += b.vy * dt; b.ax += 0.05; b.vx *= 0.98; b.x += b.vx * dt;
      if (b.y > T.h - b.r) { b.y = T.h - b.r; b.vy *= -0.5; if (Math.abs(b.vy) < 70) b.al! -= dt * 3.2; }
      if (b.al! <= 0) dus.splice(i, 1);
    }
    enerji = 0; for (let i = 0; i < v.length; i += 3) enerji += Math.abs(v[i]);
    if (enerji < DURGUN) { z.fill(0); v.fill(0); }
    ciz();
    const bos = enerji < DURGUN && !dus.length && (!top || top.ev === "hazir") && !(top && top.bY && top.bY.acik);
    if (bos) { cal = false; otoPlanla(); return; }
    requestAnimationFrame(kare);
  }
  function baslat() { if (!cal && !azalt && gorunur && !bitti) { cal = true; son = 0; requestAnimationFrame(kare); } }

  kur(); ciz(); pasifSifirla(); otoPlanla();

  // Sut yalnizca kisa ve yerinde dokunusta (<300 ms, <10 px). Parmak kayarsa bu bir sayfa
  // kaydirmasidir: tarayici pointercancel yollar, sut atilmaz, sayac artmaz, telefon titremez.
  let bX = 0, bY0 = 0, bT = 0, bId = -1;
  const agaBas = (e: PointerEvent) => { if (azalt || e.button !== 0) return; bX = e.clientX; bY0 = e.clientY; bT = e.timeStamp; bId = e.pointerId; };
  const agaBirak = (e: PointerEvent) => {
    if (e.pointerId !== bId) return; bId = -1;
    if (e.timeStamp - bT > 300 || Math.hypot(e.clientX - bX, e.clientY - bY0) > 10) return;
    hic = false;
    const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    darbe(x, y, -5); firlat(x, y, 0.42, 1, true);
  };
  const agaIptal = () => { bId = -1; };
  c.addEventListener("pointerdown", agaBas); c.addEventListener("pointerup", agaBirak); c.addEventListener("pointercancel", agaIptal);
  temizle.push(() => { c.removeEventListener("pointerdown", agaBas); c.removeEventListener("pointerup", agaBirak); c.removeEventListener("pointercancel", agaIptal); });

  if (tuton) {
    let ax = 0, ay = 0, ilk = 0;
    temizle.push(tut(tuton, {
      bas(e) {
        hic = false; if (!top || (top.ev !== "hazir" && top.ev !== "donus")) return;
        // Yaylanirken de yakalanabilir: o anki konumdan devam eder
        if (xY && yY) { xY.acik = false; yY.acik = false; }
        const r = c.getBoundingClientRect(); ax = e.clientX - r.left - top.x; ay = e.clientY - r.top - top.y;
        top.ev = "tut"; top.r *= 1.08; ilk = e.timeStamp; baslat(); pasifSifirla();
      },
      hareket(e) {
        if (!top || top.ev !== "tut") return;
        const r = c.getBoundingClientRect(); top.x = e.clientX - r.left - ax; top.y = e.clientY - r.top - ay; ciz();
      },
      birak(e, vx, vy) {
        if (!top || top.ev !== "tut") return;
        const h = Math.hypot(vx, vy), ev0 = ev(); top.r = ev0.r;
        if (h > 260) {
          let tx = top.x + izdusum(vx, 0.994), ty = top.y + izdusum(vy, 0.994);
          const pad = 40, mx = sinir(tx, pad, T.w - pad), my = sinir(ty, 90, T.h - pad);
          tx = mx + lastik(tx - mx, T.w * 0.2); ty = my + lastik(ty - my, T.h * 0.2);
          top.ev = "hazir"; firlat(tx, ty, sinir(Math.hypot(tx - top.x, ty - top.y) / h, 0.2, 0.5), sinir(0.7 + h / 1500, 0.7, 1.9), true);
        } else if (Math.hypot(top.x - ev0.x, top.y - ev0.y) < 8 && e.timeStamp - ilk < 260) {
          top.x = ev0.x; top.y = ev0.y; top.ev = "hazir"; firlat(T.w * 0.46, T.h * 0.36, 0.42, 1, true);
        } else if (Math.hypot(top.x - ev0.x, top.y - ev0.y) > 40) {
          // Fareyle cogu kisi surukler, durur, birakir. Hiz yok ama niyet belli:
          // top cekildigi yone, cekilen mesafeyle orantili gucte gider.
          const dx = top.x - ev0.x, dy = top.y - ev0.y, m = Math.hypot(dx, dy), uz = sinir(m * 1.6, 120, T.w * 0.5);
          const tx2 = sinir(top.x + (dx / m) * uz, 40, T.w - 40), ty2 = sinir(top.y + (dy / m) * uz, 90, T.h - 40);
          top.ev = "hazir"; firlat(tx2, ty2, 0.38, sinir(0.7 + m / 400, 0.7, 1.6), true);
        } else {
          // Yeterince hizli degilse tutuldugu yerden, birakis hiziyla eve yaylanir
          const b = top;
          const yerine = () => { if (!xY!.acik && !yY!.acik && b.ev === "donus") b.ev = "hazir"; baslat(); };
          b.ev = "donus";
          xY = new Yay(b.x, { response: 0.42, damping: 0.8, eps: 0.2, on: (x) => { b.x = x; yerine(); } });
          yY = new Yay(b.y, { response: 0.42, damping: 0.8, eps: 0.2, on: (y) => { b.y = y; yerine(); } });
          xY.hedef(ev0.x, vx); yY.hedef(ev0.y, vy);
        }
      },
    }));
    // Klavyeyle (Enter/Bosluk) basilinca da sut cekilir
    const klavye = (e: MouseEvent) => { if (e.detail === 0) { hic = false; firlat(T.w * 0.46, T.h * 0.36, 0.42, 1, true); } };
    tuton.addEventListener("click", klavye);
    temizle.push(() => tuton.removeEventListener("click", klavye));
  }

  let zm: ReturnType<typeof setTimeout>;
  const boyut = () => { clearTimeout(zm); zm = setTimeout(() => { kur(); ciz(); }, 140); };
  addEventListener("resize", boyut);
  temizle.push(() => { removeEventListener("resize", boyut); clearTimeout(zm); });

  const gor = (g: boolean) => { gorunur = g; if (g) { baslat(); otoPlanla(); } else { cal = false; clearTimeout(otoZam); } };
  let io: IntersectionObserver;
  if (o.ortu) {
    const isr = document.createElement("i"); isr.style.cssText = "display:block;height:1px"; o.ortu.prepend(isr);
    io = new IntersectionObserver((e) => gor(e[0].isIntersecting), { rootMargin: "0px 0px 99999px 0px" }); io.observe(isr);
    temizle.push(() => isr.remove());
  } else io = gorunurken(c, gor);
  temizle.push(() => io.disconnect());

  return {
    firlat(a: number, b: number, kul?: boolean) { const r = c.getBoundingClientRect(); firlat(r.width * a, r.height * b, 0.46, 1, !!kul); },
    baslat,
    yokEt() {
      bitti = true; cal = false; clearTimeout(otoZam);
      top?.bY?.kes(0); xY?.kes(0); yY?.kes(0);
      temizle.forEach((f) => f());
    },
  };
}
