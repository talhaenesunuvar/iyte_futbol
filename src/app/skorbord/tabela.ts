// Doner harfli tabela. Prototipteki 04-skorbord.html betiginin TypeScript karsiligi.
import { Yay, izdusum, lastik, tut, titre, azaltilmis } from "@/lib/akici";

export const HARF = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0123456789 ";
const g = (c: string) => (c === " " ? " " : c);
const rast = () => HARF[(Math.random() * HARF.length) | 0];
const HUCRE = '<div class="f"><s class="u"><i>&nbsp;</i></s><s class="a"><i>&nbsp;</i></s><s class="fu"><i>&nbsp;</i></s><s class="fa"><i>&nbsp;</i></s></div>';

type Adim = { h: string; r: number; v?: number };

// Tek kart. Cevrilme orani p (0..1) bir yayla surulur: sure yok, her an yakalanip
// o anki acidan devam edilebilir. Animasyon da parmak da ayni p'yi yazar.
export class Kart {
  h = " ";
  n: string | null = null;
  kuyruk: Adim[] = [];
  bitince: (() => void) | null = null;
  y: Yay;
  private u: HTMLElement; private a: HTMLElement; private fu: HTMLElement; private fa: HTMLElement;
  private zaman: ReturnType<typeof setTimeout>[] = [];

  constructor(public f: HTMLElement, public hedefHarf: string, private azalt: boolean) {
    this.u = f.querySelector(".u i")!; this.a = f.querySelector(".a i")!;
    this.fu = f.querySelector(".fu")!; this.fa = f.querySelector(".fa")!;
    this.y = new Yay(0, { response: 0.12, damping: 1, eps: 0.004, on: (p, v) => { this.ciz(p); if (v === 0 && !this.y.acik) this.otur(p); } });
  }
  hazir(n: string) {
    this.n = n; this.u.textContent = g(n);
    this.fu.firstElementChild!.textContent = g(this.h); this.fa.firstElementChild!.textContent = g(n);
    this.fu.style.visibility = this.fa.style.visibility = "visible"; this.ciz(0);
  }
  // Ust kanat once yatar, alt kanat sonra iner. Kanat yattikca kararir: hareketin yonunu anlatir.
  ciz(p: number) {
    const q = Math.max(0, Math.min(1, p));
    if (q < 0.5) {
      this.fu.style.transform = `rotateX(${-q * 180}deg)`; this.fu.style.filter = `brightness(${1 - q * 0.9})`; this.fa.style.transform = "rotateX(90deg)";
    } else {
      this.fu.style.transform = "rotateX(-90deg)"; this.fa.style.transform = `rotateX(${(1 - q) * 180}deg)`; this.fa.style.filter = `brightness(${0.55 + (q - 0.5) * 0.9})`;
    }
  }
  otur(p: number) {
    if (this.n === null) return;
    if (p >= 0.5) { this.a.textContent = g(this.n); this.h = this.n; } else this.u.textContent = g(this.h);
    this.n = null; this.fu.style.visibility = this.fa.style.visibility = "hidden"; this.y.kes(0);
    if (this.kuyruk.length) this.ilerle();
    else if (this.bitince) { const b = this.bitince; this.bitince = null; b(); }
  }
  ilerle() { const s = this.kuyruk.shift()!; this.hazir(s.h); this.y.r = s.r; this.y.hedef(1, s.v || 0); }
  // Dizi: once rastgele harfler, en sonda asil harf. Eski tabelalar gibi.
  diz(liste: Adim[], bitince?: () => void) {
    this.kuyruk = liste; this.bitince = bitince || null;
    if (this.azalt) { const s = liste[liste.length - 1]; this.kuyruk = []; this.h = s.h; this.u.textContent = this.a.textContent = g(s.h); return; }
    if (this.n === null) this.ilerle();
  }
  karistir(n: number, gec = 0) {
    const l: Adim[] = [];
    for (let i = 0; i < n; i++) l.push({ h: rast(), r: 0.07 });
    l.push({ h: this.hedefHarf, r: 0.15 });
    this.zaman.push(setTimeout(() => this.diz(l), gec));
  }
  sonraki() { const i = HARF.indexOf(this.n !== null ? this.n : this.h); return HARF[(i + 1) % HARF.length]; }
  durdur() { this.zaman.forEach(clearTimeout); this.zaman = []; this.kuyruk = []; this.bitince = null; this.y.kes(0); }
}

