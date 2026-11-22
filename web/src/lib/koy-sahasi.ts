// Koy Sahasi (hali saha) randevu modeli: slot tanimi, gun uretimi, tarih bicimleme, ornek doluluk
// ve sunucu ile paylasilan tipler. Istemci ve sunucuda calisir (veritabani erisimi koy-veri.ts'te).

// Turkiye 2016'dan beri sabit UTC+3 (yaz saati yok); Europe/Istanbul icin kutuphanesiz hesap yeterli.
const SAAT_FARKI = 3;

export type Slot = { sira: number; bas: number; etiket: string; gece: boolean };

// Her gun ayni 10 slot: 17:00'den 03:00'a saat basi. 24 ve sonrasi takvimde ertesi gunun ilk saatleri,
// listede ise ayni gunun devami ("gece" etiketi).
export const SLOTLAR: Slot[] = Array.from({ length: 10 }, (_, i) => {
  const bas = 17 + i;
  const s = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;
  return { sira: i, bas, etiket: `${s(bas)}–${s(bas + 1)}`, gece: bas >= 24 };
});

export type Gun = { anahtar: string; yil: number; ay: number; gunNo: number; haftaGunu: number; ad: string; kisa: string; ayAd: string };

const GUN_AD = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const GUN_KISA = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const AY_AD = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const iki = (n: number) => String(n).padStart(2, "0");

// Verilen anin Istanbul'daki takvim gunu (UTC+3)
function istanbulGunu(t: Date) {
  const k = new Date(t.getTime() + SAAT_FARKI * 3_600_000);
  return { yil: k.getUTCFullYear(), ay: k.getUTCMonth(), gunNo: k.getUTCDate() };
}

// Bugunden baslayarak `adet` gun. Saat 03:00'a kadar suren gece slotlari bir onceki gunun kartinda kaldigi icin
// gun degisimi takvim gunuyle ayni (gece 01:00'de "bugun" hala dunun karti degil, yeni gundur; dunun gece slotlari gecmis sayilir).
export function gunler(baslangic: Date, adet = 7): Gun[] {
  const b = istanbulGunu(baslangic);
  return Array.from({ length: adet }, (_, i) => {
    const d = new Date(Date.UTC(b.yil, b.ay, b.gunNo + i));
    const yil = d.getUTCFullYear(), ay = d.getUTCMonth(), gunNo = d.getUTCDate(), haftaGunu = d.getUTCDay();
    return { anahtar: `${yil}-${iki(ay + 1)}-${iki(gunNo)}`, yil, ay, gunNo, haftaGunu, ad: GUN_AD[haftaGunu], kisa: GUN_KISA[haftaGunu], ayAd: AY_AD[ay] };
  });
}

// Slotun bitis ani (ms). Gece slotlari takvimde ertesi gune sarkar; Date.UTC saat tasmasini kendisi cozer.
export const slotBitis = (g: Gun, s: Slot) => Date.UTC(g.yil, g.ay, g.gunNo, s.bas + 1 - SAAT_FARKI);
export const gectiMi = (g: Gun, s: Slot, simdi: Date) => slotBitis(g, s) <= simdi.getTime();

export const gunBaslik = (g: Gun) => `${g.gunNo} ${g.ayAd} ${g.ad}`;

// Haftanin pazartesisi ("YYYY-MM-DD" -> "YYYY-MM-DD"). Haftada 1 randevu kurali bu anahtarla tutulur.
export function haftaBasi(anahtar: string) {
  const [y, a, g] = anahtar.split("-").map(Number);
  const d = new Date(Date.UTC(y, a - 1, g));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

// "YYYY-MM-DD" anahtarindan Gun (sunucu dogrulamasi icin)
export function gunAnahtardan(anahtar: string): Gun {
  const [y, a, g] = anahtar.split("-").map(Number);
  return gunler(new Date(Date.UTC(y, a - 1, g, 12 - SAAT_FARKI)), 1)[0];
}

// Sunucudan gelen doluluk: "tarih:slot" anahtarlari
export type KoyDoluluk = { dolu: string[]; kapali: { anahtar: string; sebep: string }[] };
export const slotAnahtar = (tarih: string, slot: number) => `${tarih}:${slot}`;

export type RandevuSonuc = { tamam?: undefined; hata?: string } | { tamam: true; kod: string; gun: string; slot: number; ad: string };

export const telefonGecerli = (t: string) => t.replace(/\D/g, "").length >= 10;
