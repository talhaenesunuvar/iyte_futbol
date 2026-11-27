import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { db } from "./db";
import { istemciIp } from "./sinir";

// Yonetim paneli girisi: tek sifre (YONETIM_SIFRESI) + imzali, HttpOnly oturum cerezi.
// Cerez = "<bitis_ms>.<hmac>"; sunucuda veri tutulmaz. Sifre degisirse (OTURUM_SIRRI yoksa) tum oturumlar duser.
// Her server action kendi basinda yetkiGerekli() cagirir: action'lar herkese acik uc noktadir.
//
// GUVENLIK (2026-11-27 denetimi): imza anahtari OTURUM_SIRRI'dir; URETIMDE AYRI TANIMLA. Tanimli degilse
// YONETIM_SIFRESI'ne duser; o zaman sizan bir cerezden (cerez = <bitis>.<hmac>, bitis acik) sifre cevrimdisi
// brute-force edilebilir. Ayri yuksek-entropili OTURUM_SIRRI ile imza sifreden tamamen bagimsiz olur.

const CEREZ = "iyte_yonetim";
const SURE_MS = 14 * 86_400_000;
const PENCERE_DK = 15;
const AZAMI_DENEME = 10;

function sir() {
  const s = process.env.OTURUM_SIRRI || process.env.YONETIM_SIFRESI;
  if (!s) throw new Error("YONETIM_SIFRESI tanımlı değil.");
  return s;
}
const imza = (veri: string) => createHmac("sha256", sir()).update(veri).digest("hex");
const ozet = (s: string) => createHash("sha256").update(s).digest();

function esit(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function yetkiliMi() {
  // Oturum suresi Date.now() ile kiyaslanir; her istekte calismali (prerender edilmez)
  await connection();
  const c = (await cookies()).get(CEREZ)?.value;
  if (!c) return false;
  const [bitis, h] = c.split(".");
  if (!bitis || !h || Number(bitis) < Date.now()) return false;
  return esit(h, imza(bitis));
}

export async function yetkiGerekli() {
  if (!(await yetkiliMi())) redirect("/yonetim/giris");
}

export type GirisSonuc = { hata?: string };

export async function girisDene(sifre: string): Promise<GirisSonuc> {
  const beklenen = process.env.YONETIM_SIFRESI;
  if (!beklenen) return { hata: "Panel şifresi sunucuda tanımlı değil (YONETIM_SIFRESI)." };
  const sql = await db();
  // Giris sayaci da herkese acik formlarla ayni /64 IPv6 normalizasyonunu kullanir (tek bir /64 blogu limiti asamasin)
  const ip = await istemciIp();
  await sql`delete from giris_deneme where zaman < now() - interval '1 day'`;
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from giris_deneme where ip = ${ip} and zaman > now() - make_interval(mins => ${PENCERE_DK})`;
  if (n >= AZAMI_DENEME) return { hata: `Çok fazla deneme. ${PENCERE_DK} dakika sonra tekrar dene.` };
  if (!timingSafeEqual(ozet(sifre), ozet(beklenen))) {
    await sql`insert into giris_deneme (ip) values (${ip})`;
    return { hata: "Şifre yanlış." };
  }
  await sql`delete from giris_deneme where ip = ${ip}`;
  const bitis = String(Date.now() + SURE_MS);
  (await cookies()).set(CEREZ, `${bitis}.${imza(bitis)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SURE_MS / 1000,
  });
  return {};
}

export async function cikisYap() {
  (await cookies()).delete(CEREZ);
}
