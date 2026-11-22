// Panel sayfalari istek anina bagli (oturum cerezi + connection()); her sayfa kendi Suspense sinirinda akar.
// Bu olmadan Next dev "uncached data outside <Suspense>" hatasi verip sayfayi hidrasyonsuz birakiyordu.
export default function Yukleniyor() {
  return <p className="y-soluk">Yükleniyor…</p>;
}
