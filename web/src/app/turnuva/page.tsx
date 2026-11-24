import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import "./turnuva.css";
import UstMenu from "@/components/UstMenu";
import AltKisim from "@/components/AltKisim";
import { OG_BASE, SITE_AD } from "@/lib/site";
import {
  ASAMA_AD, DURUM_AD, MEVKI_KISA, SIRALI_ASAMA, asistKralligi, golKralligi, kazanan, oynandi, oyuncuBul, oyuncuIstatistik, puanDurumu, tarihYaz, turnuvaVerisi,
  type Gol, type Kart, type Mac, type Oyuncu, type Takim,
} from "@/lib/turnuva";
import Agac from "./Agac";
import BasvuruFormu from "./BasvuruFormu";
import CanliYenile from "./CanliYenile";
import PaylasDugmesi from "./PaylasDugmesi";
import TakimRozet, { TakimAdi } from "./TakimRozet";

const ACIKLAMA = "İYTE Cup: gruplar, puan durumu, eleme ağacı, fikstür, gol krallığı ve takım başvurusu.";

export async function generateMetadata(_: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const images = (await parent).openGraph?.images ?? [];
  return {
    title: "Turnuva",
    description: ACIKLAMA,
    alternates: { canonical: "/turnuva" },
    openGraph: { ...OG_BASE, title: `Turnuva · ${SITE_AD}`, description: ACIKLAMA, url: "/turnuva", images },
  };
}

export default async function Page() {
  const v = await turnuvaVerisi();
  return (
    <div className="s-sayfa t-tur">
      <UstMenu />
      <main>{v ? <Icerik v={v} /> : <Bos />}</main>
      <AltKisim />
    </div>
  );
}

function Bos() {
  return (
    <section className="s-giris kap">
      <p className="s-etiket">Turnuva</p>
      <h1>İYTE Cup</h1>
      <p className="s-soz">Yeni turnuva yakında duyurulacak. Takımını şimdiden toplamaya başla.</p>
    </section>
  );
}

type V = NonNullable<Awaited<ReturnType<typeof turnuvaVerisi>>>;

