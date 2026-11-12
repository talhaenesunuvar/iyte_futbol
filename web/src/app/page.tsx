import Link from "next/link";

// Gecici giris: tasarim secilene kadar iki aday da kendi adresinde yasar.
// Secim yapilinca kazanan tasarim buraya (/) tasinir.
export default function Home() {
  return (
    <main className="kap" style={{ minHeight: "100dvh", display: "grid", alignContent: "center", gap: 28, paddingBlock: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-bas.webp" alt="" width={48} height={52} />
        <h1 style={{ fontSize: "clamp(32px,5vw,56px)" }}>İYTE Futbol</h1>
      </div>
      <p style={{ maxWidth: "48ch" }}>Ana sayfa için iki aday tasarım. Seçim yapılınca kazanan tasarım bu adrese taşınacak. Telefonda dokunarak dene; sol üstteki logo bu sayfaya döndürür.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Link className="btn" href="/kale-agi">Kale Ağı</Link>
        <Link className="btn iki" href="/skorbord">Skorbord</Link>
      </div>
    </main>
  );
}
