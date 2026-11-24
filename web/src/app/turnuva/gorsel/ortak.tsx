import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { ETIKET } from "@/lib/ayar";
import { SITE_URL } from "@/lib/site";
import { basHarf, renkGecerli, yaziRengi, type Takim } from "@/lib/turnuva-hesap";

// Instagram paylasim gorselleri (1080x1350, 4:5). Satori kurali: birden cok cocugu olan her div display:flex.
// Fontlar ve rozet modul acilisinda bir kez okunur (next.config outputFileTracingIncludes ile pakete girer).
export const EN = 1080, BOY = 1350;
export const R = { bordo: "#8B151A", karbon: "#1A1A1A", gri: "#B2B5B9", beyaz: "#FFFFFF", acik: "#F3F4F5" };

const kok = process.cwd();
const [fSemi, fBold, fItalik, rozet] = await Promise.all([
  readFile(join(kok, "src/assets/fontlar/BarlowCondensed-SemiBold.ttf")),
  readFile(join(kok, "src/assets/fontlar/BarlowCondensed-Bold.ttf")),
  readFile(join(kok, "src/assets/fontlar/BarlowCondensed-ExtraBoldItalic.ttf")),
  readFile(join(kok, "src/assets/logo-rozet.png")),
]);
const ROZET = `data:image/png;base64,${rozet.toString("base64")}`;
const ALAN = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");

// Turnuvanin PNG/JPEG logolari (Satori WebP cizemez; WebP olan takim bas harfle gosterilir).
// Onbellekli: gorsel rotasi her istekte 32 logoyu (~2,5 MB) veritabanindan cekmesin (guvenlik incelemesi 2026-11-24).
async function logoListesi(turnuvaId: number): Promise<[number, string][]> {
  "use cache";
  cacheTag(ETIKET.turnuva);
  cacheLife("hours");
  const sql = await db();
  const r = await sql<{ id: number; logo: string }[]>`
    select id, logo from takim where turnuva_id = ${turnuvaId} and (logo like 'data:image/png;%' or logo like 'data:image/jpeg;%')`;
  return r.map((x) => [x.id, x.logo]);
}
export async function logolar(turnuvaId: number) {
  return new Map(await logoListesi(turnuvaId));
}

export function Rozet({ t, logo, boy, halka }: { t: Takim | undefined; logo?: string; boy: number; halka?: string }) {
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} width={boy} height={boy} style={{ objectFit: "contain", borderRadius: boy * 0.12 }} alt="" />;
  }
  const bg = renkGecerli(t?.renk) ? t!.renk! : R.gri;
  return (
    <div style={{ display: "flex", width: boy, height: boy, borderRadius: boy / 2, background: bg, color: yaziRengi(bg), alignItems: "center", justifyContent: "center", fontFamily: "BC", fontWeight: 800, fontStyle: "italic", fontSize: boy * 0.42, border: halka ? `3px solid ${halka}` : "none" }}>
      {basHarf(t?.ad ?? "?")}
    </div>
  );
}

// Ortak cerceve: ustte rozet + turnuva adi + baslik, altta site adresi
export function Cerceve({ ust, baslik, children, koyu = true }: { ust: string; baslik: string; children: React.ReactNode; koyu?: boolean }) {
  const fg = koyu ? R.beyaz : R.karbon;
  return (
    <div style={{ display: "flex", flexDirection: "column", width: EN, height: BOY, background: koyu ? R.karbon : R.beyaz, color: fg, fontFamily: "BC", padding: "64px 72px 56px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ROZET} width={104} height={104} alt="" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 4, color: R.gri, textTransform: "uppercase" }}>{ust}</div>
          <div style={{ fontSize: 68, fontWeight: 800, fontStyle: "italic", lineHeight: 1, color: koyu ? R.beyaz : R.bordo }}>{baslik}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, marginTop: 48 }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28, fontWeight: 600, color: R.gri, borderTop: `2px solid ${koyu ? "#333" : R.acik}`, paddingTop: 22 }}>
        <span>İYTE Futbol Topluluğu</span>
        <span>{ALAN}</span>
      </div>
    </div>
  );
}

export function resim(el: React.ReactElement) {
  return new ImageResponse(el, {
    width: EN,
    height: BOY,
    fonts: [
      { name: "BC", data: fSemi, weight: 600, style: "normal" },
      { name: "BC", data: fBold, weight: 700, style: "normal" },
      { name: "BC", data: fItalik, weight: 800, style: "italic" },
    ],
    // Canli skor degisebilir; kisa onbellek
    headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
  });
}

export const yok = () => new Response("Bulunamadı", { status: 404 });
// Izin verilenler disinda sorgu parametresi varsa true. Rastgele "?x=..." ile CDN onbellegini atlatip
// her istekte PNG cizdirme (CPU + Neon kotasi) yolunu kapatir.
export const fazlaParametre = (req: Request, izinli: string[] = []) =>
  [...new URL(req.url).searchParams.keys()].some((k) => !izinli.includes(k));
export const tid = (req: Request) => {
  const n = Number(new URL(req.url).searchParams.get("t"));
  return Number.isInteger(n) && n > 0 ? n : null;
};
