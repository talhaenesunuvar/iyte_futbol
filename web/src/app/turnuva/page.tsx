import type { Metadata, ResolvingMetadata } from "next";
import "./turnuva.css";
import UstMenu from "@/components/UstMenu";
import AltKisim from "@/components/AltKisim";
import { OG_BASE, SITE_AD } from "@/lib/site";
import {
  ASAMA_AD, DURUM_AD, ELEME, golKralligi, kazanan, oynandi, puanDurumu, tarihYaz, turnuvaVerisi,
  type Mac, type Takim,
} from "@/lib/turnuva";
import Agac from "./Agac";
import BasvuruFormu from "./BasvuruFormu";

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
  const { turnuva: t, takimlar, maclar, goller } = v;
  const ad = new Map(takimlar.map((k) => [k.id, k]));
  const puan = puanDurumu(takimlar, maclar);
  const kral = golKralligi(goller, takimlar).slice(0, 10);
  const final = maclar.find((m) => m.asama === "final");
  const sid = final ? kazanan(final) : null;
  const sampiyon = sid !== null ? ad.get(sid) : undefined;
  const finalist = final && sid !== null ? ad.get(sid === final.ev_id ? final.dep_id! : final.ev_id!) : undefined;
  const eleme = maclar.filter((m) => m.asama !== "grup");
  const toplamGol = maclar.reduce((s, m) => s + (m.ev_gol ?? 0) + (m.dep_gol ?? 0), 0);
  const grupSay = puan.size || Math.max(1, Math.round(t.kontenjan / 4));
  const asamalar = (["grup", ...ELEME] as const).filter((a) => maclar.some((m) => m.asama === a));

  return (
    <>
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
              <h2>{sampiyon.ad}</h2>
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
          <h2>Eleme ağacı</h2>
          <p className="s-aciklama">Rövanş yok, ikinci şans yok. Kaybeden elenir; beraberlikte penaltılar.</p>
          <Agac maclar={eleme} takimlar={takimlar} />
        </section>
      )}

      {puan.size > 0 && (
        <section className="s-bolum kap" id="gruplar">
          <h2>Gruplar</h2>
          <p className="s-aciklama">Her gruptan ilk iki takım son 16&apos;ya kalır. Galibiyet 3, beraberlik 1 puan.</p>
          <div className="gruplar">
            {[...puan.entries()].map(([g, satirlar]) => (
              <div className="tablo-kap" key={g}>
                <table className="puan">
                  <caption>{g} Grubu</caption>
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
                        <th scope="row" className="takim"><span className="no">{i + 1}</span>{s.takim.ad}</th>
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
                {maclar.filter((m) => m.asama === a).map((m) => <MacSatiri key={m.id} m={m} ad={ad} />)}
              </ol>
            </details>
          ))}
        </section>
      )}

      {kral.length > 0 && (
        <section className="s-bolum kap" id="gol-kralligi">
          <h2>Gol krallığı</h2>
          <div className="tablo-kap dar">
            <table className="kral">
              <caption className="gizli">Gol krallığı, ilk 10</caption>
              <thead><tr><th scope="col">#</th><th scope="col">Oyuncu</th><th scope="col">Takım</th><th scope="col">Gol</th></tr></thead>
              <tbody>
                {kral.map((k, i) => (
                  <tr key={k.oyuncu + k.takim}>
                    <td>{i + 1}</td><th scope="row">{k.oyuncu}</th><td>{k.takim}</td><td className="p">{k.gol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

function MacSatiri({ m, ad }: { m: Mac; ad: Map<number, Takim> }) {
  const k = kazanan(m);
  const isim = (id: number | null) => (id === null ? "Belli değil" : ad.get(id)?.ad ?? "?");
  return (
    <li className="mac">
      <span className="zaman">{tarihYaz(m.zaman, true)}{m.grup ? ` · ${m.grup}` : ""}</span>
      <span className={"ev" + (k !== null && k === m.ev_id ? " galip" : "")}>{isim(m.ev_id)}</span>
      <span className="skor">
        {oynandi(m) ? `${m.ev_gol} - ${m.dep_gol}` : "–"}
        {m.ev_pen !== null && m.dep_pen !== null && <small>pen. {m.ev_pen}-{m.dep_pen}</small>}
      </span>
      <span className={"dep" + (k !== null && k === m.dep_id ? " galip" : "")}>{isim(m.dep_id)}</span>
    </li>
  );
}
