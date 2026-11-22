import { puanDurumu, turnuvaVerisi, turnuvaVerisiIcin } from "@/lib/turnuva";
import { Cerceve, R, Rozet, logolar, resim, tid, yok } from "../../ortak";

// Grup puan tablosu (Instagram 4:5). ?t=<turnuvaId> verilmezse sitedeki turnuva.
export async function GET(req: Request, { params }: { params: Promise<{ harf: string }> }) {
  const harf = (await params).harf.toUpperCase();
  if (!/^[A-P]$/.test(harf)) return yok();
  const t = tid(req);
  const v = t ? await turnuvaVerisiIcin(t) : await turnuvaVerisi();
  if (!v) return yok();
  const satirlar = puanDurumu(v.takimlar, v.maclar).get(harf);
  if (!satirlar?.length) return yok();
  const lg = await logolar(v.turnuva.id);
  const oynanan = v.maclar.filter((m) => m.asama === "grup" && m.grup === harf);
  const kolon = ["O", "G", "B", "M", "AV", "P"] as const;
  const W = { no: 60, ad: 520, k: 72 };

  return resim(
    <Cerceve ust={`${v.turnuva.ad} ${v.turnuva.sezon}`} baslik={`${harf} Grubu`} koyu={false}>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 28, fontWeight: 700, color: "#6b6e72", padding: "0 24px 14px" }}>
          <span style={{ width: W.no }}>#</span>
          <span style={{ width: W.ad }}>Takım</span>
          {kolon.map((c) => <span key={c} style={{ width: W.k, textAlign: "center", justifyContent: "center", display: "flex" }}>{c}</span>)}
        </div>
        {satirlar.map((s, i) => (
          <div key={s.takim.id} style={{ display: "flex", alignItems: "center", padding: "22px 24px", marginBottom: 14, borderRadius: 26, background: i < 2 ? R.bordo : R.acik, color: i < 2 ? R.beyaz : R.karbon }}>
            <span style={{ width: W.no, fontSize: 52, fontWeight: 800, fontStyle: "italic" }}>{i + 1}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 18, width: W.ad }}>
              <Rozet t={s.takim} logo={lg.get(s.takim.id)} boy={72} halka={i < 2 ? R.beyaz : undefined} />
              <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.05, maxWidth: W.ad - 100 }}>{s.takim.ad}</span>
            </div>
            {kolon.map((c) => (
              <span key={c} style={{ display: "flex", justifyContent: "center", width: W.k, fontSize: c === "P" ? 52 : 38, fontWeight: c === "P" ? 800 : 600, fontStyle: c === "P" ? "italic" : "normal" }}>
                {c === "AV" ? (s.AV > 0 ? `+${s.AV}` : String(s.AV)) : String(s[c])}
              </span>
            ))}
          </div>
        ))}
        <div style={{ display: "flex", marginTop: "auto", fontSize: 28, fontWeight: 600, color: "#6b6e72" }}>
          {`${oynanan.filter((m) => m.ev_gol !== null).length}/${oynanan.length} maç oynandı · İlk 2 takım bir üst tura çıkar`}
        </div>
      </div>
    </Cerceve>,
  );
}
