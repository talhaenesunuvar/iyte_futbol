import { yetkiGerekli } from "@/lib/yetki";
import { ayarlarTaze } from "@/lib/ayar";
import AyarFormu from "./AyarFormu";

export const metadata = { title: "Ayarlar" };

export default async function AyarPanel() {
  await yetkiGerekli();
  const a = await ayarlarTaze();
  return (
    <>
      <div className="y-baslik">
        <h1>Ayarlar</h1>
        <p className="y-soluk">Sitede görünen ödeme ve saha bilgileri. Kaydedince site birkaç saniye içinde güncellenir.</p>
      </div>
      <AyarFormu a={a} />
    </>
  );
}
