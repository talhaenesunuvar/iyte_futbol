// Ustten saha cizgisi (105 x 68 m, 1 birim = 10 cm). CSS ile perspektife yatirilir ve cizgiler
// pathLength=1 sayesinde tek animasyonla cizilir. Dekoratif: ekran okuyucudan gizli.
const R = 91.5; // orta yuvarlak ve penalti yayi yaricapi (9,15 m)
const YAY_DY = Math.sqrt(R * R - 55 * 55); // penalti yayinin ceza sahasi cizgisini kestigi yer

export default function SahaCizgi({ acik = false }: { acik?: boolean }) {
  const yarim = (ayna: boolean) => {
    const x = (v: number) => (ayna ? 1050 - v : v);
    const yon = ayna ? 0 : 1;
    return (
      <g>
        <path pathLength={1} d={`M${x(0)} 138.5 H${x(165)} V541.5 H${x(0)}`} />
        <path pathLength={1} d={`M${x(0)} 248.5 H${x(55)} V431.5 H${x(0)}`} />
        <path pathLength={1} d={`M${x(165)} ${340 - YAY_DY} A${R} ${R} 0 0 ${yon} ${x(165)} ${340 + YAY_DY}`} />
        <circle className="nokta" cx={x(110)} cy={340} r={3.5} />
      </g>
    );
  };
  return (
    <div className={"saha-cizgi" + (acik ? " acik" : "")} aria-hidden>
      <svg viewBox="-6 -6 1062 692" preserveAspectRatio="xMidYMid meet">
        <rect pathLength={1} x={0} y={0} width={1050} height={680} rx={4} />
        <path pathLength={1} d="M525 0 V680" />
        <circle pathLength={1} cx={525} cy={340} r={R} />
        <circle className="nokta" cx={525} cy={340} r={4} />
        {yarim(false)}
        {yarim(true)}
      </svg>
    </div>
  );
}
