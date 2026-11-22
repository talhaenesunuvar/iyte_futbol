import Link from "next/link";
import { notFound } from "next/navigation";
import { yetkiGerekli } from "@/lib/yetki";
import { waNumara } from "@/lib/islem";
import {
  ASAMA_AD, DURUM_AD, ELEME, GRUP_HARF, basvurular, kazanan, oynandi, puanDurumu, turnuvaPanel, yerelDeger,
  type Gol, type Mac, type Takim,
} from "@/lib/turnuva";
import TurnuvaFormu from "../TurnuvaFormu";
import {
  basvuruOnaylaAction, basvuruReddetAction, elemeOlusturAction, golEkleAction, golSilAction, grupFiksturuAction,
  kuraCekAction, macKaydetAction, takimEkleAction, takimGuncelleAction, takimSilAction, turnuvaSilAction,
} from "../islemler";

export const metadata = { title: "Turnuva yönet" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ hata?: string | string[] }> };

export default async function TurnuvaYonet({ params, searchParams }: Props) {
  await yetkiGerekli();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const v = await turnuvaPanel(id);
  if (!v) notFound();
  const hataH = (await searchParams).hata;
  const hata = Array.isArray(hataH) ? hataH[0] : hataH;
  const { turnuva: t, takimlar, maclar, goller } = v;
  const bv = await basvurular(id);
  const bekleyen = bv.filter((b) => b.durum === "bekliyor");
  const puan = puanDurumu(takimlar, maclar);
  const grupMac = maclar.filter((m) => m.asama === "grup");
  const elemeMac = maclar.filter((m) => m.asama !== "grup");
  const asamalar = (["grup", ...ELEME] as const).filter((a) => maclar.some((m) => m.asama === a));
  const G = Math.max(1, Math.round(t.kontenjan / 4));
  const T = t.id;

  return (
    <>
      <div className="y-baslik">
        <div>
          <p className="y-soluk"><Link href="/yonetim/turnuva">← Turnuvalar</Link></p>
          <h1>{t.ad} <span className="y-soluk">{t.sezon}</span></h1>
        </div>
        <div className="y-dugmeler">
          {t.aktif && <span className="y-rozet yesil">Sitede</span>}
          <span className="y-rozet gri">{DURUM_AD[t.durum]}</span>
          <Link className="y-btn ikincil kucuk" href="/turnuva" target="_blank">Sayfayı aç ↗</Link>
        </div>
      </div>
      {hata && <p className="y-kart y-hata" role="alert">{hata}</p>}

      <section className="y-kart">
        <details className="y-ac">
          <summary>Turnuva bilgileri ve kurallar</summary>
          <div style={{ marginTop: 14 }}><TurnuvaFormu varsayilan={{ ...t }} /></div>
        </details>
      </section>

      <section className="y-kart" id="basvurular">
        <h2>Başvurular {bekleyen.length > 0 && <span className="y-rozet kirmizi">{bekleyen.length} bekliyor</span>}</h2>
        {bv.length === 0 ? <p className="y-bos">Başvuru yok.{!t.basvuru_acik && " Başvurular kapalı."}</p> : (
          <div className="y-tablo-kap">
            <table className="y-tablo">
              <thead><tr><th>Takım</th><th>Kaptan</th><th>İletişim</th><th>Oyuncular</th><th>Durum</th><th></th></tr></thead>
              <tbody>
                {bv.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.takim_ad}</strong></td>
                    <td>{b.kaptan}</td>
                    <td><a href={`https://wa.me/${waNumara(b.telefon)}`} target="_blank" rel="noopener noreferrer">{b.telefon}</a><br /><span className="y-soluk">{b.eposta}</span></td>
                    <td><details><summary className="y-soluk">{b.oyuncular.split("\n").filter(Boolean).length} oyuncu</summary><pre style={{ whiteSpace: "pre-wrap", font: "inherit", margin: 0 }}>{b.oyuncular}</pre></details></td>
                    <td><span className={`y-rozet ${b.durum === "bekliyor" ? "sari" : b.durum === "onaylandi" ? "yesil" : "gri"}`}>{b.durum === "bekliyor" ? "Bekliyor" : b.durum === "onaylandi" ? "Onaylandı" : "Reddedildi"}</span></td>
                    <td className="sag">
                      {b.durum === "bekliyor" && (
                        <div className="y-dugmeler" style={{ justifyContent: "flex-end" }}>
                          <form action={basvuruOnaylaAction}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="turnuva_id" value={T} /><button className="y-btn kucuk" type="submit">Onayla</button></form>
                          <form action={basvuruReddetAction}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="turnuva_id" value={T} /><button className="y-btn tehlike kucuk" type="submit">Reddet</button></form>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="y-kart" id="takimlar">
        <div className="y-baslik">
          <h2>Takımlar <span className="y-soluk">{takimlar.length} / {t.kontenjan}</span></h2>
          <details className="y-ac">
            <summary>Kura çek</summary>
            <form action={kuraCekAction} className="y-dugmeler" style={{ marginTop: 8 }}>
              <input type="hidden" name="turnuva_id" value={T} />
              <span className="y-soluk">{G} gruba her torbadan birer takım dağıtılır; mevcut gruplar değişir.</span>
              <button className="y-btn" type="submit">Kurayı çek</button>
            </form>
          </details>
        </div>
        <form action={takimEkleAction} className="y-satir">
          <input type="hidden" name="turnuva_id" value={T} />
          <label>Takım adı<input name="ad" maxLength={60} required /></label>
          <label>Torba<input name="torba" type="number" min={1} max={8} /></label>
          <label>Grup<GrupSec ad="grup" deger={null} G={G} /></label>
          <div><button className="y-btn" type="submit">Takım ekle</button></div>
        </form>
        {takimlar.length > 0 && (
          <div className="y-tablo-kap">
            <table className="y-tablo">
              <thead><tr><th>Takım</th><th>Torba</th><th>Grup</th><th></th></tr></thead>
              <tbody>
                {takimlar.map((k) => {
                  const fid = `tk-${k.id}`;
                  return (
                    <tr key={k.id}>
                      <td><input form={fid} name="ad" defaultValue={k.ad} maxLength={60} aria-label="Takım adı" /></td>
                      <td style={{ width: 90 }}><input form={fid} name="torba" type="number" min={1} max={8} defaultValue={k.torba ?? ""} aria-label="Torba" /></td>
                      <td style={{ width: 90 }}><GrupSec form={fid} ad="grup" deger={k.grup} G={Math.max(G, GRUP_HARF.indexOf(k.grup ?? "A") + 1)} /></td>
                      <td className="sag" style={{ whiteSpace: "nowrap" }}>
                        <form id={fid} action={takimGuncelleAction} className="y-satirici">
                          <input type="hidden" name="id" value={k.id} /><input type="hidden" name="turnuva_id" value={T} />
                          <button className="y-btn ikincil kucuk" type="submit">Kaydet</button>
                        </form>{" "}
                        <form action={takimSilAction} className="y-satirici">
                          <input type="hidden" name="id" value={k.id} /><input type="hidden" name="turnuva_id" value={T} />
                          <button className="y-btn tehlike kucuk" type="submit" title="Takımın maçları boşa düşer, golleri silinir">Sil</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="y-kart" id="maclar">
        <div className="y-baslik">
          <h2>Maçlar</h2>
          <div className="y-dugmeler">
            <details className="y-ac">
              <summary>{grupMac.length ? "Grup fikstürünü yeniden oluştur" : "Grup fikstürü oluştur"}</summary>
              <form action={grupFiksturuAction} className="y-dugmeler" style={{ marginTop: 8 }}>
                <input type="hidden" name="turnuva_id" value={T} />
                <span className="y-soluk">{grupMac.length ? `Mevcut ${grupMac.length} grup maçı ve golleri silinir.` : "Grup içi tek devre."}</span>
                <button className={grupMac.length ? "y-btn tehlike" : "y-btn"} type="submit">Onayla</button>
              </form>
            </details>
            <details className="y-ac">
              <summary>{elemeMac.length ? "Eleme ağacını yeniden oluştur" : "Eleme ağacını oluştur"}</summary>
              <form action={elemeOlusturAction} className="y-dugmeler" style={{ marginTop: 8 }}>
                <input type="hidden" name="turnuva_id" value={T} />
                <span className="y-soluk">Grup sıralamasından (A1–B2, C1–D2 …). {elemeMac.length ? "Mevcut eleme maçları silinir." : ""}</span>
                <button className={elemeMac.length ? "y-btn tehlike" : "y-btn"} type="submit">Onayla</button>
              </form>
            </details>
          </div>
        </div>
        {puan.size > 0 && (
          <details className="y-ac">
            <summary>Puan durumu</summary>
            <div className="y-izgara" style={{ marginTop: 10 }}>
              {[...puan.entries()].map(([g, s]) => (
                <div key={g} className="y-soluk"><strong>{g}:</strong> {s.map((x, i) => `${i + 1}. ${x.takim.ad} (${x.P})`).join(", ")}</div>
              ))}
            </div>
          </details>
        )}
        {maclar.length === 0 && <p className="y-bos">Maç yok. Takımları gruplara yerleştirip grup fikstürünü oluştur.</p>}
        {asamalar.map((a) => (
          <details key={a} className="y-ac" open={a !== "grup" || elemeMac.length === 0}>
            <summary>{ASAMA_AD[a]} <span className="y-soluk">({maclar.filter((m) => m.asama === a).filter(oynandi).length}/{maclar.filter((m) => m.asama === a).length} oynandı)</span></summary>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {maclar.filter((m) => m.asama === a).map((m) => <MacKarti key={m.id} m={m} T={T} takimlar={takimlar} goller={goller.filter((g) => g.mac_id === m.id)} />)}
            </div>
          </details>
        ))}
      </section>

      <section className="y-kart">
        <details className="y-ac">
          <summary>Turnuvayı sil</summary>
          <form action={turnuvaSilAction} className="y-dugmeler" style={{ marginTop: 8 }}>
            <input type="hidden" name="id" value={T} />
            <span className="y-soluk">Takımlar, maçlar, goller ve başvurular dahil her şey kalıcı olarak silinir.</span>
            <button className="y-btn tehlike" type="submit">Kalıcı olarak sil</button>
          </form>
        </details>
      </section>
    </>
  );
}

function GrupSec({ ad, deger, G, form }: { ad: string; deger: string | null; G: number; form?: string }) {
  return (
    <select name={ad} defaultValue={deger ?? ""} form={form} aria-label="Grup">
      <option value="">—</option>
      {GRUP_HARF.slice(0, Math.max(1, G)).map((h) => <option key={h} value={h}>{h}</option>)}
    </select>
  );
}

function MacKarti({ m, T, takimlar, goller }: { m: Mac; T: number; takimlar: Takim[]; goller: Gol[] }) {
  const ad = (id: number | null) => (id === null ? "Belli değil" : takimlar.find((k) => k.id === id)?.ad ?? "?");
  const k = kazanan(m);
  const eleme = m.asama !== "grup";
  const fid = `mf-${m.id}`;
  return (
    <div id={`mac-${m.id}`} style={{ border: "1px solid var(--y-cizgi)", borderRadius: "var(--k-m)", padding: 12, display: "grid", gap: 10 }}>
      <form id={fid} action={macKaydetAction} className="y-satir">
        <input type="hidden" name="id" value={m.id} /><input type="hidden" name="turnuva_id" value={T} />
        {eleme ? (
          <>
            <label>Ev{m.sira ? ` (#${m.sira})` : ""}<TakimSec ad="ev_id" deger={m.ev_id} takimlar={takimlar} /></label>
            <label>Deplasman<TakimSec ad="dep_id" deger={m.dep_id} takimlar={takimlar} /></label>
          </>
        ) : (
          <div style={{ alignSelf: "center", gridColumn: "span 2" }}>
            <span className="y-rozet gri">{m.grup}</span> <strong style={{ color: k === m.ev_id && k ? "var(--bordo)" : undefined }}>{ad(m.ev_id)}</strong>
            <span className="y-soluk"> – </span><strong style={{ color: k === m.dep_id && k ? "var(--bordo)" : undefined }}>{ad(m.dep_id)}</strong>
          </div>
        )}
        <label>Tarih-saat<input name="zaman" type="datetime-local" defaultValue={yerelDeger(m.zaman)} /></label>
        <label>Saha<input name="saha" defaultValue={m.saha} maxLength={60} /></label>
        <label>Skor
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input name="ev_gol" type="number" min={0} max={99} defaultValue={m.ev_gol ?? ""} aria-label="Ev golü" style={{ width: 64 }} />–
            <input name="dep_gol" type="number" min={0} max={99} defaultValue={m.dep_gol ?? ""} aria-label="Deplasman golü" style={{ width: 64 }} />
          </span>
        </label>
        {eleme && (
          <label>Penaltı
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input name="ev_pen" type="number" min={0} max={99} defaultValue={m.ev_pen ?? ""} aria-label="Ev penaltı" style={{ width: 64 }} />–
              <input name="dep_pen" type="number" min={0} max={99} defaultValue={m.dep_pen ?? ""} aria-label="Deplasman penaltı" style={{ width: 64 }} />
            </span>
          </label>
        )}
        <div><button className="y-btn" type="submit">Kaydet</button></div>
      </form>
      {m.ev_id !== null && m.dep_id !== null && (
        <details className="y-ac">
          <summary>Goller ({goller.length})</summary>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {goller.map((g) => (
              <form key={g.id} action={golSilAction} className="y-dugmeler">
                <input type="hidden" name="id" value={g.id} /><input type="hidden" name="turnuva_id" value={T} />
                <span>{g.dakika ? `${g.dakika}'` : "–"} <strong>{g.oyuncu}</strong> <span className="y-soluk">{ad(g.takim_id)}</span></span>
                <button className="y-btn tehlike kucuk" type="submit">Sil</button>
              </form>
            ))}
            <form action={golEkleAction} className="y-satir">
              <input type="hidden" name="mac_id" value={m.id} /><input type="hidden" name="turnuva_id" value={T} />
              <label>Takım
                <select name="takim_id" defaultValue={m.ev_id}>
                  <option value={m.ev_id}>{ad(m.ev_id)}</option>
                  <option value={m.dep_id}>{ad(m.dep_id)}</option>
                </select>
              </label>
              <label>Oyuncu<input name="oyuncu" maxLength={60} required /></label>
              <label>Dakika<input name="dakika" type="number" min={1} max={130} /></label>
              <div><button className="y-btn ikincil" type="submit">Gol ekle</button></div>
            </form>
          </div>
        </details>
      )}
    </div>
  );
}

function TakimSec({ ad, deger, takimlar }: { ad: string; deger: number | null; takimlar: Takim[] }) {
  return (
    <select name={ad} defaultValue={deger ?? ""}>
      <option value="">— Belli değil —</option>
      {takimlar.map((k) => <option key={k.id} value={k.id}>{k.ad}{k.grup ? ` (${k.grup})` : ""}</option>)}
    </select>
  );
}
