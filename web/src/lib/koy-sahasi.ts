// Koy Sahasi (hali saha) randevu modeli: slot tanimi, gun uretimi, tarih bicimleme, ornek doluluk
// ve randevu istegi. Backend gelince yalnizca `doluSlotlar` ve `randevuAl` degisir; arayuz ayni kalir.

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

// ORNEK doluluk: haftanin gunune gore sabit liste (Math.random yok; sunucu/istemci ayni sonucu verir).
// Backend: bu fonksiyon secili gunun doluluk listesini API'den alacak.
const ORNEK_DOLU: Record<number, number[]> = { 0: [1, 2, 5], 1: [3], 2: [0, 4], 3: [2, 3, 6], 4: [1, 7], 5: [0, 1, 2, 8], 6: [2, 3, 4, 5] };
export const doluSlotlar = (g: Gun) => new Set(ORNEK_DOLU[g.haftaGunu] ?? []);

export type RandevuIstek = { gun: string; slot: number; ad: string; telefon: string; not?: string };
export type RandevuSonuc = { tamam: true; kod: string } | { tamam: false; hata: string };

// MOCK: 800 ms bekleyip basari doner. Backend baglaninca burasi tek bir fetch (POST randevu) olacak;
// cakisma/dogrulama hatalari `{ tamam: false, hata }` ile donerse arayuz zaten gosteriyor.
export function randevuAl(istek: RandevuIstek): Promise<RandevuSonuc> {
  const kod = `KS-${istek.gun.slice(5).replace("-", "")}-${iki(istek.slot)}`;
  return new Promise((coz) => setTimeout(() => coz({ tamam: true, kod }), 800));
}

export const telefonGecerli = (t: string) => t.replace(/\D/g, "").length >= 10;
