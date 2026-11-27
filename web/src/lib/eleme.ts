import "server-only";
import type postgres from "postgres";
import { ELEME, kaybeden, kazanan, sonrakiAsama, sonrakiYer, type Asama, type Mac } from "./turnuva-hesap";

// Eleme agaci ilerletme. db.ts'e bagli degil (gecis.ts de kullanir; turnuva.ts uzerinden alinsa dongu olurdu).

type MacSatiri = Omit<Mac, "zaman"> & { turnuva_id: number };
const macOku = async (sql: postgres.Sql, macId: number) => {
  const [m] = await sql<MacSatiri[]>`
    select id, turnuva_id, asama, grup, sira, ev_id, dep_id, saha, ev_gol, dep_gol, ev_pen, dep_pen, canli, hakem from mac where id = ${macId}`;
  return m ? ({ ...m, zaman: null } as Mac & { turnuva_id: number }) : null;
};

// Eleme maci sonucu degisince kazanani bir sonraki turdaki yerine yazar (karar yoksa yeri bosaltir).
// Yari finalde ayrica kaybeden 3.luk macina gider.
// ZINCIRLEME (Derin, 2026-11-26: "0-3 elendi ama finalde gozukuyor"): sonraki turdaki yer degistiyse o macin
// kazanani da degismis olabilir; ayni islem finale kadar tekrar edilir. Eskiden yalniz bir tur ileri yaziliyordu:
// ceyrek sonucu sonradan duzeltilince yari final dogru takimi aliyor ama final eski (elenmis) takimda kaliyordu.
// Sonraki macin skoru varsa taraf (ev/dep) bazinda kalir; yeni gelen takim o tarafin sonucunu devralir.
export async function ilerlet(sql: postgres.Sql, macId: number, derinlik = 0): Promise<void> {
  const m = await macOku(sql, macId);
  if (!m || derinlik > ELEME.length) return;
  if (m.asama === "yari") {
    const kb = kaybeden(m);
    if (m.sira === 1) await sql`update mac set ev_id = ${kb} where turnuva_id = ${m.turnuva_id} and asama = 'ucuncu' and sira = 1`;
    else await sql`update mac set dep_id = ${kb} where turnuva_id = ${m.turnuva_id} and asama = 'ucuncu' and sira = 1`;
  }
  const sonraki = sonrakiAsama(m.asama as Asama);
  if (!sonraki) return;
  const k = kazanan(m);
  const { sira, taraf } = sonrakiYer(m.sira);
  const [n] = await sql<{ id: number; ev_id: number | null; dep_id: number | null }[]>`
    select id, ev_id, dep_id from mac where turnuva_id = ${m.turnuva_id} and asama = ${sonraki} and sira = ${sira}`;
  if (!n) return;
  if ((taraf === "ev" ? n.ev_id : n.dep_id) === k) return; // degisiklik yok: zincir burada durur
  if (taraf === "ev") await sql`update mac set ev_id = ${k} where id = ${n.id}`;
  else await sql`update mac set dep_id = ${k} where id = ${n.id}`;
  await ilerlet(sql, n.id, derinlik + 1);
}

// Turnuvanin tum eleme agacini bastan duzeltir: tur tur (son 16 -> final), yalniz KARARI OLAN maclardan ilerletir.
// Karari olmayan macin sonraki yerine dokunulmaz (panelden elle yazilmis takimlar silinmesin).
export async function agaciOnar(sql: postgres.Sql, turnuvaId: number) {
  for (const a of ELEME) {
    const l = await sql<{ id: number }[]>`select id from mac where turnuva_id = ${turnuvaId} and asama = ${a} order by sira`;
    for (const { id } of l) {
      const m = await macOku(sql, id);
      if (m && kazanan(m) !== null) await ilerlet(sql, id);
    }
  }
}
