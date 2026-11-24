import "server-only";
import { headers } from "next/headers";
import { db } from "./db";

// Herkese acik formlar icin IP basina hiz siniri (2026-11-24, Derin: "siteye koruma ekle").
// Asil DDoS korumasi Vercel'in agindadir (otomatik azaltma + Firewall); bu katman formlarla veritabanini
// doldurmayi ve Neon kotasini yemeyi engeller. Kampuste cok ogrenci ayni IP'den cikabildigi icin sinirlar comert.

// Vercel x-forwarded-for'u kendisi yazar (istemcinin gonderdigini iletmez). IPv6 adresleri /64 blogruna indirilir:
// tek bir kullanici bir /64 icinde sinirsiz adres dondurebilir.
export async function istemciIp() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "yerel").trim().slice(0, 64);
  if (!ip.includes(":")) return ip;
  const parca = ip.split("::")[0].split(":");
  return `${parca.slice(0, 4).join(":")}::/64`;
}

// true = sinir asildi, islem yapilmamali. Tek ifadeli atomik sayac: paralel istekler ayni anda "henuz dolmadi"
// goremez. Pencere sabit (ornek 60 dk: saat basindan saat basina).
export async function sinirAsildi(islem: string, azami: number, dakika: number): Promise<boolean> {
  const sql = await db();
  const anahtar = `${islem}:${await istemciIp()}`;
  const sn = dakika * 60;
  if (Math.random() < 0.02) await sql`delete from istek_sayac where pencere < now() - interval '2 days'`;
  const [{ n }] = await sql<{ n: number }[]>`
    insert into istek_sayac (anahtar, pencere, n)
    values (${anahtar}, to_timestamp(floor(extract(epoch from now()) / ${sn}) * ${sn}), 1)
    on conflict (anahtar, pencere) do update set n = istek_sayac.n + 1
    returning n`;
  return n > azami;
}

// Bot tuzagi: formdaki gorunmez alan doluysa gonderen buyuk ihtimalle bottur (bkz. components/BotTuzagi.tsx)
export const botMu = (f: FormData) => String(f.get("web_sitesi") ?? "").trim() !== "";
export const COK_ISTEK = "Çok fazla deneme yapıldı. Biraz sonra tekrar dene.";
