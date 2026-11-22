"use client";

import { useState } from "react";
import type { Gol, Mac, Oyuncu, Takim } from "@/lib/turnuva-hesap";
import { canliAction, golEkleAction, golSilAction } from "../../islemler";

type P = { m: Mac; T: number; ev: Takim; dep: Takim; evKadro: Oyuncu[]; depKadro: Oyuncu[]; goller: Gol[] };

export default function CanliPanel({ m, T, ev, dep, evKadro, depKadro, goller }: P) {
  const [taraf, setTaraf] = useState<"ev" | "dep">("ev");
  const [kim, setKim] = useState("");
  const takim = taraf === "ev" ? ev : dep;
  const kadro = taraf === "ev" ? evKadro : depKadro;
  const diger = `t:${takim.id}`;
  const secili = kim && (kim === diger || kadro.some((o) => `o:${o.id}` === kim)) ? kim : kadro[0] ? `o:${kadro[0].id}` : diger;
  const evGol = m.ev_gol ?? 0, depGol = m.dep_gol ?? 0;
  const don = `/yonetim/turnuva/mac/${m.id}`;
  const son = goller.at(-1);
  const berabereEleme = m.asama !== "grup" && evGol === depGol;
  const gizli = (
    <>
      <input type="hidden" name="turnuva_id" value={T} />
      <input type="hidden" name="don" value={don} />
    </>
  );

  return (
    <div className="y-canli">
      <section className="y-kart">
        <div className="y-skorbord">
          <strong>{ev.ad}</strong>
          <span className="y-skor">{evGol} – {depGol}</span>
          <strong>{dep.ad}</strong>
        </div>
        {!m.canli ? (
          <form action={canliAction}>
            {gizli}<input type="hidden" name="id" value={m.id} /><input type="hidden" name="islem" value="baslat" />
            <button className="y-btn y-gol-btn" type="submit" style={{ width: "100%" }}>Maçı başlat (canlı)</button>
            <p className="y-soluk" style={{ marginTop: 8 }}>Başlayınca skor girilen gollerden hesaplanır ve sitede &quot;CANLI&quot; olarak görünür.</p>
          </form>
        ) : null}
      </section>

      {m.canli && (
        <section className="y-kart">
          <h2>Gol gir</h2>
          <form action={golEkleAction} className="y-form" key={goller.length}>
            {gizli}<input type="hidden" name="mac_id" value={m.id} />
            <div className="y-taraf" role="radiogroup" aria-label="Golü atan takım">
              <label><input type="radio" name="taraf_sec" checked={taraf === "ev"} onChange={() => { setTaraf("ev"); setKim(""); }} />{ev.ad}</label>
              <label><input type="radio" name="taraf_sec" checked={taraf === "dep"} onChange={() => { setTaraf("dep"); setKim(""); }} />{dep.ad}</label>
            </div>
            <label>Golü atan
              <select name="kim" value={secili} onChange={(e) => setKim(e.target.value)}>
                {kadro.map((o) => <option key={o.id} value={`o:${o.id}`}>{o.numara !== null ? `${o.numara} · ` : ""}{o.ad}</option>)}
                <option value={diger}>Listede yok, adını yazacağım</option>
              </select>
            </label>
            {secili === diger && <label>Oyuncu adı<input name="oyuncu" maxLength={60} required autoComplete="off" /></label>}
            <div className="y-satir">
              <label>Asist
                <select name="asist" defaultValue="">
                  <option value="">Yok / yazacağım</option>
                  {kadro.filter((o) => `o:${o.id}` !== secili).map((o) => <option key={o.id} value={`a:${o.id}`}>{o.numara !== null ? `${o.numara} · ` : ""}{o.ad}</option>)}
                </select>
              </label>
              <label>Asist adı<input name="asist_ad" maxLength={60} autoComplete="off" placeholder="Listede yoksa" /></label>
              <label>Dakika<input name="dakika" type="number" inputMode="numeric" min={1} max={130} /></label>
            </div>
            <button className="y-btn y-gol-btn" type="submit">⚽ Gol: {takim.ad}</button>
          </form>
        </section>
      )}

      <section className="y-kart">
        <h2>Goller ({goller.length})</h2>
        {goller.length === 0 ? <p className="y-bos">Henüz gol yok.</p> : (
          <ol style={{ display: "grid", gap: 6 }}>
            {[...goller].reverse().map((g) => (
              <li key={g.id}>
                {g.dakika ? `${g.dakika}' ` : ""}<strong>{g.oyuncu}</strong>
                {g.asist && <span className="y-soluk"> · asist {g.asist}</span>}
                <span className="y-soluk"> · {g.takim_id === ev.id ? ev.ad : dep.ad}</span>
              </li>
            ))}
          </ol>
        )}
        {son && (
          <form action={golSilAction}>
            <input type="hidden" name="id" value={son.id} /><input type="hidden" name="turnuva_id" value={T} />
            <button className="y-btn tehlike" type="submit">Son golü geri al</button>
          </form>
        )}
      </section>

      {m.canli && (
        <section className="y-kart">
          <h2>Maçı bitir</h2>
          <form action={canliAction} className="y-form">
            {gizli}<input type="hidden" name="id" value={m.id} /><input type="hidden" name="islem" value="bitir" />
            {berabereEleme && (
              <div className="y-satir">
                <label>{ev.ad} penaltı<input name="ev_pen" type="number" inputMode="numeric" min={0} max={30} required /></label>
                <label>{dep.ad} penaltı<input name="dep_pen" type="number" inputMode="numeric" min={0} max={30} required /></label>
              </div>
            )}
            <button className="y-btn ikincil" type="submit">Maçı bitir ({evGol}–{depGol})</button>
            <p className="y-soluk">Bitince skor kesinleşir{m.asama !== "grup" ? ", kazanan bir sonraki tura geçer" : ""}.</p>
          </form>
        </section>
      )}
    </div>
  );
}
