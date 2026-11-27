import Link from "next/link";
import { notFound } from "next/navigation";
import { yetkiGerekli } from "@/lib/yetki";
import { waNumara } from "@/lib/islem";
import {
  ASAMA_AD, DURUM_AD, GRUP_HARF, MEVKILER, SINIFLAR, SIRALI_ASAMA, basvurular, kazanan, oynandi, oyuncuGizli, puanDurumu, renkGecerli, turnuvaPanel, yerelDeger,
  type Gol, type Kart, type Mac, type Oyuncu, type OyuncuGizli, type Takim,
} from "@/lib/turnuva";
import TurnuvaFormu from "../TurnuvaFormu";
import LogoYukle from "../LogoYukle";
import PaylasDugmesi from "@/app/turnuva/PaylasDugmesi";
import {
  basvuruOnaylaAction, basvuruReddetAction, elemeOlusturAction, golEkleAction, golSilAction, grupFiksturuAction,
  kadroTopluAction, kartEkleAction, kartSilAction, kuraCekAction, macKaydetAction, oyuncuEkleAction, oyuncuGuncelleAction, oyuncuSilAction,
  takimEkleAction, takimGuncelleAction, takimSilAction, turnuvaSilAction,
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
  const { turnuva: t, takimlar, maclar, goller, oyuncular, kartlar } = v;
  const gizli = await oyuncuGizli(id);
  const bv = await basvurular(id);
  const bekleyen = bv.filter((b) => b.durum === "bekliyor");
  const puan = puanDurumu(takimlar, maclar);
  const grupMac = maclar.filter((m) => m.asama === "grup");
  const elemeMac = maclar.filter((m) => m.asama !== "grup");
  const asamalar = SIRALI_ASAMA.filter((a) => maclar.some((m) => m.asama === a));
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
          <div>
            <h2>Takımlar <span className="y-soluk">{takimlar.length} / {t.kontenjan}</span></h2>
            <p className="y-soluk">Oyuncu eklemek için takımın satırındaki &quot;oyuncu →&quot; bağlantısına ya da aşağıdaki Kadrolar bölümüne git.</p>
          </div>
          <details className="y-ac">
            <summary>Kura çek</summary>
            <form action={kuraCekAction} className="y-dugmeler" style={{ marginTop: 8 }}>
              <input type="hidden" name="turnuva_id" value={T} />
              <span className="y-soluk">{G} gruba her torbadan birer takım dağıtılır; mevcut gruplar değişir.</span>
              <button className="y-btn" type="submit">Kurayı çek</button>
            </form>
            {/* Kura ekrani: cekilen kuranin sirasini animasyonla oynatir (etkinlikte tam ekran projeksiyon) */}
            <div className="y-dugmeler" style={{ marginTop: 8 }}>
              <span className="y-soluk">Çekilen kura, kura ekranında takım takım animasyonla oynatılır.</span>
              <Link className="y-btn ikincil" href={`/turnuva/kura?t=${T}`} target="_blank" rel="noopener">Canlı kura ekranını aç ↗</Link>
            </div>
          </details>
        </div>
        <form action={takimEkleAction} className="y-satir">
          <input type="hidden" name="turnuva_id" value={T} />
          <label>Takım adı<input name="ad" maxLength={60} required /></label>
          <label>Torba<input name="torba" type="number" min={1} max={8} /></label>
          <label>Grup<GrupSec ad="grup" deger={null} G={G} /></label>
          <label>Renk<input name="renk" type="color" defaultValue="#8B151A" /></label>
          <div><button className="y-btn" type="submit">Takım ekle</button></div>
        </form>
        {takimlar.length > 0 && (
          <div className="y-tablo-kap">
            <table className="y-tablo">
              <thead><tr><th>Takım</th><th>Torba</th><th>Grup</th><th>Renk</th><th>Logo</th><th>Kadro</th><th></th></tr></thead>
              <tbody>
                {takimlar.map((k) => {
                  const fid = `tk-${k.id}`;
                  return (
                    <tr key={k.id}>
                      <td><input form={fid} name="ad" defaultValue={k.ad} maxLength={60} aria-label="Takım adı" /></td>
                      <td style={{ width: 90 }}><input form={fid} name="torba" type="number" min={1} max={8} defaultValue={k.torba ?? ""} aria-label="Torba" /></td>
                      <td style={{ width: 90 }}><GrupSec form={fid} ad="grup" deger={k.grup} G={Math.max(G, GRUP_HARF.indexOf(k.grup ?? "A") + 1)} /></td>
                      <td style={{ width: 64 }}><input form={fid} name="renk" type="color" defaultValue={renkGecerli(k.renk) ? k.renk : "#B2B5B9"} aria-label="Takım rengi" style={{ padding: 2, height: 36 }} /></td>
                      <td><LogoYukle formId={fid} mevcut={k.logo_v ? `/turnuva/logo/${k.id}?v=${k.logo_v}` : null} /></td>
                      <td style={{ whiteSpace: "nowrap" }}><a href={`#kadro-${k.id}`}>{oyuncular.filter((o) => o.takim_id === k.id).length} oyuncu →</a></td>
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

      <section className="y-kart" id="kadrolar">
        <h2>Kadrolar <span className="y-soluk">{oyuncular.length} oyuncu</span></h2>
        <p className="y-soluk">
          Takımı aç, oyuncuyu tek tek ya da toplu ekle. <strong>Bölüm ve öğrenci no yalnızca bu panelde görünür</strong>; sitede ad, numara, yaş,
          gol, asist ve kartlar çıkar. Toplu eklemede her satıra bir oyuncu: &quot;10 Ahmet Yılmaz&quot;; yaş ve bölümü sonra tablodan doldur.
        </p>
        {takimlar.length === 0 ? <p className="y-bos">Önce takım ekle.</p> : (
          <div style={{ display: "grid", gap: 8 }}>
            {takimlar.map((k) => (
              <KadroPanel key={k.id} k={k} T={T} oyuncular={oyuncular.filter((o) => o.takim_id === k.id)} gizli={gizli} />
            ))}
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
            <summary>Puan durumu ve paylaşım</summary>
            <div className="y-izgara" style={{ marginTop: 10 }}>
              {[...puan.entries()].map(([g, s]) => (
                <div key={g} className="y-soluk" style={{ display: "grid", gap: 6, justifyItems: "start" }}>
                  <span><strong>{g}:</strong> {s.map((x, i) => `${i + 1}. ${x.takim.ad} (${x.P})`).join(", ")}</span>
                  <PaylasDugmesi yol={`/turnuva/gorsel/grup/${g}?t=${T}`} dosya={`${t.ad}-${g}-grubu`} etiket={`${g} grubu görseli`} sinif="y-btn ikincil kucuk" />
                </div>
              ))}
              {elemeMac.length > 0 && <PaylasDugmesi yol={`/turnuva/gorsel/agac?t=${T}`} dosya={`${t.ad}-eleme-agaci`} etiket="Eleme ağacı görseli" sinif="y-btn ikincil kucuk" />}
            </div>
          </details>
        )}
        {maclar.length === 0 && <p className="y-bos">Maç yok. Takımları gruplara yerleştirip grup fikstürünü oluştur.</p>}
        {asamalar.map((a) => (
          <details key={a} className="y-ac" open={a !== "grup" || elemeMac.length === 0}>
            <summary>{ASAMA_AD[a]} <span className="y-soluk">({maclar.filter((m) => m.asama === a).filter(oynandi).length}/{maclar.filter((m) => m.asama === a).length} oynandı)</span></summary>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {maclar.filter((m) => m.asama === a).map((m) => <MacKarti key={`${m.id}-${m.ev_id}-${m.dep_id}-${m.ev_gol}-${m.dep_gol}-${m.ev_pen}-${m.dep_pen}`} m={m} T={T} takimlar={takimlar} oyuncular={oyuncular} goller={goller.filter((g) => g.mac_id === m.id)} kartlar={kartlar.filter((x) => x.mac_id === m.id)} />)}
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

function MacKarti({ m, T, takimlar, oyuncular, goller, kartlar }: { m: Mac; T: number; takimlar: Takim[]; oyuncular: Oyuncu[]; goller: Gol[]; kartlar: Kart[] }) {
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
        <label>Hakem<input name="hakem" defaultValue={m.hakem} maxLength={60} placeholder="Ad Soyad" /></label>
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
        <div className="y-dugmeler">
          <button className="y-btn" type="submit">Kaydet</button>
          {m.ev_id !== null && m.dep_id !== null && <Link className="y-btn ikincil" href={`/yonetim/turnuva/mac/${m.id}`}>{m.canli ? "● Canlı yönet" : "Canlı yönet"}</Link>}
          {oynandi(m) && m.ev_id !== null && m.dep_id !== null && <PaylasDugmesi yol={`/turnuva/gorsel/mac/${m.id}`} dosya={`mac-${m.id}`} etiket="Görsel" sinif="y-btn ikincil" />}
          {m.canli && <span className="y-rozet kirmizi">CANLI</span>}
        </div>
      </form>
      {m.ev_id !== null && m.dep_id !== null && (
        <details className="y-ac">
          <summary>Goller ({goller.length})</summary>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {goller.map((g) => (
              <form key={g.id} action={golSilAction} className="y-dugmeler">
                <input type="hidden" name="id" value={g.id} /><input type="hidden" name="turnuva_id" value={T} />
                <span>{g.dakika ? `${g.dakika}'` : "–"} <strong>{g.oyuncu}</strong>{g.asist && <span className="y-soluk"> (asist: {g.asist})</span>} <span className="y-soluk">{ad(g.takim_id)}</span></span>
                <button className="y-btn tehlike kucuk" type="submit">Sil</button>
              </form>
            ))}
            <form action={golEkleAction} className="y-satir">
              <input type="hidden" name="mac_id" value={m.id} /><input type="hidden" name="turnuva_id" value={T} />
              <label>Golü atan<GolcuSec m={m} takimlar={takimlar} oyuncular={oyuncular} /></label>
              <label>Adı (listede yoksa)<input name="oyuncu" maxLength={60} placeholder="Diğer seçiliyse" /></label>
              <label>Asist<AsistSec m={m} takimlar={takimlar} oyuncular={oyuncular} /></label>
              <label>Asist adı (listede yoksa)<input name="asist_ad" maxLength={60} /></label>
              <label>Dakika<input name="dakika" type="number" min={1} max={130} /></label>
              <div><button className="y-btn ikincil" type="submit">Gol ekle</button></div>
            </form>
          </div>
        </details>
      )}
      {m.ev_id !== null && m.dep_id !== null && (
        <details className="y-ac">
          <summary>Kartlar ({kartlar.length}){kartlar.length > 0 && <> · <KartSay l={kartlar} /></>}</summary>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {kartlar.map((x) => (
              <form key={x.id} action={kartSilAction} className="y-dugmeler">
                <input type="hidden" name="id" value={x.id} /><input type="hidden" name="turnuva_id" value={T} />
                <span><KartIkon renk={x.renk} /> {x.dakika ? `${x.dakika}'` : "–"} <strong>{x.oyuncu}</strong> <span className="y-soluk">{ad(x.takim_id)}</span></span>
                <button className="y-btn tehlike kucuk" type="submit">Sil</button>
              </form>
            ))}
            <form action={kartEkleAction} className="y-satir">
              <input type="hidden" name="mac_id" value={m.id} /><input type="hidden" name="turnuva_id" value={T} />
              <label>Oyuncu<GolcuSec m={m} takimlar={takimlar} oyuncular={oyuncular} /></label>
              <label>Adı (listede yoksa)<input name="oyuncu" maxLength={60} placeholder="Diğer seçiliyse" /></label>
              <label>Kart
                <select name="renk" defaultValue="sari">
                  <option value="sari">Sarı kart</option>
                  <option value="kirmizi">Kırmızı kart</option>
                </select>
              </label>
              <label>Dakika<input name="dakika" type="number" min={1} max={130} /></label>
              <div><button className="y-btn ikincil" type="submit">Kart ekle</button></div>
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

// Gol atan: iki takimin kadrolari (o:<id>) + her takim icin "Diger" (t:<id>, ad serbest yazilir)
function GolcuSec({ m, takimlar, oyuncular }: { m: Mac; takimlar: Takim[]; oyuncular: Oyuncu[] }) {
  const taraf = [m.ev_id, m.dep_id].filter((x): x is number => x !== null);
  return (
    <select name="kim" defaultValue={`t:${m.ev_id}`}>
      {taraf.map((tid) => {
        const k = takimlar.find((x) => x.id === tid);
        return (
          <optgroup key={tid} label={k?.ad ?? "?"}>
            {oyuncular.filter((o) => o.takim_id === tid).map((o) => <option key={o.id} value={`o:${o.id}`}>{o.numara !== null ? `${o.numara} · ` : ""}{o.ad}</option>)}
            <option value={`t:${tid}`}>Diğer ({k?.ad})</option>
          </optgroup>
        );
      })}
    </select>
  );
}

function AsistSec({ m, takimlar, oyuncular }: { m: Mac; takimlar: Takim[]; oyuncular: Oyuncu[] }) {
  const taraf = [m.ev_id, m.dep_id].filter((x): x is number => x !== null);
  return (
    <select name="asist" defaultValue="">
      <option value="">Asist yok / yazacağım</option>
      {taraf.map((tid) => (
        <optgroup key={tid} label={takimlar.find((x) => x.id === tid)?.ad ?? "?"}>
          {oyuncular.filter((o) => o.takim_id === tid).map((o) => <option key={o.id} value={`a:${o.id}`}>{o.numara !== null ? `${o.numara} · ` : ""}{o.ad}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

function KartIkon({ renk }: { renk: Kart["renk"] }) {
  return <span aria-label={renk === "sari" ? "Sarı kart" : "Kırmızı kart"} style={{ display: "inline-block", width: 10, height: 14, borderRadius: 2, verticalAlign: "-2px", background: renk === "sari" ? "#F2C200" : "#C62828" }} />;
}
function KartSay({ l }: { l: Kart[] }) {
  const s = l.filter((x) => x.renk === "sari").length, k = l.length - s;
  return <span className="y-soluk">{s > 0 && <>{s} sarı</>}{s > 0 && k > 0 && ", "}{k > 0 && <>{k} kırmızı</>}</span>;
}

function Secim({ form, ad, l, deger, etiket }: { form?: string; ad: string; l: readonly string[]; deger: string; etiket?: string }) {
  return (
    <select form={form} name={ad} defaultValue={deger} aria-label={etiket}>
      <option value="">—</option>
      {l.map((x) => <option key={x} value={x}>{x}</option>)}
    </select>
  );
}

// Takim kadrosu: her oyuncu bir satir (form niteligiyle satir ici duzenleme), altta tekli ve toplu ekleme
function KadroPanel({ k, T, oyuncular, gizli }: { k: Takim; T: number; oyuncular: Oyuncu[]; gizli: Map<number, OyuncuGizli> }) {
  return (
    <details className="y-ac" id={`kadro-${k.id}`}>
      <summary>{k.ad} <span className="y-soluk">({oyuncular.length} oyuncu)</span></summary>
      <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
        {oyuncular.length > 0 && (
          <div className="y-tablo-kap">
            <table className="y-tablo">
              <thead><tr><th>No</th><th>Foto</th><th>Ad soyad</th><th>Mevki</th><th>Yaş</th><th>Bölüm</th><th>Sınıf</th><th>Öğrenci no <span className="y-soluk">(gizli)</span></th><th></th></tr></thead>
              <tbody>
                {oyuncular.map((o) => {
                  const fid = `oy-${o.id}`, g = gizli.get(o.id);
                  return (
                    <tr key={o.id}>
                      <td style={{ width: 70 }}><input form={fid} name="numara" type="number" min={0} max={99} defaultValue={o.numara ?? ""} aria-label="Forma no" /></td>
                      <td style={{ whiteSpace: "nowrap" }}><LogoYukle formId={fid} alan="foto" dugme="Foto" kirp mevcut={o.foto_v ? `/turnuva/oyuncu/${o.id}/foto?v=${o.foto_v}` : null} /></td>
                      <td><input form={fid} name="ad" defaultValue={o.ad} maxLength={60} required aria-label="Ad soyad" /></td>
                      <td style={{ width: 120 }}><Secim form={fid} ad="mevki" l={MEVKILER} deger={o.mevki} etiket="Mevki" /></td>
                      <td style={{ width: 70 }}><input form={fid} name="yas" type="number" min={10} max={80} defaultValue={o.yas ?? ""} aria-label="Yaş" /></td>
                      <td><input form={fid} name="bolum" defaultValue={o.bolum} maxLength={80} aria-label="Bölüm" placeholder="Bilgisayar Müh." /></td>
                      <td style={{ width: 130 }}><Secim form={fid} ad="sinif" l={SINIFLAR} deger={o.sinif} etiket="Sınıf" /></td>
                      <td style={{ width: 140 }}><input form={fid} name="ogrenci_no" defaultValue={g?.ogrenci_no ?? ""} maxLength={20} inputMode="numeric" aria-label="Öğrenci no" /></td>
                      <td className="sag" style={{ whiteSpace: "nowrap" }}>
                        <form id={fid} action={oyuncuGuncelleAction} className="y-satirici">
                          <input type="hidden" name="id" value={o.id} /><input type="hidden" name="turnuva_id" value={T} />
                          <button className="y-btn ikincil kucuk" type="submit">Kaydet</button>
                        </form>{" "}
                        <form action={oyuncuSilAction} className="y-satirici">
                          <input type="hidden" name="id" value={o.id} /><input type="hidden" name="turnuva_id" value={T} />
                          <button className="y-btn tehlike kucuk" type="submit" title="Golleri ve kartları ad olarak kalır">Sil</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <form action={oyuncuEkleAction} className="y-satir">
          <input type="hidden" name="turnuva_id" value={T} /><input type="hidden" name="takim_id" value={k.id} />
          <label>No<input name="numara" type="number" min={0} max={99} /></label>
          <label>Ad soyad<input name="ad" maxLength={60} required /></label>
          <label>Mevki<Secim ad="mevki" l={MEVKILER} deger="" /></label>
          <label>Yaş<input name="yas" type="number" min={10} max={80} /></label>
          <label>Bölüm<input name="bolum" maxLength={80} /></label>
          <label>Sınıf<Secim ad="sinif" l={SINIFLAR} deger="" /></label>
          <label>Öğrenci no (gizli)<input name="ogrenci_no" maxLength={20} inputMode="numeric" /></label>
          <div><button className="y-btn" type="submit">Oyuncu ekle</button></div>
        </form>
        <details className="y-ac">
          <summary>Toplu ekle (liste yapıştır)</summary>
          <form action={kadroTopluAction} className="y-form" style={{ marginTop: 8 }}>
            <input type="hidden" name="turnuva_id" value={T} /><input type="hidden" name="takim_id" value={k.id} />
            <label>Her satıra bir oyuncu<textarea name="liste" rows={5} placeholder={"1 Mert Kaya\n10 Emre Demir\nCan Aydın"} /></label>
            <div><button className="y-btn ikincil" type="submit">Listeyi ekle</button></div>
          </form>
        </details>
        <p className="y-soluk"><Link href={`/turnuva/takim/${k.id}`} target="_blank">Takım sayfasını sitede aç ↗</Link></p>
      </div>
    </details>
  );
}
