import "server-only";

// Kucuk .xlsx yazici (Derin, 2026-11-27: "hepsini bir excel dosyasina atar"). Bagimlilik yok:
// tek sayfa, ilk satir kalin baslik, metin hucreleri inlineStr, sayilar sayi. ZIP "stored" (sikistirmasiz) yazilir;
// Excel, Numbers ve Google E-Tablolar acar.

export type Hucre = string | number | null;

const xml = (s: string) => s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!)
  // XML 1.0'da gecersiz kontrol karakterleri
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

function sutunAdi(i: number) {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function sayfa(satirlar: Hucre[][], genislik: number[]) {
  const cols = genislik.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");
  const rows = satirlar.map((r, ri) => {
    const c = r.map((v, ci) => {
      const ref = `${sutunAdi(ci)}${ri + 1}`;
      const st = ri === 0 ? ' s="1"' : "";
      if (v === null || v === "") return `<c r="${ref}"${st}/>`;
      if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
      return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${xml(String(v))}</t></is></c>`;
    }).join("");
    return `<row r="${ri + 1}">${c}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${rows}</sheetData></worksheet>`;
}

const STIL = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF8B151A"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`;

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (b: Uint8Array) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function zip(dosyalar: [string, string][]): Uint8Array {
  const enc = new TextEncoder();
  const yerel: Uint8Array[] = [], merkez: Uint8Array[] = [];
  let ofs = 0;
  for (const [ad, icerik] of dosyalar) {
    const a = enc.encode(ad), d = enc.encode(icerik), crc = crc32(d);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); // UTF-8 ad
    h.setUint32(14, crc, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, a.length, true);
    yerel.push(new Uint8Array(h.buffer), a, d);
    const m = new DataView(new ArrayBuffer(46));
    m.setUint32(0, 0x02014b50, true); m.setUint16(4, 20, true); m.setUint16(6, 20, true); m.setUint16(8, 0x0800, true);
    m.setUint32(16, crc, true); m.setUint32(20, d.length, true); m.setUint32(24, d.length, true); m.setUint16(28, a.length, true); m.setUint32(42, ofs, true);
    merkez.push(new Uint8Array(m.buffer), a);
    ofs += 30 + a.length + d.length;
  }
  const mBoy = merkez.reduce((s, x) => s + x.length, 0);
  const son = new DataView(new ArrayBuffer(22));
  son.setUint32(0, 0x06054b50, true); son.setUint16(8, dosyalar.length, true); son.setUint16(10, dosyalar.length, true);
  son.setUint32(12, mBoy, true); son.setUint32(16, ofs, true);
  const parca = [...yerel, ...merkez, new Uint8Array(son.buffer)];
  const out = new Uint8Array(parca.reduce((s, x) => s + x.length, 0));
  let i = 0;
  for (const p of parca) { out.set(p, i); i += p.length; }
  return out;
}

// satirlar[0] baslik satiridir
export function xlsxYap(sayfaAdi: string, satirlar: Hucre[][], genislik: number[]): Uint8Array {
  const ad = xml(sayfaAdi.replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
  return zip([
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${ad}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/worksheets/sheet1.xml", sayfa(satirlar, genislik)],
    ["xl/styles.xml", STIL],
  ]);
}
