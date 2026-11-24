import Link from "next/link";

export const metadata = { title: "Sayfa bulunamadı" };

export default function NotFound() {
  return (
    <main className="kap" style={{ minHeight: "100svh", display: "grid", alignContent: "center", gap: 20, paddingBlock: 48 }}>
      <h1 style={{ fontSize: "clamp(32px,5vw,56px)" }}>Sayfa bulunamadı</h1>
      <p style={{ maxWidth: "48ch" }}>Aradığın sayfa yok ya da taşınmış olabilir.</p>
      <div>
        <Link className="btn" href="/">Ana sayfaya dön</Link>
      </div>
    </main>
  );
}
