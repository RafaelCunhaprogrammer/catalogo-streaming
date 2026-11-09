// Desenhos dos avatares regionais (Etapa D), iguais aos do protótipo aprovado.
// Cada um ocupa um quadro de 120 × 120 sobre a cor do perfil. São enfeite: o nome aparece ao lado.

const Brilho = ({ cx, cy, r = 3, o = 0.55 }) => <circle cx={cx} cy={cy} r={r} fill="#ffffff" opacity={o} />;

function Acai({ simple }) {
  if (simple) {
    // Versão para 36 px: menos frutinhas, maiores.
    return (
      <>
        <circle cx="44" cy="56" r="15" fill="#1e0b33" />
        <circle cx="72" cy="52" r="15" fill="#2a1145" />
        <circle cx="38" cy="84" r="15" fill="#2a1145" />
        <circle cx="66" cy="82" r="15" fill="#1e0b33" />
        <circle cx="88" cy="74" r="13" fill="#1e0b33" />
      </>
    );
  }
  const frutas = [[44, 56, 13, '#1e0b33'], [68, 52, 13, '#2a1145'], [88, 66, 12, '#1e0b33'], [34, 80, 12, '#2a1145'], [58, 76, 13, '#1e0b33'], [80, 88, 12, '#2a1145'], [52, 98, 11, '#1e0b33']];
  return (
    <>
      <path d="M60 20 Q62 32 56 42" fill="none" stroke="#14532d" strokeWidth="4" strokeLinecap="round" />
      <path d="M60 22 Q74 12 88 22 Q74 30 60 22 Z" fill="#22c55e" />
      {frutas.map(([cx, cy, r, fill]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={r} fill={fill} />
          <Brilho cx={cx - 4} cy={cy - 4} />
        </g>
      ))}
    </>
  );
}

function Cupuacu() {
  const pintas = [[70, 50], [76, 64], [66, 78], [52, 84], [78, 84], [60, 96], [42, 74]];
  return (
    <>
      <path d="M60 30 Q66 16 82 16 Q78 30 62 32 Z" fill="#16a34a" />
      <ellipse cx="60" cy="68" rx="30" ry="36" fill="#7c4a21" />
      <ellipse cx="50" cy="56" rx="9" ry="16" fill="#9a6232" opacity="0.8" />
      {pintas.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2" fill="#5c3416" />)}
    </>
  );
}

function Pupunha() {
  const frutas = [[40, 70, 15, 19, '#ea580c'], [80, 68, 15, 19, '#dc2626'], [60, 90, 16, 20, '#f97316']];
  return (
    <>
      <path d="M60 16 L60 40 M60 40 L42 52 M60 40 L78 50 M60 40 L60 66" fill="none" stroke="#3f2a14" strokeWidth="4" strokeLinecap="round" />
      {frutas.map(([cx, cy, rx, ry, fill]) => (
        <g key={cx}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} />
          <ellipse cx={cx} cy={cy - ry + 2} rx="6" ry="3" fill="#3f2a14" />
          <ellipse cx={cx - 5} cy={cy - 6} rx="4" ry="7" fill="#ffffff" opacity="0.35" />
        </g>
      ))}
    </>
  );
}

function Jambu() {
  return (
    <>
      <path d="M60 110 L60 62" stroke="#15803d" strokeWidth="5" strokeLinecap="round" />
      <path d="M60 88 Q34 86 26 66 Q50 64 60 88 Z" fill="#22c55e" />
      <path d="M60 78 Q86 76 94 56 Q70 54 60 78 Z" fill="#16a34a" />
      <ellipse cx="60" cy="44" rx="15" ry="20" fill="#facc15" />
      <path d="M51 36 H69 M47 44 H73 M50 52 H70" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="60" cy="25" rx="7" ry="5" fill="#b91c1c" />
    </>
  );
}

