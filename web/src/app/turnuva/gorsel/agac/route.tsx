import { ASAMA_AD, ELEME, kazanan, oynandi, turnuvaVerisi, turnuvaVerisiIcin, type Mac } from "@/lib/turnuva";
import { Cerceve, R, Rozet, fazlaParametre, logolar, resim, tid, yok } from "../ortak";

// Eleme agaci + sampiyon (Instagram 4:5). ?t=<turnuvaId> verilmezse sitedeki turnuva.
export async function GET(req: Request) {
  if (fazlaParametre(req, ["t"])) return yok();
  const t = tid(req);
  const v = t ? await turnuvaVerisiIcin(t) : await turnuvaVerisi();
  if (!v) return yok();
  const turlar = ELEME.filter((a) => v.maclar.some((m) => m.asama === a));
  if (!turlar.length) return yok();
  const lg = await logolar(v.turnuva.id);
  const tk = new Map(v.takimlar.map((k) => [k.id, k]));
  const final = v.maclar.find((m) => m.asama === "final");
  const ucuncu = v.maclar.find((m) => m.asama === "ucuncu");
  const sid = final ? kazanan(final) : null;
  const sampiyon = sid !== null ? tk.get(sid) : undefined;
  const genis = Math.floor((1080 - 144 - (turlar.length - 1) * 14) / turlar.length);

  const kart = (m: Mac, vurgu = false) => {
    const k = kazanan(m);
    const satir = (id: number | null, gol: number | null, p: number | null, ilk: boolean) => {
      const tm = id === null ? undefined : tk.get(id);
      const galip = k !== null && k === id, elendi = k !== null && k !== id;
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderTop: ilk ? "none" : `1px solid ${R.acik}`, opacity: elendi ? 0.5 : 1, color: galip ? R.bordo : R.karbon }}>
          {tm ? <Rozet t={tm} logo={lg.get(tm.id)} boy={26} /> : <div style={{ display: "flex", width: 26, height: 26 }} />}
          <span style={{ flexGrow: 1, fontSize: 22, fontWeight: 700, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: genis - 96 }}>{tm?.ad ?? "—"}</span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 3, flexShrink: 0, marginLeft: "auto", fontSize: 26, fontWeight: 800, whiteSpace: "nowrap" }}>
            {oynandi(m) ? String(gol) : ""}
            {oynandi(m) && m.ev_pen !== null && m.dep_pen !== null && <span style={{ fontSize: 17, fontWeight: 700, opacity: 0.7 }}>{`(${p})`}</span>}
          </span>
        </div>
      );
    };
    return (
      <div key={m.id} style={{ display: "flex", flexDirection: "column", background: R.beyaz, borderRadius: 14, border: `3px solid ${vurgu ? R.bordo : R.gri}` }}>
        {satir(m.ev_id, m.ev_gol, m.ev_pen, true)}
        {satir(m.dep_id, m.dep_gol, m.dep_pen, false)}
      </div>
    );
  };

  return resim(
    <Cerceve ust={`${v.turnuva.ad} ${v.turnuva.sezon}`} baslik="Eleme ağacı" koyu={false}>
      {sampiyon && (
        <div style={{ display: "flex", alignItems: "center", gap: 22, background: R.bordo, color: R.beyaz, borderRadius: 28, padding: "18px 26px", marginBottom: 26 }}>
          <Rozet t={sampiyon} logo={lg.get(sampiyon.id)} boy={84} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: 4, opacity: 0.85 }}>ŞAMPİYON</span>
            <span style={{ fontSize: 60, fontWeight: 800, fontStyle: "italic", lineHeight: 1 }}>{sampiyon.ad}</span>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexGrow: 1, gap: 14 }}>
        {turlar.map((a) => (
          <div key={a} style={{ display: "flex", flexDirection: "column", width: genis }}>
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 3, color: R.bordo, marginBottom: 10, textTransform: "uppercase" }}>{ASAMA_AD[a]}</span>
            <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "space-around", gap: 8 }}>
              {v.maclar.filter((m) => m.asama === a).sort((x, y) => x.sira - y.sira).map((m) => kart(m, a === "final"))}
              {a === "final" && ucuncu && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2, color: "#6b6e72", textTransform: "uppercase" }}>{ASAMA_AD.ucuncu}</span>
                  {kart(ucuncu)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Cerceve>,
  );
}
