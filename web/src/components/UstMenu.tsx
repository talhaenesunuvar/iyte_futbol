"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MENU, gorunurken } from "@/lib/ortak";

// Sabit ust menu. Sayfa 60 px kayinca "dolu" olur; mobilde Menu dugmesi paneli acar.
export default function UstMenu() {
  const [acik, setAcik] = useState(false);
  const [dolu, setDolu] = useState(false);
  const isaret = useRef<HTMLDivElement>(null);

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
          <img src="/img/logo-bas.webp" alt="" width={34} height={37} />
          <span>İYTE Futbol</span>
        </Link>
        <nav aria-label="Ana menü">
          {MENU.map(([ad, h], i) => (
            <a key={h} href={h} aria-current={i ? undefined : "page"} onClick={() => setAcik(false)}>{ad}</a>
          ))}
        </nav>
        <button type="button" aria-expanded={acik} onClick={() => setAcik((a) => !a)}>{acik ? "Kapat" : "Menü"}</button>
      </header>
    </>
  );
}
