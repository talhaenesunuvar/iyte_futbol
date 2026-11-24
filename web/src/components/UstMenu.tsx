"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BOLUMLU, MENU, gorunurken } from "@/lib/ortak";

// Sabit ust menu. Sayfa 60 px kayinca "dolu" olur; mobilde Menu dugmesi paneli acar.
export default function UstMenu() {
  const [acik, setAcik] = useState(false);
  const [dolu, setDolu] = useState(false);
  const isaret = useRef<HTMLDivElement>(null);
  const yol = usePathname();
  const bolumlu = BOLUMLU.has(yol);

  useEffect(() => {
    const io = gorunurken(isaret.current!, (g) => setDolu(!g));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={isaret} aria-hidden style={{ position: "absolute", top: 0, height: 60, width: 1, pointerEvents: "none" }} />
      <header className={"ust" + (dolu ? " dolu" : "") + (acik ? " acik" : "")}>
        {/* Logo ana sayfaya (Kale Agi) doner. */}
        <Link className="ust-m" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-bas-80.webp" alt="" width={34} height={37} />
          <span>İYTE Futbol</span>
        </Link>
        <nav aria-label="Ana menü">
          {MENU.map(([ad, h]) => {
            const kapat = () => setAcik(false);
            const hashli = h.includes("#");
            // Bolumlu sayfada "/" ve "/#x" sayfa ici "#"/"#x" olur (AkiciKaydirma yumusak kaydirir); baska sayfada oldugu gibi gider.
            if (bolumlu && (hashli || h === "/")) {
              const sayfaIci = hashli ? h.slice(h.indexOf("#")) : "#";
              return <a key={h} href={sayfaIci} aria-current={h === "/" ? "page" : undefined} onClick={kapat}>{ad}</a>;
            }
            if (hashli) return <a key={h} href={h} onClick={kapat}>{ad}</a>;
            return <Link key={h} href={h} aria-current={yol === h || yol.startsWith(h + "/") ? "page" : undefined} onClick={kapat}>{ad}</Link>;
          })}
        </nav>
        <button type="button" aria-expanded={acik} onClick={() => setAcik((a) => !a)}>{acik ? "Kapat" : "Menü"}</button>
      </header>
    </>
  );
}
