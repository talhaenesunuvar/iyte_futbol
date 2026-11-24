// Gorunmez bal kupu alani: insanlar gormez ve doldurmaz, form dolduran basit botlar doldurur.
// Sunucu tarafi kontrolu: src/lib/sinir.ts botMu().
export default function BotTuzagi() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
      <label>Web siteniz<input type="text" name="web_sitesi" tabIndex={-1} autoComplete="off" defaultValue="" /></label>
    </div>
  );
}