// Elle cevirme: kanat parmagi 1:1 izler, tutulan aci korunur, kart boyunu gecince
// bir sonraki harfe akar. Birakista hiz izdusumu kac harf donecegini belirler.
function elle(k: Kart) {
  const f = k.f;
  let y0 = 0, p0 = 0, H = 1, surukle = false;
  let donus: ReturnType<typeof setTimeout> | undefined;
  const birak = tut(f, {
    bas(e) {
      clearTimeout(donus); f.classList.add("bas"); k.kuyruk = []; k.bitince = null; surukle = false;
      H = f.offsetHeight * 1.1; y0 = e.clientY;
      if (k.n !== null) { p0 = Math.max(0, Math.min(1, k.y.x)); k.y.kes(p0); } else { k.hazir(k.sonraki()); p0 = 0; k.y.kes(0); }
    },
    hareket(e) {
      const dy = e.clientY - y0; if (!surukle && Math.abs(dy) < 6) return; surukle = true;
      let p = p0 + dy / H;
      while (p >= 1) { k.y.kes(1); k.otur(1); k.hazir(k.sonraki()); titre(5); p -= 1; p0 -= 1; }
      if (p < 0) p = lastik(p * H, H) / H;
      k.y.x = p; k.ciz(p);
    },
    birak(e, vx, vy) {
      f.classList.remove("bas");
      const p = k.y.x, v = vy / H;
      if (!surukle) { k.y.r = 0.16; k.y.hedef(1, 2); }
      else {
        // Apple'in izdusumu: parmagin gittigi yere gore kac kanat dusecegi
        const son = p + izdusum(vy, 0.99) / H, n = Math.max(0, Math.min(8, Math.round(son)));
        k.y.r = 0.22;
        if (n === 0) k.y.hedef(0, v);
        else {
          k.y.hedef(1, v);
          const l: Adim[] = [];
          for (let i = 1; i < n; i++) l.push({ h: HARF[(HARF.indexOf(k.n!) + i) % HARF.length], r: 0.1 + i * 0.02 });
          k.kuyruk = l;
        }
      }
      // Birakilan harf bir sure kalir, sonra tabela kendi yazisina geri doner
      k.bitince = () => { titre(6); if (k.h !== k.hedefHarf) donus = setTimeout(() => k.karistir(2), 2600); };
    },
  });
  return () => { birak(); clearTimeout(donus); };
}

// Bir satiri kurar: kartlari olusturur, istenirse elle cevirmeyi baglar.
// Dondurdugu bas() karistirmayi baslatir, yokEt() her seyi temizler.
export function satirKur(el: HTMLElement, elleCevir: boolean) {
  const azalt = azaltilmis();
  const m = el.dataset.m!, n = +el.dataset.n!, s = m.padEnd(n, " ");
  el.innerHTML = HUCRE.repeat(n);
  const temizle: (() => void)[] = [];
  const kartlar = Array.from(el.querySelectorAll<HTMLElement>(".f")).map((f, i) => {
    const k = new Kart(f, s[i], azalt);
    if (elleCevir && !azalt) temizle.push(elle(k));
    return k;
  });
  return {
    bas() { kartlar.forEach((k, i) => k.karistir(3 + ((Math.random() * 5) | 0), i * 38)); },
    yokEt() { kartlar.forEach((k) => k.durdur()); temizle.forEach((f) => f()); },
  };
}
