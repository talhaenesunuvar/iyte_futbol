import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { yetkiGerekli } from "@/lib/yetki";
import { ASAMA_AD, turnuvaPanel } from "@/lib/turnuva";
import CanliPanel from "./CanliPanel";

export const metadata = { title: "Canlı maç" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ hata?: string | string[] }> };

// Mac sirasinda telefondan anlik gol girisi. Skor gollerden hesaplanir; mac bitince kazanan (elemede) ilerler.
export default async function CanliMac({ params, searchParams }: Props) {
  await yetkiGerekli();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const sql = await db();
  const [r] = await sql<{ turnuva_id: number }[]>`select turnuva_id from mac where id = ${id}`;
  if (!r) notFound();
  const v = await turnuvaPanel(r.turnuva_id);
  const m = v?.maclar.find((x) => x.id === id);
  if (!v || !m) notFound();
  const hataH = (await searchParams).hata;
  const hata = Array.isArray(hataH) ? hataH[0] : hataH;
  const ev = v.takimlar.find((k) => k.id === m.ev_id);
  const dep = v.takimlar.find((k) => k.id === m.dep_id);

  return (
    <>
      <div className="y-baslik">
        <div>
          <p className="y-soluk"><Link href={`/yonetim/turnuva/${v.turnuva.id}#mac-${m.id}`}>← {v.turnuva.ad}</Link></p>
          <h1>Canlı maç <span className="y-soluk">{ASAMA_AD[m.asama]}{m.grup ? ` · ${m.grup} grubu` : ""}</span></h1>
        </div>
        {m.canli && <span className="y-rozet kirmizi">CANLI · sitede görünüyor</span>}
      </div>
      {hata && <p className="y-kart y-hata" role="alert">{hata}</p>}
      {!ev || !dep ? (
        <p className="y-bos">Bu maçın iki takımı da belli olmalı.</p>
      ) : (
        <CanliPanel
          m={m}
          T={v.turnuva.id}
          ev={ev}
          dep={dep}
          evKadro={v.oyuncular.filter((o) => o.takim_id === ev.id)}
          depKadro={v.oyuncular.filter((o) => o.takim_id === dep.id)}
          goller={v.goller.filter((g) => g.mac_id === m.id)}
          kartlar={v.kartlar.filter((x) => x.mac_id === m.id)}
        />
      )}
    </>
  );
}
