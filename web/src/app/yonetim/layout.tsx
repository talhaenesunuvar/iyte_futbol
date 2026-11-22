import type { Metadata } from "next";
import "./yonetim.css";

export const metadata: Metadata = {
  title: { default: "Yönetim", template: "%s · Yönetim" },
  robots: { index: false, follow: false },
};

export default function YonetimKok({ children }: { children: React.ReactNode }) {
  return <div className="t-yon">{children}</div>;
}
