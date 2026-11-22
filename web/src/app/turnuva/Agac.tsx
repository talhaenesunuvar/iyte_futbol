import { ASAMA_AD, ELEME, kazanan, oynandi, type Mac, type Takim } from "@/lib/turnuva";
import Link from "next/link";
import TakimRozet from "./TakimRozet";

// Eleme agaci: her tur bir sutun, maclar sira numarasina gore. Kendi kabinda yatay kayar
// (overflow-x: auto; dokunmatikte parmakla, masaustunde kaydirma cubuguyla). 3.luk maci final sutununda, finalin altinda.
export default function Agac({ maclar, takimlar }: { maclar: Mac[]; takimlar: Takim[] }) {
  const tk = new Map(takimlar.map((t) => [t.id, t]));
  const turlar = ELEME.filter((a) => maclar.some((m) => m.asama === a));
  const ucuncu = maclar.find((m) => m.asama === "ucuncu");

  const kart = (m: Mac, sinif?: string) => {
    const k = kazanan(m);
    const pen = m.ev_pen !== null && m.dep_pen !== null;
    const satir = (id: number | null, gol: number | null, p: number | null) => (
      <div className={"ag-t" + (k !== null && k === id ? " galip" : "") + (k !== null && k !== id ? " elendi" : "")}>
        <span className="ag-ad"><TakimRozet t={id === null ? null : tk.get(id)} boy={18} /><span>{id === null ? "—" : tk.get(id)?.ad ?? "?"}</span></span>
        <b>{oynandi(m) ? gol : ""}{pen && <sup>{p}</sup>}</b>
      </div>
    );
    return (
      <li key={m.id} className={[sinif, m.canli ? "canli" : ""].filter(Boolean).join(" ") || undefined}>
        <Link href={`/turnuva/mac/${m.id}`} className="ag-git" aria-label={`${ASAMA_AD[m.asama]}: ${m.ev_id === null ? "?" : tk.get(m.ev_id)?.ad ?? "?"} – ${m.dep_id === null ? "?" : tk.get(m.dep_id)?.ad ?? "?"}`}>
          {m.canli && <span className="ag-canli">CANLI</span>}
          {satir(m.ev_id, m.ev_gol, m.ev_pen)}
          {satir(m.dep_id, m.dep_gol, m.dep_pen)}
        </Link>
      </li>
    );
  };

  return (
    <div className="agac-kap" tabIndex={0} role="region" aria-label="Eleme ağacı, yatay kaydırılabilir">
      <div className="agac" style={{ "--tur": turlar.length } as React.CSSProperties}>
        {turlar.map((a, ti) => {
          const son = ti === turlar.length - 1;
          return (
            <div className={"tur" + (son ? " son" : "")} key={a}>
              <h3>{ASAMA_AD[a]}</h3>
              <ol>
                {maclar.filter((m) => m.asama === a).sort((x, y) => x.sira - y.sira).map((m) => kart(m, a === "final" ? "final" : undefined))}
              </ol>
              {son && a === "final" && ucuncu && (
                <div className="ucuncu">
                  <h3>{ASAMA_AD.ucuncu}</h3>
                  <ol>{kart(ucuncu, "ucuncu-kart")}</ol>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
