import "server-only";
import postgres from "postgres";
import { SEMA, SEMA_SURUM } from "./sema";
import { tohumla } from "./tohum";
import { gecisler } from "./gecis";

// Tek veritabani baglantisi. Uretimde Neon Postgres (pooled adres, Vercel ortam degiskeni DATABASE_URL),
// yerelde `npm run db` ile acilan PGlite sunucusu (127.0.0.1:5433). Ikisi de standart Postgres protokolu.
// Dev sunucusu modulu tekrar yukleyince yeni havuz acilmasin diye globalThis'te tutulur.

type Durum = { sql?: postgres.Sql; hazir?: Promise<void> };
const g = globalThis as unknown as { __iyteDb?: Durum };
const d: Durum = (g.__iyteDb ??= {});

function baglan() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tanımlı değil. Yerelde `npm run db` + .env.local; Vercel'de Neon bağlantısı gerekli.");
  const yerel = /@(127\.0\.0\.1|localhost)[:/]/.test(url);
  return postgres(url, {
    // Neon pooler (pgbouncer, transaction modu) isimli prepared statement desteklemez
    prepare: false,
    // Yerel PGlite sunucusu tek baglantiyi sirayla isler (coklayici paralel derlemede ifadeleri karistiriyor);
    // baglanti kisa tutulur ki diger isciler beklemesin.
    max: yerel ? 1 : 3,
    idle_timeout: yerel ? 1 : 20,
    connect_timeout: 15,
    ssl: yerel ? false : "require",
    onnotice: () => {},
    // date sutunlari "YYYY-MM-DD" metni olarak gelsin (saat dilimi kaymasi olmasin)
    types: { date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x } },
  });
}

async function semaGuncelMi(sql: postgres.Sql) {
  try {
    const [r] = await sql<{ deger: string }[]>`select deger from ayar where anahtar = 'sema_surum'`;
    return r?.deger === SEMA_SURUM;
  } catch {
    return false; // ilk kurulum: ayar tablosu yok
  }
}

async function hazirla(sql: postgres.Sql) {
  if (!(await semaGuncelMi(sql))) {
    try {
      await sql.unsafe(SEMA);
    } catch (e) {
      // Iki sunucu ornegi ayni anda CREATE ... IF NOT EXISTS calistirirsa pg_type cakismasi (23505) olabilir; tablo zaten var demektir
      if ((e as { code?: string }).code !== "23505") throw e;
    }
    await sql`insert into ayar (anahtar, deger) values ('sema_surum', ${SEMA_SURUM}) on conflict (anahtar) do update set deger = excluded.deger`;
  }
  await tohumla(sql);
  await gecisler(sql);
}

// Sema ilk sorguda bir kez kurulur. Hata olursa bir sonraki istek tekrar dener.
export async function db() {
  d.sql ??= baglan();
  d.hazir ??= hazirla(d.sql).catch((e) => { d.hazir = undefined; throw e; });
  await d.hazir;
  return d.sql;
}
