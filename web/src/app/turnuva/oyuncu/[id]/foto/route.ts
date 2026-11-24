import { oyuncuFotosu } from "@/lib/turnuva";

// Oyuncu fotografi: veritabanindaki data URL'i gercek gorsel olarak verir. Adres ?v=<ozet> tasidigi icin
// fotograf degisince adres de degisir; bu yuzden uzun sureli onbellek guvenli.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Bulunamadı", { status: 404 });
  const foto = await oyuncuFotosu(id);
  const m = foto && /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(foto);
  if (!m) return new Response("Bulunamadı", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: {
      "Content-Type": m[1],
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // Ogrenci fotograflari gorsel aramasina girmesin
      "X-Robots-Tag": "noindex, noimageindex",
    },
  });
}
