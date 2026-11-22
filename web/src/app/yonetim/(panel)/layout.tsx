import { Suspense } from "react";
import Link from "next/link";
import { yetkiGerekli } from "@/lib/yetki";
import { cikisAction } from "../islemler";
import PanelMenu from "./PanelMenu";

// Panel iskeleti. Menu statik; icerik yetki kontrolunden sonra gelir.
// Her sayfa ve her server action ayrica yetkiGerekli() cagirir (katmanli kontrol).
export default function PanelDuzen({ children }: { children: React.ReactNode }) {
  return (
    <div className="y-duzen">
      <aside className="y-yan">
        <Link href="/yonetim" className="y-marka">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-bas.webp" alt="" width={28} height={30} />
          <span>Yönetim</span>
        </Link>
        {/* usePathname dinamik rotada calisma aninda gelir; Suspense olmadan prerender durur */}
        <Suspense fallback={<nav className="y-menu" />}><PanelMenu /></Suspense>
        <div className="y-yan-alt">
          <Link href="/" target="_blank">Siteyi aç ↗</Link>
          <form action={cikisAction}><button type="submit" className="y-bag">Çıkış</button></form>
        </div>
      </aside>
      <main className="y-icerik">
        <Suspense fallback={<p className="y-soluk">Yükleniyor…</p>}>
          <Kapi>{children}</Kapi>
        </Suspense>
      </main>
    </div>
  );
}

async function Kapi({ children }: { children: React.ReactNode }) {
  await yetkiGerekli();
  return children;
}