function Icerik({ v }: { v: V }) {
  const { turnuva: t, takimlar, maclar, goller, oyuncular, kartlar } = v;
  const ad = new Map(takimlar.map((k) => [k.id, k]));
  const puan = puanDurumu(takimlar, maclar);
  const kral = golKralligi(goller, takimlar).slice(0, 10);
  const asist = asistKralligi(goller, takimlar).slice(0, 10);
  const canlilar = maclar.filter((m) => m.canli && m.ev_id !== null && m.dep_id !== null);
  const final = maclar.find((m) => m.asama === "final");
  const sid = final ? kazanan(final) : null;
  const sampiyon = sid !== null ? ad.get(sid) : undefined;
  const finalist = final && sid !== null ? ad.get(sid === final.ev_id ? final.dep_id! : final.ev_id!) : undefined;
  const eleme = maclar.filter((m) => m.asama !== "grup");
  const toplamGol = maclar.reduce((s, m) => s + (m.ev_gol ?? 0) + (m.dep_gol ?? 0), 0);
  const grupSay = puan.size || Math.max(1, Math.round(t.kontenjan / 4));
  const asamalar = SIRALI_ASAMA.filter((a) => maclar.some((m) => m.asama === a));

  return (
    <>
      {canlilar.length > 0 && (
        <section className="canli-serit kap" aria-live="polite" aria-label="Canlı maçlar">
          <CanliYenile />
          {canlilar.map((m) => {
            const sonGol = goller.filter((g) => g.mac_id === m.id).at(-1);
            return (
              <div className="canli-mac" key={m.id}>
                <span className="canli-isaret">CANLI</span>
                <span className="canli-takim ev"><span>{ad.get(m.ev_id!)?.ad}</span><TakimRozet t={ad.get(m.ev_id!)} boy={28} /></span>
                <b className="canli-skor">{m.ev_gol ?? 0} - {m.dep_gol ?? 0}</b>
                <span className="canli-takim"><TakimRozet t={ad.get(m.dep_id!)} boy={28} /><span>{ad.get(m.dep_id!)?.ad}</span></span>
                {sonGol && <small className="canli-son">Son gol: {sonGol.dakika ? `${sonGol.dakika}' ` : ""}{sonGol.oyuncu}{sonGol.asist ? ` (asist: ${sonGol.asist})` : ""}</small>}
              </div>
            );
          })}
        </section>
      )}

      <section className="s-giris kap">
        <p className="s-etiket">Turnuva · {t.sezon}</p>
        <h1>{t.ad}</h1>
        <p><span className={`rozet d-${t.durum}`}>{DURUM_AD[t.durum]}</span></p>
        {t.aciklama && <p className="s-soz">{t.aciklama}</p>}
        <ul className="serit" aria-label="Turnuva formatı">
          <li><b>{takimlar.length || t.kontenjan}</b> takım</li>
          <li><b>{grupSay}</b> grup</li>
          <li><b>80</b> dakika</li>
          <li><b>5</b> değişiklik</li>
          <li><b>Tek maç</b> eleme</li>
        </ul>
        <div className="s-dugme">
          {eleme.length > 0 && <a className="btn" href="#agac">Eleme ağacı</a>}
          {puan.size > 0 && <a className="btn iki" href="#gruplar">Gruplar</a>}
          {t.basvuru_acik && <a className="btn iki" href="#basvuru">Takımını yaz</a>}
        </div>
      </section>

      {t.durum === "bitti" && sampiyon && (
        <section className="kap sampiyon-kap">
          <div className="sampiyon">
            <div>
              <p className="s-etiket">Şampiyon</p>
              <h2 className="sampiyon-ad"><TakimRozet t={sampiyon} boy={56} /><span>{sampiyon.ad}</span></h2>
              {final && finalist && (
                <p>
                  Finalde {finalist.ad} ile {final.ev_gol}-{final.dep_gol}
                  {final.ev_pen !== null && final.dep_pen !== null ? `, penaltılar ${final.ev_pen}-${final.dep_pen}` : ""}
                </p>
              )}
            </div>
            <dl>
              <div><dt>Maç</dt><dd>{maclar.filter(oynandi).length}</dd></div>
              <div><dt>Gol</dt><dd>{toplamGol}</dd></div>
              {kral[0] && <div><dt>Gol kralı</dt><dd className="kucuk">{kral[0].oyuncu}<small>{kral[0].gol} gol</small></dd></div>}
            </dl>
          </div>
        </section>
      )}

      {eleme.length > 0 && (
        <section className="s-bolum kap" id="agac">
          <div className="bas-satir"><h2>Eleme ağacı</h2><PaylasDugmesi yol={`/turnuva/gorsel/agac?t=${t.id}`} dosya={`${t.ad}-eleme-agaci`} /></div>
          <p className="s-aciklama">Rövanş yok, ikinci şans yok. Kaybeden elenir; beraberlikte penaltılar. Yarı finali kaybedenler 3.lük maçında karşılaşır.</p>
          <Agac maclar={eleme} takimlar={takimlar} />
        </section>
      )}

      {puan.size > 0 && (
        <section className="s-bolum kap" id="gruplar">
          <div className="bas-satir"><h2 className="s-h2">Gruplar</h2><Link className="paylas" href="/turnuva/kura">Kura çekimini izle →</Link></div>
          <p className="s-aciklama">Her gruptan ilk iki takım son 16&apos;ya kalır. Galibiyet 3, beraberlik 1 puan.</p>
          <div className="gruplar">
            {[...puan.entries()].map(([g, satirlar]) => (
              <div className="tablo-kap" key={g}>
                <div className="grup-bas"><span>{g} Grubu</span><PaylasDugmesi yol={`/turnuva/gorsel/grup/${g}?t=${t.id}`} dosya={`${t.ad}-${g}-grubu`} etiket="" sinif="paylas ikon" /></div>
                <table className="puan">
                  <caption className="gizli">{g} Grubu puan durumu</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="takim">Takım</th>
                      <th scope="col" title="Oynanan">O</th><th scope="col" title="Galibiyet">G</th><th scope="col" title="Beraberlik">B</th>
                      <th scope="col" title="Mağlubiyet">M</th><th scope="col" title="Atılan gol">AG</th><th scope="col" title="Yenilen gol">YG</th>
                      <th scope="col" title="Averaj">AV</th><th scope="col" title="Puan">P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {satirlar.map((s, i) => (
                      <tr key={s.takim.id} className={i < 2 ? "cikan" : undefined}>
                        <th scope="row" className="takim"><span className="no">{i + 1}</span><Link className="tk-bag" href={`/turnuva/takim/${s.takim.id}`}><TakimAdi t={s.takim} boy={20} /></Link></th>
                        <td>{s.O}</td><td>{s.G}</td><td>{s.B}</td><td>{s.M}</td><td>{s.AG}</td><td>{s.YG}</td>
                        <td>{s.AV > 0 ? `+${s.AV}` : s.AV}</td><td className="p">{s.P}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>
      )}

      {maclar.length > 0 && (
        <section className="s-bolum kap" id="fikstur">
          <h2>Fikstür ve sonuçlar</h2>
          {[...asamalar].reverse().map((a) => (
            <details key={a} className="asama" open={a === asamalar[asamalar.length - 1]}>
              <summary>{ASAMA_AD[a]}<small>{maclar.filter((m) => m.asama === a).length} maç</small></summary>
              <ol className="maclar">
                {maclar.filter((m) => m.asama === a).map((m) => <MacSatiri key={m.id} m={m} ad={ad} goller={goller.filter((g) => g.mac_id === m.id)} />)}
              </ol>
            </details>
          ))}
        </section>
      )}

      {(kral.length > 0 || asist.length > 0) && (
        <section className="s-bolum kap" id="gol-kralligi">
          <h2>Krallıklar</h2>
          <div className="kralliklar">
            <KralTablo baslik="Gol krallığı" birim="Gol" satirlar={kral.map((k) => ({ oyuncu: k.oyuncu, takim: k.takim, n: k.gol }))} takimlar={takimlar} oyuncular={oyuncular} />
            {asist.length > 0 && <KralTablo baslik="Asist krallığı" birim="Asist" satirlar={asist.map((k) => ({ oyuncu: k.oyuncu, takim: k.takim, n: k.asist }))} takimlar={takimlar} oyuncular={oyuncular} />}
          </div>
        </section>
      )}

      {oyuncular.length > 0 && (
        <section className="s-bolum kap" id="kadrolar">
          <h2>Kadrolar</h2>
          <p className="s-aciklama">Takıma dokun, kadrosu açılsın; oyuncuya dokun, gol, asist, kart ve yaşını gör. Sayılar turnuva toplamıdır.</p>
          <div className="kadrolar">
            {takimlar.filter((k) => oyuncular.some((o) => o.takim_id === k.id)).map((k) => (
              <Kadro key={k.id} takim={k} oyuncular={oyuncular.filter((o) => o.takim_id === k.id)} goller={goller.filter((g) => g.takim_id === k.id)} kartlar={kartlar.filter((x) => x.takim_id === k.id)} />
            ))}
          </div>
        </section>
      )}

      <section className="s-bolum kap" id="basvuru">
        <h2>Başvuru</h2>
        {t.basvuru_acik ? (
          <>
            <p className="s-aciklama">Takımını yaz; kaptanın okul e-postası (@std.iyte.edu.tr ya da @iyte.edu.tr) zorunlu. Başvurun onaylanınca seninle iletişime geçeriz.</p>
            <BasvuruFormu />
          </>
        ) : (
          <p className="s-kart kapali">Başvurular şu an kapalı. Yeni turnuva duyurusu için Instagram&apos;ı takip et.</p>
        )}
      </section>

      {t.kurallar && (
        <section className="s-bolum kap" id="kurallar">
          <h2>Kurallar</h2>
          <ol className="kurallar">{t.kurallar.split("\n").filter((s) => s.trim()).map((s, i) => <li key={i}>{s}</li>)}</ol>
        </section>
      )}

      {t.ornek && <p className="ornek kap">Turnuva verileri örnektir.</p>}
    </>
  );
}

function MacSatiri({ m, ad, goller }: { m: Mac; ad: Map<number, Takim>; goller: Gol[] }) {
  const k = kazanan(m);
  const tk = (id: number | null) => (id === null ? undefined : ad.get(id));
  const yaz = (l: Gol[]) => l.map((g) => `${g.oyuncu}${g.dakika ? ` ${g.dakika}'` : ""}`).join(", ");
  const evG = goller.filter((g) => g.takim_id === m.ev_id), depG = goller.filter((g) => g.takim_id === m.dep_id);
  return (
    <li className={"mac" + (m.canli ? " canli" : "")}>
      <span className="zaman">{m.canli ? <b className="canli-isaret">CANLI</b> : tarihYaz(m.zaman, true)}{m.grup ? ` · ${m.grup}` : ""}</span>
      <span className={"ev" + (k !== null && k === m.ev_id ? " galip" : "")}><TakimAdi t={tk(m.ev_id)} boy={20} /></span>
      {/* Satirin tamami mac sayfasina gider (gerilmis baglanti); paylas dugmesi ustte kalir */}
      <Link className="skor mac-git" href={`/turnuva/mac/${m.id}`} aria-label={`${tk(m.ev_id)?.ad ?? "?"} – ${tk(m.dep_id)?.ad ?? "?"} maç ayrıntısı`}>
        {oynandi(m) ? `${m.ev_gol} - ${m.dep_gol}` : "–"}
        {m.ev_pen !== null && m.dep_pen !== null && <small>pen. {m.ev_pen}-{m.dep_pen}</small>}
      </Link>
      <span className={"dep" + (k !== null && k === m.dep_id ? " galip" : "")}><TakimAdi t={tk(m.dep_id)} boy={20} /></span>
      <span className="mac-paylas">{oynandi(m) && m.ev_id !== null && m.dep_id !== null && <PaylasDugmesi yol={`/turnuva/gorsel/mac/${m.id}`} dosya={`mac-${m.id}`} etiket="" sinif="paylas ikon" />}</span>
      {goller.length > 0 && (
        <span className="mac-goller"><span>{yaz(evG)}</span><span>{yaz(depG)}</span></span>
      )}
    </li>
  );
}

function KralTablo({ baslik, birim, satirlar, takimlar, oyuncular }: { baslik: string; birim: string; satirlar: { oyuncu: string; takim: string; n: number }[]; takimlar: Takim[]; oyuncular: Oyuncu[] }) {
  const tk = new Map(takimlar.map((t) => [t.ad, t]));
  const isim = (ad: string, takim: string) => {
    const o = oyuncuBul(oyuncular, tk.get(takim)?.id, ad);
    return o ? <Link className="tk-bag" href={`/turnuva/oyuncu/${o.id}`}>{ad}</Link> : ad;
  };
  return (
    <div className="tablo-kap">
      <table className="kral">
        <caption>{baslik}</caption>
        <thead><tr><th scope="col">#</th><th scope="col">Oyuncu</th><th scope="col">Takım</th><th scope="col">{birim}</th></tr></thead>
        <tbody>
          {satirlar.map((k, i) => (
            <tr key={k.oyuncu + k.takim}>
              <td>{i + 1}</td><th scope="row">{isim(k.oyuncu, k.takim)}</th><td>{tk.get(k.takim) ? <Link className="tk-bag" href={`/turnuva/takim/${tk.get(k.takim)!.id}`}><TakimAdi t={tk.get(k.takim)} boy={18} /></Link> : <TakimAdi t={undefined} bos={k.takim} boy={18} />}</td><td className="p">{k.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Kadro({ takim, oyuncular, goller, kartlar }: { takim: Takim; oyuncular: Oyuncu[]; goller: Gol[]; kartlar: Kart[] }) {
  return (
    <details className="kadro">
      <summary><TakimAdi t={takim} boy={26} /><small>{oyuncular.length} oyuncu</small></summary>
      <ol>
        {oyuncular.map((o) => {
          const i = oyuncuIstatistik(o, goller, kartlar);
          return (
            <li key={o.id}>
              <span className="no">{o.numara ?? "–"}</span>
              <Link className="ad tk-bag" href={`/turnuva/oyuncu/${o.id}`}>{o.ad}{o.mevki && <small className="yas"> · {MEVKI_KISA[o.mevki] ?? o.mevki}</small>}{o.yas !== null && <small className="yas"> · {o.yas}</small>}</Link>
              <span className="ist">
                {i.gol > 0 && <b>{i.gol} gol</b>}{i.asist > 0 && <i>{i.asist} asist</i>}
                {i.sari > 0 && <span className="kart-s sari" title="Sarı kart">{i.sari}</span>}
                {i.kirmizi > 0 && <span className="kart-s kirmizi" title="Kırmızı kart">{i.kirmizi}</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <Link className="kadro-git" href={`/turnuva/takim/${takim.id}`}>Takım sayfası →</Link>
    </details>
  );
}