function Castanha() {
  const semente = 'M60 62 Q49 52 60 42 Q71 52 60 62 Z';
  const pintas = [[34, 44], [86, 44], [30, 70], [90, 72], [44, 92], [78, 92]];
  return (
    <>
      <circle cx="60" cy="62" r="36" fill="#6b3f1d" stroke="#4a2a12" strokeWidth="3" />
      <circle cx="60" cy="62" r="22" fill="#3b210d" />
      {[0, 90, 180, 270].map((a, i) => (
        <path key={a} d={semente} fill={i % 2 ? '#e8cc95' : '#f1dcb0'} transform={a ? `rotate(${a} 60 62)` : undefined} />
      ))}
      {pintas.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2" fill="#4a2a12" />)}
    </>
  );
}

function VerOPeso() {
  return (
    <>
      <rect x="24" y="62" width="72" height="34" fill="#f5f0e6" />
      <rect x="18" y="48" width="14" height="48" fill="#f5f0e6" />
      <polygon points="16,48 25,28 34,48" fill="#475569" />
      <rect x="88" y="48" width="14" height="48" fill="#f5f0e6" />
      <polygon points="86,48 95,28 104,48" fill="#475569" />
      <rect x="42" y="54" width="12" height="42" fill="#e7e0d0" />
      <polygon points="40,54 48,38 56,54" fill="#64748b" />
      <rect x="66" y="54" width="12" height="42" fill="#e7e0d0" />
      <polygon points="64,54 72,38 80,54" fill="#64748b" />
      <rect x="22" y="58" width="6" height="10" rx="3" fill="#334155" />
      <rect x="92" y="58" width="6" height="10" rx="3" fill="#334155" />
      <rect x="58" y="74" width="5" height="14" rx="2.5" fill="#334155" />
      <rect x="33" y="74" width="5" height="14" rx="2.5" fill="#334155" />
      <rect x="82" y="74" width="5" height="14" rx="2.5" fill="#334155" />
      <path d="M0 98 Q15 92 30 98 T60 98 T90 98 T120 98 V120 H0 Z" fill="#075985" />
    </>
  );
}

const Olho = ({ cx, cy, r, fill, glint = 1.4 }) => (
  <>
    <circle cx={cx} cy={cy} r={r} fill={fill} />
    <circle cx={cx + 1.4} cy={cy - 1.4} r={glint} fill="#ffffff" />
  </>
);

function Boto() {
  return (
    <>
      <path d="M28 66 Q12 72 16 86 Q26 78 32 72 Z" fill="#f472b6" />
      <path d="M92 66 Q108 72 104 86 Q94 78 88 72 Z" fill="#f472b6" />
      <ellipse cx="60" cy="58" rx="34" ry="30" fill="#f9a8d4" />
      <ellipse cx="60" cy="36" rx="4" ry="2" fill="#db2777" />
      <ellipse cx="60" cy="86" rx="20" ry="13" fill="#fbcfe8" />
      <Olho cx={46} cy={58} r={5} fill="#1e1433" glint={1.6} />
      <Olho cx={74} cy={58} r={5} fill="#1e1433" glint={1.6} />
      <circle cx="37" cy="72" r="5" fill="#f472b6" opacity="0.8" />
      <circle cx="83" cy="72" r="5" fill="#f472b6" opacity="0.8" />
      <path d="M52 88 Q60 94 68 88" fill="none" stroke="#db2777" strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Preguica() {
  return (
    <>
      <circle cx="60" cy="62" r="38" fill="#a47148" />
      <path d="M40 30 Q48 22 54 30 Q60 20 66 30 Q72 22 80 30" fill="none" stroke="#7a5233" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="60" cy="66" rx="29" ry="25" fill="#ecd9b8" />
      <ellipse cx="45" cy="62" rx="10" ry="7" fill="#5a3d24" transform="rotate(-20 45 62)" />
      <ellipse cx="75" cy="62" rx="10" ry="7" fill="#5a3d24" transform="rotate(20 75 62)" />
      <Olho cx={46} cy={62} r={3.5} fill="#120a05" glint={1.2} />
      <Olho cx={74} cy={62} r={3.5} fill="#120a05" glint={1.2} />
      <ellipse cx="60" cy="74" rx="6" ry="4" fill="#3b2614" />
      <path d="M53 82 Q60 87 67 82" fill="none" stroke="#3b2614" strokeWidth="2.5" strokeLinecap="round" />
    </>
  );
}

function Arara() {
  return (
    <>
      <path d="M30 88 Q58 104 86 88 L86 106 Q58 118 30 106 Z" fill="#facc15" />
      <path d="M32 100 Q58 114 84 100 L84 120 H32 Z" fill="#1d4ed8" />
      <path d="M44 34 Q46 16 58 26 Q64 12 72 28" fill="#dc2626" />
      <circle cx="58" cy="60" r="34" fill="#dc2626" />
      <ellipse cx="70" cy="58" rx="14" ry="12" fill="#ffffff" />
      <path d="M62 52 H76 M63 64 H75" stroke="#fca5a5" strokeWidth="1.5" strokeLinecap="round" />
      <Olho cx={70} cy={57} r={4.5} fill="#111111" />
      <path d="M80 58 Q102 56 98 80 Q92 72 80 74 Z" fill="#f5f5f4" />
      <path d="M80 74 Q90 74 92 80 Q84 86 80 78 Z" fill="#292524" />
    </>
  );
}

function PeixeBoi() {
  const bigode = [[44, 80], [46, 85], [76, 80], [74, 85]];
  return (
    <>
      <ellipse cx="22" cy="80" rx="10" ry="5" fill="#94a3b8" transform="rotate(-30 22 80)" />
      <ellipse cx="98" cy="80" rx="10" ry="5" fill="#94a3b8" transform="rotate(30 98 80)" />
      <ellipse cx="60" cy="62" rx="36" ry="32" fill="#94a3b8" />
      <ellipse cx="60" cy="80" rx="24" ry="16" fill="#cbd5e1" />
      <ellipse cx="54" cy="74" rx="2.5" ry="1.8" fill="#475569" />
      <ellipse cx="66" cy="74" rx="2.5" ry="1.8" fill="#475569" />
      {bigode.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.3" fill="#64748b" />)}
      <Olho cx={46} cy={56} r={4} fill="#0f172a" glint={1.3} />
      <Olho cx={74} cy={56} r={4} fill="#0f172a" glint={1.3} />
      <path d="M52 87 Q60 92 68 87" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
    </>
  );
}

function Tracaja() {
  const patas = [[32, 52], [88, 52], [32, 94], [88, 94]];
  return (
    <>
      {patas.map(([cx, cy]) => <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="9" ry="6" fill="#4d7c0f" />)}
      <circle cx="60" cy="28" r="13" fill="#4d7c0f" />
      <circle cx="53" cy="21" r="2.5" fill="#facc15" />
      <circle cx="67" cy="21" r="2.5" fill="#facc15" />
      <circle cx="60" cy="17" r="2.5" fill="#facc15" />
      <circle cx="55" cy="29" r="2.4" fill="#111111" />
      <circle cx="65" cy="29" r="2.4" fill="#111111" />
      <ellipse cx="60" cy="72" rx="32" ry="30" fill="#365314" />
      <path d="M46 60 L32 52 M74 60 L88 52 M46 78 L32 88 M74 78 L88 88 M60 52 L60 42 M60 86 L60 100" stroke="#4d7c0f" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 52 L74 60 L74 78 L60 86 L46 78 L46 60 Z" fill="#65a30d" />
    </>
  );
}

function Onca() {
  const rosetas = [[42, 42, 4], [78, 42, 4], [60, 36, 3.5], [30, 66, 4], [90, 66, 4]];
  return (
    <>
      <circle cx="32" cy="34" r="12" fill="#f59e0b" />
      <circle cx="32" cy="34" r="6" fill="#1c1917" />
      <circle cx="88" cy="34" r="12" fill="#f59e0b" />
      <circle cx="88" cy="34" r="6" fill="#1c1917" />
      <circle cx="60" cy="64" r="36" fill="#f59e0b" />
      {rosetas.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="none" stroke="#1c1917" strokeWidth="2.5" />)}
      <ellipse cx="60" cy="81" rx="20" ry="15" fill="#fef3c7" />
      <Olho cx={46} cy={58} r={4.5} fill="#1c1917" />
      <Olho cx={74} cy={58} r={4.5} fill="#1c1917" />
      <path d="M53 72 H67 L60 79 Z" fill="#1c1917" />
      <path d="M60 79 V84 M60 84 Q54 89 50 85 M60 84 Q66 89 70 85" fill="none" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" />
    </>
  );
}

// Lendas do Pará: personagens simpáticos, com graça e orgulho, nada de susto.
function Curupira() {
  return (
    <>
      <path d="M26 58 Q26 22 42 36 Q44 8 60 28 Q74 6 78 36 Q94 20 94 58 Z" fill="#ef4444" />
      <path d="M38 56 Q40 32 50 42 Q54 22 62 38 Q70 22 72 42 Q82 32 84 56 Z" fill="#f97316" />
      <circle cx="31" cy="68" r="6" fill="#a86b3c" />
      <circle cx="89" cy="68" r="6" fill="#a86b3c" />
      <circle cx="60" cy="68" r="29" fill="#b7794b" />
      <Olho cx={49} cy={64} r={4.5} fill="#1c1917" />
      <Olho cx={71} cy={64} r={4.5} fill="#1c1917" />
      <circle cx="42" cy="76" r="4.5" fill="#f87171" opacity="0.6" />
      <circle cx="78" cy="76" r="4.5" fill="#f87171" opacity="0.6" />
      <path d="M50 79 Q60 88 70 79" fill="none" stroke="#3b1d0e" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="46" cy="102" rx="6" ry="4" fill="#22c55e" transform="rotate(-25 46 102)" />
      <ellipse cx="60" cy="105" rx="6" ry="4" fill="#16a34a" />
      <ellipse cx="74" cy="102" rx="6" ry="4" fill="#22c55e" transform="rotate(25 74 102)" />
    </>
  );
}

function Mapinguari() {
  const tufos = 'M24 52 L30 36 L38 46 L46 28 L54 42 L60 24 L66 42 L74 28 L82 46 L90 36 L96 52 Z';
  return (
    <>
      <path d={tufos} fill="#5c3a1e" />
      <circle cx="60" cy="68" r="38" fill="#6b4423" />
      <path d="M20 84 Q14 96 22 102 M100 84 Q106 96 98 102" stroke="#5c3a1e" strokeWidth="8" strokeLinecap="round" fill="none" />
      <ellipse cx="60" cy="48" rx="13" ry="11" fill="#ffffff" />
      <Olho cx={60} cy={49} r={6} fill="#1c1917" glint={2} />
      <ellipse cx="60" cy="86" rx="20" ry="14" fill="#8a5a33" />
      <path d="M45 82 Q60 100 75 82 Z" fill="#7f1d1d" />
      <path d="M50 82 V86 M56 82 V87 M64 82 V87 M70 82 V86" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function MatintaPerera() {
  return (
    <>
      <path d="M22 110 Q22 30 60 26 Q98 30 98 110 Z" fill="#2e2440" />
      <ellipse cx="60" cy="68" rx="23" ry="26" fill="#e0b48a" />
      <path d="M38 56 Q48 44 60 50 Q72 44 82 56 Q72 50 60 56 Q48 50 38 56 Z" fill="#cbd5e1" />
      <path d="M47 66 q4 -4 8 0 M65 66 q4 -4 8 0" fill="none" stroke="#3b2614" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="44" cy="76" r="4" fill="#f87171" opacity="0.6" />
      <circle cx="76" cy="76" r="4" fill="#f87171" opacity="0.6" />
      <path d="M52 82 Q60 89 68 82" fill="none" stroke="#7c2d12" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="92" cy="30" rx="11" ry="8" fill="#111111" />
      <circle cx="100" cy="24" r="6" fill="#111111" />
      <path d="M105 24 L112 26 L105 28 Z" fill="#facc15" />
      <circle cx="101" cy="22" r="1.6" fill="#ffffff" />
    </>
  );
}

function BotoEncantado() {
  return (
    <>
      <path d="M24 120 L38 96 L60 106 L82 96 L96 120 Z" fill="#f8fafc" />
      <path d="M60 106 L54 120 H66 Z" fill="#f472b6" />
      <circle cx="74" cy="106" r="3.5" fill="#ec4899" />
      <circle cx="60" cy="70" r="25" fill="#f1c7a6" />
      <path d="M36 68 Q36 50 44 50 L44 70 Z M84 68 Q84 50 76 50 L76 70 Z" fill="#3f2a14" />
      <ellipse cx="60" cy="48" rx="40" ry="8" fill="#f8fafc" />
      <rect x="38" y="22" width="44" height="26" rx="9" fill="#f8fafc" />
      <rect x="38" y="38" width="44" height="7" fill="#f472b6" />
      <Olho cx={51} cy={68} r={4} fill="#1e1433" />
      <Olho cx={69} cy={68} r={4} fill="#1e1433" />
      <circle cx="44" cy="78" r="4.5" fill="#f472b6" opacity="0.6" />
      <circle cx="76" cy="78" r="4.5" fill="#f472b6" opacity="0.6" />
      <path d="M51 82 Q60 90 69 82" fill="none" stroke="#9d174d" strokeWidth="2.5" strokeLinecap="round" />
    </>
  );
}

function Iara() {
  return (
    <>
      <path d="M26 106 Q20 40 60 30 Q100 40 94 106 Z" fill="#1e1b4b" />
      <ellipse cx="60" cy="62" rx="20" ry="23" fill="#c68642" />
      <path d="M40 56 Q46 36 60 38 Q74 36 80 56 Q70 46 60 48 Q50 46 40 56 Z" fill="#1e1b4b" />
      <circle cx="80" cy="44" r="6" fill="#f472b6" />
      <circle cx="80" cy="44" r="2.5" fill="#fde047" />
      <Olho cx={52} cy={62} r={4} fill="#1c1917" />
      <Olho cx={68} cy={62} r={4} fill="#1c1917" />
      <circle cx="46" cy="71" r="4" fill="#f87171" opacity="0.6" />
      <circle cx="74" cy="71" r="4" fill="#f87171" opacity="0.6" />
      <path d="M53 75 Q60 81 67 75" fill="none" stroke="#7c2d12" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M0 92 Q15 86 30 92 T60 92 T90 92 T120 92 V120 H0 Z" fill="#0ea5e9" />
      <path d="M0 102 Q15 96 30 102 T60 102 T90 102 T120 102 V120 H0 Z" fill="#0369a1" />
      <path d="M88 96 Q100 84 112 92 Q104 94 101 102 Q97 96 88 96 Z" fill="#10b981" />
    </>
  );
}

function CobraGrande() {
  const pintas = [[30, 92], [50, 98], [72, 98], [92, 92], [44, 80], [76, 80]];
  return (
    <>
      <ellipse cx="60" cy="94" rx="44" ry="16" fill="#15803d" />
      <ellipse cx="60" cy="80" rx="32" ry="12" fill="#16a34a" />
      {pintas.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill="#facc15" />)}
      <path d="M52 76 Q50 64 52 58 L68 58 Q70 64 68 76 Z" fill="#22c55e" />
      <ellipse cx="60" cy="46" rx="25" ry="20" fill="#22c55e" />
      <ellipse cx="60" cy="54" rx="15" ry="8" fill="#bbf7d0" />
      <Olho cx={50} cy={42} r={5} fill="#1c1917" glint={1.7} />
      <Olho cx={70} cy={42} r={5} fill="#1c1917" glint={1.7} />
      <path d="M52 55 Q60 61 68 55" fill="none" stroke="#14532d" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M60 60 V68 L56 72 M60 68 L64 72" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function MocaDoTaxi() {
  return (
    <>
      <path d="M30 120 L30 80 Q30 58 60 58 Q90 58 90 80 L90 120 Q82 112 75 120 Q67 112 60 120 Q53 112 45 120 Q37 112 30 120 Z" fill="#f8fafc" opacity="0.95" />
      <path d="M38 52 Q36 26 60 24 Q84 26 82 52 L82 62 L38 62 Z" fill="#3f2a14" />
      <circle cx="60" cy="48" r="19" fill="#f5e1d5" />
      <path d="M41 44 Q48 30 60 32 Q72 30 79 44 Q70 38 60 40 Q50 38 41 44 Z" fill="#3f2a14" />
      <circle cx="44" cy="34" r="5" fill="#ffffff" />
      <circle cx="44" cy="34" r="2" fill="#f472b6" />
      <Olho cx={53} cy={49} r={3.5} fill="#1e1433" glint={1.2} />
      <Olho cx={67} cy={49} r={3.5} fill="#1e1433" glint={1.2} />
      <circle cx="48" cy="56" r="3.5" fill="#f9a8d4" />
      <circle cx="72" cy="56" r="3.5" fill="#f9a8d4" />
      <path d="M55 59 Q60 63 65 59" fill="none" stroke="#9d174d" strokeWidth="2" strokeLinecap="round" />
      <rect x="78" y="8" width="34" height="14" rx="3" fill="#facc15" />
      <text x="95" y="18.5" textAnchor="middle" fontFamily="Archivo, system-ui, sans-serif" fontSize="9" fontWeight="900" fill="#1c1917">TÁXI</text>
    </>
  );
}

// Uirapuru: o pássaro do canto que dá sorte, cantando.
function Uirapuru() {
  return (
    <>
      <path d="M30 78 L10 92 L16 74 Z" fill="#6b4423" />
      <ellipse cx="54" cy="74" rx="28" ry="22" fill="#8b5a2b" />
      <path d="M38 70 Q50 58 66 70 Q54 84 38 70 Z" fill="#6b4423" />
      <ellipse cx="58" cy="84" rx="14" ry="8" fill="#d6a46b" />
      <circle cx="76" cy="54" r="17" fill="#8b5a2b" />
      <path d="M62 46 Q72 32 90 44 Q78 42 64 52 Z" fill="#dc2626" />
      <path d="M92 54 L106 50 L93 60 Z" fill="#facc15" />
      <Olho cx={80} cy={53} r={3.5} fill="#1c1917" glint={1.2} />
      <path d="M50 96 V104 M60 96 V104" stroke="#3b2614" strokeWidth="3" strokeLinecap="round" />
      <path d="M100 24 V36 M100 24 L108 21 V33" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="97" cy="37" r="3.5" fill="#ffffff" />
      <circle cx="105" cy="34" r="3.5" fill="#ffffff" />
      <path d="M86 14 V24" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="83" cy="25" r="3.5" fill="#ffffff" />
    </>
  );
}

// Sabores e festas do Pará.
function Carimbo() {
  return (
    <>
      {/* ela: saia rodada florida */}
      <path d="M14 108 Q22 70 42 66 Q62 70 70 108 Q42 116 14 108 Z" fill="#dc2626" />
      <path d="M20 100 Q42 108 64 100" fill="none" stroke="#facc15" strokeWidth="4" />
      <path d="M24 88 Q42 94 60 88" fill="none" stroke="#22c55e" strokeWidth="4" />
      <circle cx="30" cy="96" r="3" fill="#ffffff" />
      <circle cx="52" cy="94" r="3" fill="#ffffff" />
      <rect x="34" y="50" width="16" height="18" rx="6" fill="#ffffff" />
      <circle cx="42" cy="38" r="11" fill="#b7794b" />
      <path d="M31 36 Q32 24 42 24 Q52 24 53 36 Q48 30 42 30 Q36 30 31 36 Z" fill="#1c1917" />
      <circle cx="51" cy="28" r="4.5" fill="#f472b6" />
      <path d="M38 41 Q42 45 46 41" fill="none" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" />
      {/* ele: camisa branca, faixa vermelha e chapéu de palha */}
      <path d="M50 58 Q60 52 64 62" fill="none" stroke="#b7794b" strokeWidth="5" strokeLinecap="round" />
      <rect x="70" y="54" width="20" height="26" rx="7" fill="#f8fafc" />
      <rect x="70" y="72" width="20" height="5" fill="#dc2626" />
      <path d="M72 80 L68 108 M88 80 L94 108" stroke="#f8fafc" strokeWidth="7" strokeLinecap="round" />
      <circle cx="80" cy="42" r="11" fill="#a86b3c" />
      <ellipse cx="80" cy="33" rx="17" ry="4" fill="#e9c46a" />
      <path d="M71 33 Q72 22 80 22 Q88 22 89 33 Z" fill="#e9c46a" />
      <path d="M76 45 Q80 49 84 45" fill="none" stroke="#3b1d0e" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function Manicoba() {
  const pedacos = [[46, 52, 7], [70, 50, 6], [58, 70, 8], [42, 72, 5], [76, 70, 6]];
  return (
    <>
      <path d="M48 22 Q44 14 48 8 M60 20 Q56 12 60 6 M72 22 Q68 14 72 8" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <ellipse cx="60" cy="66" rx="46" ry="40" fill="#f8fafc" />
      <ellipse cx="60" cy="66" rx="38" ry="32" fill="#e2e8f0" />
      <ellipse cx="60" cy="64" rx="32" ry="26" fill="#1f3315" />
      <ellipse cx="54" cy="58" rx="12" ry="6" fill="#2f4a1f" />
      {pedacos.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#7c3f1d" />)}
      <circle cx="58" cy="68" r="3" fill="#a3582a" />
      <path d="M96 40 L110 18" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
    </>
  );
}

function Tacaca() {
  return (
    <>
      <path d="M44 24 Q40 16 44 10 M60 22 Q56 14 60 8 M76 24 Q72 16 76 10" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      {/* suporte trançado da cuia */}
      <path d="M36 98 L46 112 H74 L84 98 Z" fill="#c08a4a" />
      <path d="M42 104 H78 M48 110 H72" stroke="#8a5a2b" strokeWidth="2" />
      {/* cuia com tucupi, jambu, goma e camarão */}
      <path d="M16 52 Q18 102 60 102 Q102 102 104 52 Z" fill="#3b2314" />
      <path d="M24 60 Q60 72 96 60" fill="none" stroke="#5c3a1e" strokeWidth="3" />
      <ellipse cx="60" cy="52" rx="44" ry="12" fill="#eab308" />
      <ellipse cx="52" cy="52" rx="10" ry="4" fill="#fef3c7" opacity="0.8" />
      <ellipse cx="40" cy="50" rx="8" ry="4" fill="#16a34a" transform="rotate(-20 40 50)" />
      <ellipse cx="72" cy="48" rx="8" ry="4" fill="#22c55e" transform="rotate(15 72 48)" />
      <path d="M80 54 Q92 44 96 52 Q90 50 86 58 Z" fill="#fb923c" />
      <path d="M58 46 Q66 38 72 44 Q66 44 62 50 Z" fill="#fb923c" />
    </>
  );
}

function Camarao() {
  const gomos = [[70, 46, 18], [80, 62, 16], [78, 80, 14], [66, 92, 12]];
  return (
    <>
      <path d="M42 40 Q20 20 8 28 M44 46 Q24 36 12 44" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
      {gomos.map(([cx, cy, r], i) => <circle key={cx + cy} cx={cx} cy={cy} r={r} fill={i % 2 ? '#fb923c' : '#f97316'} />)}
      <path d="M58 92 L40 102 L46 90 L36 84 L56 84 Z" fill="#ea580c" />
      <ellipse cx="54" cy="46" rx="18" ry="16" fill="#fb923c" />
      <Olho cx={48} cy={42} r={4.5} fill="#1c1917" />
      <circle cx="44" cy="52" r="3.5" fill="#f87171" opacity="0.7" />
      <path d="M42 56 Q48 60 54 56" fill="none" stroke="#9a3412" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M60 64 L52 72 M66 74 L58 82 M68 86 L60 92" stroke="#c2410c" strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

// Nossa Senhora de Nazaré, pelo Círio: imagem simples e respeitosa, sem tom de brincadeira
// (manto triangular, coroa, o Menino e as flores da berlinda).
function Cirio() {
  const flores = [[30, '#ffffff'], [42, '#f43f5e'], [54, '#ffffff'], [66, '#f43f5e'], [78, '#ffffff'], [90, '#f43f5e']];
  return (
    <>
      <circle cx="60" cy="50" r="34" fill="#fde68a" opacity="0.45" />
      <path d="M60 28 L30 96 H90 Z" fill="#1e3a8a" stroke="#facc15" strokeWidth="3" strokeLinejoin="round" />
      <path d="M60 50 L46 86 M60 50 L74 86 M60 50 V92" stroke="#facc15" strokeWidth="1.5" opacity="0.7" />
      <path d="M49 38 Q60 22 71 38 L67 48 H53 Z" fill="#f8fafc" />
      <ellipse cx="60" cy="38" rx="7" ry="8" fill="#e9c9a8" />
      <path d="M56 38 h3 M61 38 h3" stroke="#7c4a21" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M50 22 L54 14 L57 20 L60 11 L63 20 L66 14 L70 22 Z" fill="#facc15" />
      <circle cx="60" cy="60" r="6" fill="#f8fafc" />
      <circle cx="60" cy="59" r="4" fill="#e9c9a8" />
      <path d="M56 54 L58 50 L60 53 L62 50 L64 54 Z" fill="#facc15" />
      <rect x="24" y="100" width="72" height="8" rx="2" fill="#ca8a04" />
      {flores.map(([cx, fill]) => <circle key={cx} cx={cx} cy="98" r="6" fill={fill} />)}
    </>
  );
}

// Urubu, figura conhecida do Ver-o-Peso, empoleirado num poste.
function Urubu() {
  return (
    <>
      <rect x="54" y="98" width="12" height="22" fill="#78716c" />
      <path d="M30 96 Q24 62 60 54 Q96 62 90 96 Z" fill="#1c1917" />
      <path d="M34 92 Q30 70 48 64 Q44 80 46 96 Z M86 92 Q90 70 72 64 Q76 80 74 96 Z" fill="#292524" />
      <circle cx="60" cy="40" r="17" fill="#6b7280" />
      <path d="M48 34 Q52 30 56 34 M64 34 Q68 30 72 34" fill="none" stroke="#4b5563" strokeWidth="1.5" />
      <Olho cx={53} cy={40} r={3.5} fill="#111111" glint={1.2} />
      <Olho cx={67} cy={40} r={3.5} fill="#111111" glint={1.2} />
      <path d="M56 46 Q60 44 64 46 L62 56 Q60 60 58 56 Z" fill="#d6d3d1" />
      <path d="M58 56 Q60 60 62 56" fill="none" stroke="#1c1917" strokeWidth="1.5" />
      <path d="M50 96 V104 M70 96 V104" stroke="#a8a29e" strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Garca() {
  return (
    <>
      <path d="M0 98 Q15 92 30 98 T60 98 T90 98 T120 98 V120 H0 Z" fill="#0369a1" opacity="0.85" />
      <path d="M54 80 L50 104 M64 80 L68 104" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
      <path d="M36 70 Q42 54 62 56 Q84 58 86 72 Q70 86 48 82 Q38 80 36 70 Z" fill="#f8fafc" />
      <path d="M80 70 L100 80 L84 76 Z" fill="#e2e8f0" />
      <path d="M44 62 Q40 44 50 34 Q58 26 54 18" fill="none" stroke="#f8fafc" strokeWidth="7" strokeLinecap="round" />
      <circle cx="56" cy="18" r="8" fill="#f8fafc" />
      <path d="M62 16 L84 20 L62 22 Z" fill="#facc15" />
      <circle cx="57" cy="16" r="2.2" fill="#111111" />
    </>
  );
}

// Barquinho de madeira dos ribeirinhos, com faixa pintada e toldo.
function Barquinho() {
  return (
    <>
      <path d="M0 92 Q15 86 30 92 T60 92 T90 92 T120 92 V120 H0 Z" fill="#0369a1" />
      <path d="M40 54 H84 V66 H40 Z" fill="#f59e0b" />
      <path d="M36 54 L62 42 L88 54 Z" fill="#dc2626" />
      <path d="M44 66 V78 M80 66 V78" stroke="#7c4a21" strokeWidth="3" />
      <path d="M12 76 H108 L96 98 H26 Z" fill="#92400e" />
      <path d="M16 80 H104" stroke="#2563eb" strokeWidth="5" />
      <path d="M22 88 H98" stroke="#ffffff" strokeWidth="3" />
      <path d="M30 94 H92" stroke="#78350f" strokeWidth="2" />
      <path d="M96 60 L110 100" stroke="#a16207" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="111" cy="102" rx="4" ry="7" fill="#a16207" transform="rotate(-20 111 102)" />
      <path d="M0 104 Q15 98 30 104 T60 104 T90 104 T120 104 V120 H0 Z" fill="#0ea5e9" opacity="0.8" />
    </>
  );
}

const ART = {
  acai: Acai,
  cupuacu: Cupuacu,
  pupunha: Pupunha,
  jambu: Jambu,
  castanha: Castanha,
  'ver-o-peso': VerOPeso,
  boto: Boto,
  preguica: Preguica,
  arara: Arara,
  'peixe-boi': PeixeBoi,
  tracaja: Tracaja,
  onca: Onca,
  curupira: Curupira,
  mapinguari: Mapinguari,
  'matinta-perera': MatintaPerera,
  'boto-encantado': BotoEncantado,
  iara: Iara,
  'cobra-grande': CobraGrande,
  'moca-do-taxi': MocaDoTaxi,
  uirapuru: Uirapuru,
  carimbo: Carimbo,
  manicoba: Manicoba,
  tacaca: Tacaca,
  camarao: Camarao,
  cirio: Cirio,
  urubu: Urubu,
  garca: Garca,
  barquinho: Barquinho,
};

export const hasArt = (slug) => Object.hasOwn(ART, slug ?? '');

// `simple`: versão para tamanhos pequenos (só o Açaí muda).
export function AvatarArt({ slug, simple = false, className = 'h-full w-full' }) {
  const Art = ART[slug];
  if (!Art) return null;
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false" data-avatar={slug} data-simple={String(simple && slug === 'acai')} className={className}>
      <Art simple={simple} />
    </svg>
  );
}
