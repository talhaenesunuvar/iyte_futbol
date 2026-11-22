import GirisFormu from "./GirisFormu";

export const metadata = { title: "Giriş" };

export default function Giris() {
  return (
    <main className="y-giris">
      <div className="y-kart">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-rozet.webp" alt="" width={72} height={72} />
        <h1>Yönetim paneli</h1>
        <p className="y-soluk">İYTE Futbol Topluluğu</p>
        <GirisFormu />
      </div>
    </main>
  );
}
