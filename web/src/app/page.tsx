import "./kale-agi/kale-agi.css";
import KaleAgi from "./kale-agi/KaleAgi";

// Ana sayfa = Kale Agi (Talha'nin secimi, 2026-11-12). Eski /kale-agi adresi buraya 308 ile gelir (next.config.ts).
// /skorbord ikinci tasarim olarak kendi adresinde duruyor.
export default function Home() {
  return <KaleAgi />;
}
