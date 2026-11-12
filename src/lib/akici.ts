// apple-design skill'inden uyarlama: yay fizigi, hiz devri, momentum izdusumu, lastik sinir, 1:1 tutma.
// Prototipteki tasarimlar/ortak/akici.js'in TypeScript karsiligi. Her baglama bir temizleme fonksiyonu dondurur.

export function azaltilmis(): boolean {
  return typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type YaySecenek = { response?: number; damping?: number; eps?: number; on?: (x: number, v: number) => void };

// Yay: sure yok, tepki suresi (response) ve sonum orani (damping) var.
// Hedef her an degisebilir; hareket o anki deger ve hizdan devam eder.
export class Yay {
  x: number;
  v = 0;
  t: number;
  r: number;
  d: number;
  eps: number;
  acik = false;
  private once = 0;
  private on?: (x: number, v: number) => void;
  private azalt = azaltilmis();

  constructor(x: number, o: YaySecenek = {}) {
    this.x = x;
    this.t = x;
    this.r = o.response ?? 0.4;
    this.d = o.damping ?? 1;
    this.eps = o.eps ?? 0.01;
    this.on = o.on;
  }

  hedef(t: number, v?: number) {
    this.t = t;
    if (v != null) this.v = v;
    if (this.azalt) {
      this.x = t;
      this.v = 0;
      this.on?.(t, 0);
      return this;
    }
    if (!this.acik) {
      this.acik = true;
      this.once = 0;
      requestAnimationFrame(this.kare);
    }
    return this;
  }

  kes(x: number) {
    this.x = x;
    this.t = x;
    this.v = 0;
    this.acik = false;
    return this;
  }

  private kare = (n: number) => {
    if (!this.acik) return;
    const dt = this.once ? Math.min(0.034, (n - this.once) / 1e3) : 1 / 60;
    this.once = n;
    const w = 6.28318 / this.r, k = w * w, c = 2 * this.d * w;
    const ad = Math.max(1, Math.ceil(dt / 0.004)), h = dt / ad;
    for (let i = 0; i < ad; i++) {
      this.v += (-k * (this.x - this.t) - c * this.v) * h;
      this.x += this.v * h;
    }
    if (Math.abs(this.x - this.t) < this.eps && Math.abs(this.v) < this.eps * 12) {
      this.x = this.t;
      this.v = 0;
      this.acik = false;
      this.on?.(this.x, 0);
      return;
    }
    this.on?.(this.x, this.v);
    requestAnimationFrame(this.kare);
  };
}

// Apple'in izdusum formulu: hareket birakilinca nereye varir
export function izdusum(v: number, d = 0.998) {
  return ((v / 1e3) * d) / (1 - d);
}

// Sinirin otesinde artan direnc
export function lastik(asim: number, boy: number, c = 0.55) {
  return (asim * boy * c) / (boy + c * Math.abs(asim));
}

type TutSecenek = {
  bas?: (e: PointerEvent) => void;
  hareket?: (e: PointerEvent) => void;
  birak?: (e: PointerEvent, vx: number, vy: number) => void;
};

// 1:1 tutma: tutulan nokta korunur, parmak disari cikinca da izlenir, birakis hizi hesaplanir.
export function tut(el: HTMLElement, o: TutSecenek): () => void {
  let id: number | null = null;
  let gec: { x: number; y: number; t: number }[] = [];
  const bas = (e: PointerEvent) => {
    if (id !== null) return;
    id = e.pointerId;
    try { el.setPointerCapture(id); } catch {}
    gec = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }];
    o.bas?.(e);
    e.stopPropagation();
  };
  const hareket = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    gec.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    if (gec.length > 6) gec.shift();
    o.hareket?.(e);
  };
  const bit = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = null;
    const s = gec[gec.length - 1];
    let i = gec.length - 1;
    while (i > 0 && s.t - gec[i].t < 90) i--;
    // "Durup birakti" esigi kare hizina uyar: yavas makinede hareket olaylari seyrek gelir.
    const ara = gec.length > 1 ? (s.t - gec[0].t) / (gec.length - 1) : 16;
    const a = gec[i], dt = Math.max(8, s.t - a.t) / 1e3;
    const son = e.timeStamp - s.t > Math.max(100, ara * 2.5);
    o.birak?.(e, son ? 0 : (s.x - a.x) / dt, son ? 0 : (s.y - a.y) / dt);
  };
  el.addEventListener("pointerdown", bas);
  el.addEventListener("pointermove", hareket);
  el.addEventListener("pointerup", bit);
  el.addEventListener("pointercancel", bit);
  return () => {
    el.removeEventListener("pointerdown", bas);
    el.removeEventListener("pointermove", hareket);
    el.removeEventListener("pointerup", bit);
    el.removeEventListener("pointercancel", bit);
  };
}

export function titre(ms = 10) {
  try { navigator.vibrate?.(ms); } catch {}
}
