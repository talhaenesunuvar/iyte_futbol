"use server";

import { redirect } from "next/navigation";
import { cikisYap, girisDene, type GirisSonuc } from "@/lib/yetki";

export async function girisAction(_: GirisSonuc, f: FormData): Promise<GirisSonuc> {
  const r = await girisDene(String(f.get("sifre") ?? "").slice(0, 200));
  if (r.hata) return r;
  redirect("/yonetim");
}

export async function cikisAction() {
  await cikisYap();
  redirect("/yonetim/giris");
}
