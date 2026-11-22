import { ASAMA_AD, ELEME, kazanan, oynandi, type Mac, type Takim } from "@/lib/turnuva";

// Eleme agaci: her tur bir sutun, maclar sira numarasina gore. Kendi kabinda yatay kayar
// (overflow-x: auto; dokunmatikte parmakla, masaustunde kaydirma cubuguyla).
export default function Agac({ maclar, takimlar }: { maclar: Mac[]; takimlar: Takim[] }) {
  const ad = new Map(takimlar.map((t) => [t.id, t.ad]));
  const turlar = ELEME.filter((a) => maclar.some((m) => m.asama === a));
  return (
    <div className="agac-kap" tabIndex={0} role="region" aria-label="Eleme ağacı, yatay kaydırılabilir">
      <div className="agac" style={{ "--tur": turlar.length } as React.CSSProperties}>
        {turlar.map((a, ti) => (
          <div className={"tur" + (ti === turlar.length - 1 ? " son" : "")} key={a}>
            <h3>{ASAMA_AD[a]}</h3>
            <ol>
              {maclar.filter((m) => m.asama === a).sort((x, y) => x.sira - y.sira).map((m) => {
                const k = kazanan(m);
                const pen = m.ev_pen !== null && m.dep_pen !== null;
                const satir = (id: number | null, gol: number | null, p: number | null) => (
                  <div className={"ag-t" + (k !== null && k === id ? " galip" : "") + (k !== null && k !== id ? " elendi" : "")}>
                    <span>{id === null ? "—" : ad.get(id) ?? "?"}</span>
                    <b>{oynandi(m) ? gol : ""}{pen && <sup>{p}</sup>}</b>
                  </div>
                );
                return (
                  <li key={m.id} className={a === "final" ? "final" : undefined}>
                    {satir(m.ev_id, m.ev_gol, m.ev_pen)}
                    {satir(m.dep_id, m.dep_gol, m.dep_pen)}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
