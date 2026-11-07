// Status (text card) backgrounds. Everyone gets the gradients; Privy Pro creators also get FLAT colours (the app's own colours, no gradient)
// and DOODLE colours: the same flat colours with hand-drawn line art on top. The keys must match BG_PRO in the server's routes/stories.js.
export const FREE_BG = { violet: 'from-violet to-pink', pink: 'from-pink to-violet', blue: 'from-info to-violet', green: 'from-ok to-info', amber: 'from-warn to-pink', teal: 'from-teal-500 to-emerald-700', red: 'from-red-500 to-rose-800', orange: 'from-orange-400 to-red-500', indigo: 'from-indigo-500 to-blue-800', slate: 'from-slate-500 to-slate-900' };
const FLAT = { 'flat-violet': '#8B5CF6', 'flat-pink': '#EC4899', 'flat-blue': '#3B82F6', 'flat-green': '#16A34A', 'flat-amber': '#F59E0B', 'flat-red': '#EF4444', 'flat-ink': '#222230' };
const DOODLE = { 'doodle-stars': ['#8B5CF6', 'stars'], 'doodle-hearts': ['#EC4899', 'hearts'], 'doodle-waves': ['#3B82F6', 'waves'], 'doodle-leaves': ['#16A34A', 'leaves'], 'doodle-bolts': ['#F59E0B', 'bolts'], 'doodle-swirls': ['#EF4444', 'swirls'], 'doodle-dots': ['#222230', 'dots'] };
export const PRO_FLAT_KEYS = Object.keys(FLAT); export const PRO_DOODLE_KEYS = Object.keys(DOODLE); export const PRO_BG_KEYS = [...PRO_FLAT_KEYS, ...PRO_DOODLE_KEYS];
export const isProBg = (k) => PRO_BG_KEYS.includes(k);

// ---- tiny line-art helpers (all drawn as thin white outlines, never filled) ----
const star = (cx, cy, R, r, rot = 0) => { let p = ''; for (let i = 0; i < 10; i++) { const a = rot + (i * Math.PI) / 5 - Math.PI / 2, d = i % 2 ? r : R; p += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * d).toFixed(1)} ${(cy + Math.sin(a) * d).toFixed(1)}`; } return `<path d="${p}Z"/>`; };
const heart = (x, y, s, rot = 0) => `<path transform="rotate(${rot} ${x} ${y})" d="M${x} ${y + s * 0.7}C${x - s * 1.5} ${y - s * 0.2} ${x - s * 0.6} ${y - s * 1.1} ${x} ${y - s * 0.35}C${x + s * 0.6} ${y - s * 1.1} ${x + s * 1.5} ${y - s * 0.2} ${x} ${y + s * 0.7}Z"/>`;
const wave = (x, y, n = 4, a = 6) => `<path d="M${x} ${y}q${a} ${-a} ${a * 2} 0${(' t' + a * 2 + ' 0').repeat(n - 1)}"/>`;
const leaf = (x, y, s, rot = 0) => `<g transform="rotate(${rot} ${x} ${y})"><path d="M${x} ${y}C${x + s * 0.3} ${y - s * 0.7} ${x + s * 0.9} ${y - s * 0.7} ${x + s} ${y - s * 0.1}C${x + s * 0.7} ${y + s * 0.4} ${x + s * 0.3} ${y + s * 0.4} ${x} ${y}Z"/><path d="M${x} ${y}L${x + s * 0.75} ${y - s * 0.2}"/></g>`;
const bolt = (x, y, s, rot = 0) => `<path transform="rotate(${rot} ${x} ${y})" d="M${x + s * 0.5} ${y}L${x} ${y + s * 0.6}H${x + s * 0.4}L${x + s * 0.1} ${y + s * 1.2}L${x + s * 0.8} ${y + s * 0.45}H${x + s * 0.4}Z"/>`;
const swirl = (x, y, s) => `<path d="M${x} ${y}a${s * 0.15} ${s * 0.15} 0 0 1 ${s * 0.3} 0a${s * 0.3} ${s * 0.3} 0 0 1 ${-s * 0.6} 0a${s * 0.45} ${s * 0.45} 0 0 1 ${s * 0.9} 0"/>`;
const ring = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;
const plus = (x, y, s) => `<path d="M${x - s} ${y}H${x + s}M${x} ${y - s}V${y + s}"/>`;
const TILES = {
  stars: () => star(28, 30, 15, 6.5, 0.2) + star(104, 62, 11, 5, -0.3) + star(52, 104, 9, 4, 0.5) + plus(92, 18, 6) + plus(18, 84, 5) + ring(124, 118, 4) + ring(70, 56, 3),
  hearts: () => heart(30, 32, 14, -12) + heart(100, 60, 10, 14) + heart(46, 102, 8, -6) + plus(96, 18, 5) + ring(16, 78, 4) + ring(126, 112, 3),
  waves: () => wave(10, 26) + wave(58, 60, 4, 7) + wave(8, 98, 4, 6) + ring(104, 20, 6) + ring(120, 100, 4) + ring(76, 118, 3),
  leaves: () => leaf(14, 40, 34, -20) + leaf(78, 36, 26, 40) + leaf(36, 104, 30, 160) + leaf(106, 108, 22, -60) + ring(112, 70, 3),
  bolts: () => bolt(20, 14, 30, -10) + bolt(88, 54, 24, 14) + bolt(34, 92, 20, 10) + star(110, 22, 7, 3) + ring(70, 20, 4) + plus(126, 110, 5),
  swirls: () => swirl(24, 28, 48) + swirl(92, 70, 40) + swirl(30, 100, 36) + plus(104, 22, 5) + ring(66, 60, 4) + ring(124, 124, 3),
  dots: () => ring(26, 28, 12) + ring(96, 40, 8) + ring(58, 80, 15) + ring(112, 108, 9) + ring(20, 110, 6) + ring(124, 70, 4) + plus(70, 24, 5),
};
const cache = {};
function tile(kind) { if (!cache[kind]) { const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140" fill="none" stroke="#fff" stroke-opacity=".42" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${TILES[kind]()}</svg>`; cache[kind] = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`; } return cache[kind]; }

// → { className, style } for a status background key (free gradients, Pro flat colours, Pro doodles). Unknown keys fall back to violet.
export function statusBg(key) {
  if (FLAT[key]) return { className: '', style: { backgroundColor: FLAT[key] } };
  if (DOODLE[key]) return { className: '', style: { backgroundColor: DOODLE[key][0], backgroundImage: tile(DOODLE[key][1]), backgroundSize: '140px 140px' } };
  return { className: `bg-gradient-to-br ${FREE_BG[key] || FREE_BG.violet}`, style: undefined };
}
