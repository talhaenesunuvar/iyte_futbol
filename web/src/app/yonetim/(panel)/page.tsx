import Link from "next/link";
import { db } from "@/lib/db";
import { yetkiGerekli } from "@/lib/yetki";
import { ornekSilAction } from "./islemler";

export const metadata = { title: "Özet" };

export default async function Ozet() {
  await yetkiGerekli();
  const sql = await db();
  const [s] = await sql<{ basvuru: number; kapora: number; koy: number; ornek: number; etkinlik: number }[]>`
    select
      (select count(*)::int from basvuru where durum = 'bekliyor') as basvuru,
      (select count(*)::int from forma_siparis where durum = 'kapora_bekliyor') as kapora,
      (select count(*)::int from koy_randevu where durum = 'aktif' and tarih >= (now() at time zone 'Europe/Istanbul')::date) as koy,
      (select count(*)::int from etkinlik where tarih >= (now() at time zone 'Europe/Istanbul')::date) as etkinlik,
      ((select count(*) from etkinlik where ornek) + (select count(*) from turnuva where ornek) + (select count(*) from forma_siparis where ornek)
        + (select count(*) from koy_randevu where kod like 'KS-ORNK%') + (select count(*) from okul_dolu where etiket = 'Örnek rezervasyon'))::int as ornek`;

  const kartlar: [string, number, string, string][] = [
    ["Bekleyen takım başvurusu", s.basvuru, "/yonetim/turnuva", "Turnuva"],
    ["Kapora bekleyen sipariş", s.kapora, "/yonetim/forma", "Forma"],
    ["Yaklaşan köy sahası randevusu", s.koy, "/yonetim/koy", "Köy Sahası"],
    ["Yaklaşan etkinlik", s.etkinlik, "/yonetim/etkinlik", "Etkinlikler"],
  ];

  return (
    <>
      <div className="y-baslik"><h1>Özet</h1></div>
      <div className="y-izgara">
        {kartlar.map(([ad, n, h, git]) => (
          <Link key={h} href={h} className="y-kart" style={{ textDecoration: "none" }}>
            <span className="y-soluk">{ad}</span>
            <span className="y-sayi">{n}</span>
            <span className="y-soluk">{git} →</span>
          </Link>
        ))}
      </div>
      {s.ornek > 0 && (
        <section className="y-kart">
          <h2>Örnek içerik</h2>
          <p className="y-soluk">
            Sitede gösterim için konmuş örnek etkinlik, turnuva ve sipariş kayıtları var ({s.ornek} kayıt). Gerçek içeriği girmeye
            başlamadan önce silebilirsin. Senin eklediğin kayıtlara dokunmaz.
          </p>
          <form action={ornekSilAction}><button className="y-btn tehlike" type="submit">Örnek içeriği sil</button></form>
        </section>
      )}
    </>
  );
}
