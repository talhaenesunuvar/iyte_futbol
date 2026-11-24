import { ASAMA_AD, kazanan, macTurnuvasi, oynandi, tarihYaz, turnuvaVerisiIcin } from "@/lib/turnuva";
import { Cerceve, R, Rozet, fazlaParametre, logolar, resim, yok } from "../../ortak";

// Mac sonucu karti (Instagram 4:5)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (fazlaParametre(req)) return yok();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return yok();
  const tid = await macTurnuvasi(id);
  if (tid === null) return yok();
  const v = await turnuvaVerisiIcin(tid);
  const m = v?.maclar.find((x) => x.id === id);
  if (!v || !m || m.ev_id === null || m.dep_id === null) return yok();
  const lg = await logolar(v.turnuva.id);
  const ev = v.takimlar.find((k) => k.id === m.ev_id), dep = v.takimlar.find((k) => k.id === m.dep_id);
  const goller = v.goller.filter((g) => g.mac_id === id);
  const k = kazanan(m);
  const pen = m.ev_pen !== null && m.dep_pen !== null;
  const asama = m.asama === "grup" ? `${m.grup} Grubu` : ASAMA_AD[m.asama];
  const durum = m.canli ? "CANLI" : oynandi(m) ? "MAÇ SONUCU" : "MAÇ";
  const golListe = (tk: number) =>
    goller.filter((g) => g.takim_id === tk).map((g) => `${g.oyuncu}${g.dakika ? ` ${g.dakika}'` : ""}${g.asist ? ` (${g.asist})` : ""}`);

  const takimBlok = (t: typeof ev, sag: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 340, gap: 22 }}>
      <Rozet t={t} logo={t ? lg.get(t.id) : undefined} boy={190} />
      <div style={{ display: "flex", fontSize: 52, fontWeight: 800, fontStyle: "italic", textAlign: "center", lineHeight: 1.02, color: k !== null && k !== t?.id ? "rgba(255,255,255,.55)" : R.beyaz, justifyContent: sag ? "center" : "center" }}>
        {t?.ad ?? "?"}
      </div>
    </div>
  );

  return resim(
    <Cerceve ust={`${v.turnuva.ad} ${v.turnuva.sezon}`} baslik={asama}>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, background: R.bordo, borderRadius: 40, padding: "44px 40px", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "center", fontSize: 34, fontWeight: 700, letterSpacing: 8, color: m.canli ? "#FFD2D4" : "rgba(255,255,255,.8)" }}>{durum}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {takimBlok(ev, false)}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 150, fontWeight: 800, fontStyle: "italic", lineHeight: 1 }}>
              {oynandi(m) ? `${m.ev_gol}-${m.dep_gol}` : "vs"}
            </div>
            {pen && <div style={{ display: "flex", fontSize: 34, fontWeight: 700, opacity: 0.85 }}>{`Penaltılar ${m.ev_pen}-${m.dep_pen}`}</div>}
          </div>
          {takimBlok(dep, true)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,.88)", minHeight: 120 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 420, gap: 4 }}>{golListe(m.ev_id).slice(0, 6).map((s, i) => <span key={i}>{s}</span>)}</div>
          <div style={{ display: "flex", flexDirection: "column", width: 420, gap: 4, alignItems: "flex-end", textAlign: "right" }}>{golListe(m.dep_id).slice(0, 6).map((s, i) => <span key={i}>{s}</span>)}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,.75)" }}>
          {[m.zaman ? tarihYaz(m.zaman) : "", m.saha].filter(Boolean).join(" · ")}
        </div>
      </div>
    </Cerceve>,
  );
}
