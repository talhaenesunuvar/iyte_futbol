export default function AltKisim() {
  return (
    <footer className="alt">
      <div className="alt-kimlik">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-rozet.webp" alt="İYTE Futbol rozeti" width={64} height={64} />
        <span>
          <strong>İYTE Futbol Topluluğu</strong>
          <small>İzmir Yüksek Teknoloji Enstitüsü</small>
        </span>
      </div>
      <div className="alt-hukuk">
        <small>© 2026 İYTE Futbol Topluluğu. Tüm hakları saklıdır.</small>
      </div>
    </footer>
  );
}
