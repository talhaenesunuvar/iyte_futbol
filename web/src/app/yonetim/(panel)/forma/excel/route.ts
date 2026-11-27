import { db } from "@/lib/db";
import { yetkiliMi } from "@/lib/yetki";
import { ayarlarTaze } from "@/lib/ayar";
import { PARTI_DURUM, SIPARIS_DURUM, fiyatlar, type PartiDurum, type SiparisDurum } from "@/lib/forma";
import { xlsxYap, type Hucre } from "@/lib/xlsx";

// Forma siparisleri Excel dokumu (Derin, 2026-11-27). Yalniz yonetim; parti parti, iptaller en sonda gri degil, durumla.
type Satir = {
  id: number; parti_id: number; parti_durum: PartiDurum; ad: string; telefon: string; beden: string; arka_isim: string; numara: number | null;
  yazi: boolean; logo3d: boolean; tutar: number | null; kod: string; durum: SiparisDurum; ornek: boolean; olusturma: Date;
};

const tarih = (d: Date) => new Date(new Date(d).getTime() + 3 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");

export async function GET() {
  if (!(await yetkiliMi())) return new Response("Yetki yok", { status: 401 });
  const f = fiyatlar(await ayarlarTaze());
  const sql = await db();
  const l = await sql<Satir[]>`select s.id, s.parti_id, p.durum as parti_durum, s.ad, s.telefon, s.beden, s.arka_isim, s.numara, s.yazi, s.logo3d,
      s.tutar, s.kod, s.durum, s.ornek, s.olusturma
    from forma_siparis s join forma_parti p on p.id = s.parti_id order by s.parti_id, (s.durum = 'iptal'), s.id`;
  const satirlar: Hucre[][] = [[
    "Parti", "Parti durumu", "Sipariş kodu", "Ad Soyad", "Telefon", "Beden", "Arka isim", "Numara", "İsim/numara", "3D logo",
    "Toplam (TL)", "Kapora (TL)", "Kalan (TL)", "Durum", "Tarih", "Not",
  ]];
  for (const s of l) {
    const tutar = s.tutar ?? f.fiyat;
    const kaporaOdendi = s.durum === "kapora_alindi" || s.durum === "odendi";
    const kalan = s.durum === "odendi" || s.durum === "iptal" ? 0 : Math.max(0, tutar - (kaporaOdendi ? f.kapora : 0));
    satirlar.push([
      s.parti_id, PARTI_DURUM[s.parti_durum] ?? s.parti_durum, s.kod, s.ad, `0${s.telefon}`, s.beden, s.arka_isim || null, s.numara,
      s.yazi ? "Evet" : "Hayır", s.logo3d ? "Evet" : "Hayır", tutar, f.kapora, kalan, SIPARIS_DURUM[s.durum] ?? s.durum, tarih(s.olusturma),
      [s.ornek ? "örnek kayıt" : "", s.tutar === null ? "eski sipariş, tutar o günkü fiyat" : ""].filter(Boolean).join("; ") || null,
    ]);
  }
  const dosya = xlsxYap("Forma siparişleri", satirlar, [7, 22, 14, 24, 14, 8, 14, 8, 12, 9, 12, 12, 11, 18, 17, 30]);
  const gun = tarih(new Date()).slice(0, 10);
  return new Response(dosya as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="forma-siparisleri-${gun}.xlsx"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
