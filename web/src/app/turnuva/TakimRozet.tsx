import { basHarf, renkGecerli, yaziRengi, type Takim } from "@/lib/turnuva-hesap";

// Takim rozeti: logo varsa logo, yoksa takim renginde bas harfler. Sunucu ve istemcide calisir (hook yok).
// Logo sayfaya gomulmez; /turnuva/logo/[id]?v=<ozet> adresinden uzun sureli onbellekle gelir.
export default function TakimRozet({ t, boy = 22 }: { t: Pick<Takim, "id" | "ad" | "logo_v" | "renk"> | undefined | null; boy?: number }) {
  if (!t) return <span className="tk-rozet bos" style={{ width: boy, height: boy }} aria-hidden />;
  const bg = renkGecerli(t.renk) ? t.renk : "#B2B5B9";
  if (t.logo_v) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="tk-rozet" src={`/turnuva/logo/${t.id}?v=${t.logo_v}`} alt="" width={boy} height={boy} loading="lazy" decoding="async" style={{ width: boy, height: boy }} />
    );
  }
  return (
    <span className="tk-rozet" aria-hidden style={{ width: boy, height: boy, background: bg, color: yaziRengi(bg), fontSize: Math.round(boy * 0.42) }}>
      {basHarf(t.ad)}
    </span>
  );
}

// Rozet + ad yan yana
export function TakimAdi({ t, bos = "Belli değil", boy = 22 }: { t: Takim | undefined | null; bos?: string; boy?: number }) {
  return (
    <span className="tk-ad">
      <TakimRozet t={t} boy={boy} />
      <span className="tk-ad-y">{t ? t.ad : bos}</span>
    </span>
  );
}
