"use client";

import { useEffect, useRef } from "react";
import UstMenu from "@/components/UstMenu";
import AltKisim from "@/components/AltKisim";
import { Yay, azaltilmis, izdusum, tut } from "@/lib/akici";
import { OLAYLAR, WHATSAPP, beliren, sinir } from "@/lib/ortak";
import { satirKur } from "./tabela";

// Tabela satiri. Icini tabela.ts doldurur; React bu dugumun cocuklarina dokunmaz.
function Sat({ m, n, gor, b }: { m: string; n: number; gor?: boolean; b?: boolean }) {
  return <div className={"sat" + (b ? " b" : "")} data-m={m} data-n={n} data-gor={gor ? "" : undefined} />;
}

const DAKIKA = Array.from({ length: 90 }, (_, i) => i);

export default function Skorbord() {
  const kok = useRef<HTMLDivElement>(null);
  const saat = useRef<HTMLDivElement>(null);
  const cub = useRef<HTMLDivElement>(null);
  const dk = useRef<HTMLElement>(null);
  const ev = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const azalt = azaltilmis();
    const temizle: (() => void)[] = [];

    // Tabela satirlari: ustteki hemen, digerleri ekrana girince doner
    kok.current!.querySelectorAll<HTMLElement>(".sat").forEach((el) => {
      const s = satirKur(el, !!el.closest(".ust-pano"));
      temizle.push(s.yokEt);
      if (el.hasAttribute("data-gor") && !azalt) {
        const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); s.bas(); } }, { threshold: 0.4 });
        io.observe(el);
        temizle.push(() => io.disconnect());
      } else {
        const z = setTimeout(s.bas, 300);
        temizle.push(() => clearTimeout(z));
      }
    });
    temizle.push(beliren(kok.current!, azalt));

    // Mac saati sayfanin ilerlemesini dakika olarak gosterir
    const cs = cub.current!.children;
    let son = -1, sonEv = "Başlama";
    const ayarla = (p: number) => {
      const m = Math.round(p * 90); if (m === son) return; son = m; dk.current!.textContent = m + "'";
      for (let i = 0; i < 90; i++) cs[i].classList.toggle("on", i < m);
      const t = m < 1 ? "Başlama" : m < 45 ? "1. yarı" : m == 45 ? "Devre arası" : m < 90 ? "2. yarı" : "Maç sonu";
      if (t !== sonEv) {
        sonEv = t; ev.current!.textContent = t;
        if (!azalt) ev.current!.animate([{ opacity: 0, transform: "translateY(5px)" }, { opacity: 1, transform: "none" }], { duration: 240, easing: "cubic-bezier(.2,.8,.2,1)" });
      }
    };
    const maks = () => document.documentElement.scrollHeight - innerHeight;
    const yaz = () => ayarla(maks() > 0 ? scrollY / maks() : 0);
    addEventListener("scroll", yaz, { passive: true }); yaz();
    temizle.push(() => removeEventListener("scroll", yaz));

    // Saat seridi bir kaydirma cubugu: parmak neredeyse dakika orasi, sayfa 1:1 gelir.
    // Birakinca hiz izdusumuyle ileri kayar; kullanici kaydirirsa yay hemen birakir.
    const kY = new Yay(scrollY, { response: 0.5, damping: 1, eps: 0.5, on: (x) => scrollTo({ top: x, behavior: "instant" }) });
    const birak = () => { if (kY.acik) kY.kes(scrollY); };
    const dokun = (e: TouchEvent) => { if (!saat.current!.contains(e.target as Node)) birak(); };
    addEventListener("wheel", birak, { passive: true }); addEventListener("keydown", birak);
    addEventListener("touchstart", dokun, { passive: true });
    temizle.push(() => { removeEventListener("wheel", birak); removeEventListener("keydown", birak); removeEventListener("touchstart", dokun); kY.kes(scrollY); });

    const oran = (x: number) => { const r = cub.current!.getBoundingClientRect(); return sinir((x - r.left) / r.width, 0, 1); };
    let x0 = 0, oynadi = false;
    temizle.push(tut(saat.current!, {
      bas(e) { saat.current!.classList.add("tut"); kY.kes(scrollY); x0 = e.clientX; oynadi = false; },
      hareket(e) {
        if (!oynadi && Math.abs(e.clientX - x0) < 4) return; oynadi = true;
        const y = oran(e.clientX) * maks(); kY.kes(y); scrollTo({ top: y, behavior: "instant" });
      },
      birak(e, vx) {
        saat.current!.classList.remove("tut");
        let hedef: number, v = 0;
        if (!oynadi) hedef = oran(e.clientX) * maks();
        else { v = (vx * maks()) / cub.current!.getBoundingClientRect().width; hedef = sinir(scrollY + izdusum(v, 0.99), 0, maks()); }
        kY.kes(scrollY); kY.hedef(hedef, v);
      },
    }));

    return () => temizle.forEach((f) => f());
  }, []);

  return (
    <div className="t-skor" ref={kok}>
      <UstMenu />
      <main>
        <section className="ust-pano" id="ust">
          <h1 className="sr">İYTE Futbol</h1>
          <div className="pano" aria-hidden="true"><Sat m="İYTE FUTBOL" n={11} /><Sat m="IZTECH FOOTBALL" n={15} /></div>
          <p>Kampüsün futbol topluluğu. Maçın dakikası sayfayla ilerliyor.</p>
          <p className="ipucu" aria-hidden="true">Harflere dokun ya da aşağı çek. Alttaki saati sürükle.</p>
          <div className="d"><a className="btn" href="#etkinlikler">Etkinliklere bak</a><a className="btn iki" href={WHATSAPP} target="_blank" rel="noopener noreferrer">Bize ulaş</a></div>
        </section>
        <section className="bol biz kap" id="hakkimizda">
          <div className="pano bas-p" aria-hidden="true"><Sat m="HAKKIMIZDA" n={10} gor /></div>
          <h2 className="sr">Hakkımızda</h2>
          <p className="r">İYTE Futbol, kampüste futbolu birlikte oynamak, izlemek ve konuşmak isteyen öğrencilerin topluluğu. İlk düdükten son düdüğe kadar buradayız.</p>
        </section>
        <section className="bol kap" id="etkinlikler" style={{ paddingTop: 0 }}>
          <div className="pano bas-p" aria-hidden="true"><Sat m="ETKİNLİKLER" n={11} gor /></div>
          <h2 className="sr">Yaklaşan etkinlikler</h2>
          <div className="pano tablo">
            {OLAYLAR.map((e) => (
              <div className="st" key={e.ad}>
                <Sat m={e.kisa} n={6} gor b />
                <Sat m={e.ust} n={16} gor />
                <p className="meta">{e.tur}, {e.yer}, saat {e.saat}</p>
              </div>
            ))}
          </div>
          <p className="ornek" style={{ marginTop: 12 }}>Etkinlikler örnek içeriktir.</p>
        </section>
        <section className="son" id="iletisim">
          <div className="kap">
            <h2 className="sr">Sıradaki maç senin</h2>
            <div className="pano" aria-hidden="true"><Sat m="SIRADAKİ MAÇ" n={12} gor /><Sat m="SENİN" n={12} gor /></div>
            <a className="btn ters" href={WHATSAPP} target="_blank" rel="noopener noreferrer">Bize ulaş</a>
          </div>
        </section>
      </main>
      <AltKisim />
      <div className="saat" ref={saat} aria-hidden="true">
        <b ref={dk}>0&apos;</b>
        <div className="cubuk" ref={cub}>{DAKIKA.map((i) => <i key={i} className={i === 44 ? "y" : undefined} />)}</div>
        <span ref={ev}>Başlama</span>
      </div>
    </div>
  );
}
