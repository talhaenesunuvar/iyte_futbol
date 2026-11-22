"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const PANEL_MENU: [string, string][] = [
  ["Özet", "/yonetim"],
  ["Etkinlikler", "/yonetim/etkinlik"],
  ["Turnuva", "/yonetim/turnuva"],
  ["Forma siparişleri", "/yonetim/forma"],
  ["Köy Sahası", "/yonetim/koy"],
  ["Okul Sahası", "/yonetim/okul"],
  ["Ayarlar", "/yonetim/ayarlar"],
];

export default function PanelMenu() {
  const yol = usePathname();
  return (
    <nav className="y-menu" aria-label="Panel menüsü">
      {PANEL_MENU.map(([ad, h]) => {
        const aktif = h === "/yonetim" ? yol === h : yol.startsWith(h);
        return <Link key={h} href={h} aria-current={aktif ? "page" : undefined}>{ad}</Link>;
      })}
    </nav>
  );
}
