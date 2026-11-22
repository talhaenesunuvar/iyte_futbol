import { NextResponse, type NextRequest } from "next/server";

// Koy Sahasi alt alan adi: KOY_HOST (ornek koy.iytefutbol.com) tanimliysa ve istek o adrese geldiyse
// "/" dogrudan /koy-sahasi sayfasini acar; o adreste baska sayfa yoktur ("/"a doner).
// Boylece koy sahasi topluluk sitesinden ayri bir adreste durur. KOY_HOST yoksa hicbir sey yapmaz.
export function proxy(req: NextRequest) {
  const koy = process.env.KOY_HOST?.trim().toLowerCase();
  if (!koy) return NextResponse.next();
  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  if (host !== koy) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (pathname === "/") return NextResponse.rewrite(new URL("/koy-sahasi", req.url));
  // Sunucu action'lari ve sayfa verisi /koy-sahasi uzerinden gider
  if (pathname === "/koy-sahasi" || pathname.startsWith("/_next/") || pathname.startsWith("/api/")) return NextResponse.next();
  return NextResponse.redirect(new URL("/", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|img/).*)"],
};
