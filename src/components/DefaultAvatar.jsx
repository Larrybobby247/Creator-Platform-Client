// Default profile pictures, drawn in ONE colour: the accent colour of the theme the person is using (it follows the theme live, no re-render needed).
//  MALE   -> big round afro, head and shoulders
//  FEMALE -> short curly hair with a fringe, head and shoulders
//  anything else / not chosen -> plain head and shoulders
// There is deliberately no outer ring: the picture fills whatever circle it is shown in.
const ACC = 'var(--color-violet)';
const stroke = { stroke: ACC, strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' };
const SOFT = `color-mix(in srgb, ${ACC} 26%, var(--color-card))`; // opaque tint of the accent, so overlapping shapes hide each other's outlines
const BG = `color-mix(in srgb, ${ACC} 14%, var(--color-card))`;
const ring = (n, cx, cy, R, r, from = 0, to = 360) => Array.from({ length: n }, (_, i) => { const a = ((from + ((to - from) * i) / (n - (to - from >= 360 ? 0 : 1))) * Math.PI) / 180; return [cx + R * Math.cos(a), cy + R * Math.sin(a), r]; });
// a cloud-like shape: draw every bump with an outline first, then fill them all on top, so only the OUTER edge keeps its line
const Cloud = ({ bumps }) => <g><g style={{ ...stroke, fill: ACC }}>{bumps.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}</g><g style={{ fill: SOFT, stroke: 'none' }}>{bumps.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r - 0.4} />)}</g></g>;

const AFRO = [...ring(12, 50, 40, 21, 9.5), [50, 40, 22, 0]].map(([x, y, r]) => [x, y, r]);
const CURLS = [...ring(8, 50, 44, 17, 7.2, 195, 345), [30, 52, 6], [70, 52, 6], [36, 58, 4.6], [64, 58, 4.6]];
const SHOULDERS = 'M16 101C16 80 31 71 50 71C69 71 84 80 84 101Z';

export default function DefaultAvatar({ gender, size = 40 }) {
  const g = String(gender || '').toUpperCase();
  return <svg viewBox="0 0 100 100" width={size} height={size} className="rounded-full shrink-0 overflow-hidden" aria-hidden role="presentation" style={{ background: BG }}>
    {g === 'MALE' ? <>
      <Cloud bumps={AFRO} />
      <circle cx="50" cy="46" r="15" style={{ ...stroke, fill: SOFT }} />
      <path d={SHOULDERS} style={{ ...stroke, fill: SOFT }} /></>
    : g === 'FEMALE' ? <>
      <path d={SHOULDERS} style={{ ...stroke, fill: SOFT }} />
      <circle cx="50" cy="48" r="16" style={{ ...stroke, fill: SOFT }} />
      <Cloud bumps={CURLS} />
      <path d="M36 44Q50 40 64 44" style={{ ...stroke, fill: 'none' }} /></>
    : <>
      <circle cx="50" cy="40" r="17" style={{ ...stroke, fill: SOFT }} />
      <path d={SHOULDERS} style={{ ...stroke, fill: SOFT }} /></>}
  </svg>;
}
