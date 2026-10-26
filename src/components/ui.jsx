import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const hue = (s = '') => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 360, 7);
export function Avatar({ user, size = 40 }) {
  const name = user?.displayName || user?.username || '?';
  const h = hue(user?.username);
  if (user?.avatarUrl) return <img src={user.avatarUrl} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  return <span className="inline-grid place-items-center rounded-full font-semibold text-white shrink-0" aria-hidden style={{ width: size, height: size, fontSize: size / 2.5, background: `linear-gradient(135deg,hsl(${h} 70% 55%),hsl(${(h + 50) % 360} 70% 45%))` }}>{name[0].toUpperCase()}</span>;
}
export const CreatorBadge = ({ small }) => <span title="Creator account" className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet to-pink text-white font-semibold ${small ? 'text-[9px] px-1.5 py-[1px]' : 'text-[11px] px-2 py-0.5'}`}><svg viewBox="0 0 24 24" width={small ? 9 : 11} height={small ? 9 : 11} fill="currentColor" aria-hidden><path d="M12 2l2.6 6.3 6.8.5-5.2 4.4 1.6 6.6L12 16.2 6.2 19.8l1.6-6.6L2.6 8.8l6.8-.5z" /></svg>Creator</span>;
export const Badge = ({ children, tone = 'violet' }) => <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${tone === 'pink' ? 'bg-pink/20 text-pink' : tone === 'ok' ? 'bg-ok/15 text-ok' : 'bg-violet/20 text-violet-light'}`}>{children}</span>;
export const Empty = ({ children }) => <div className="card text-ink2 text-sm text-center">{children}</div>;
export const Err = ({ children }) => children ? <p role="alert" className="text-bad text-sm">{children}</p> : null;
export const ErrorState = ({ error, onRetry, compact }) => <div role="alert" className={`card ${compact ? '!p-3' : ''} flex items-center justify-between gap-3 text-sm`}><span className="text-ink2">{error?.message === 'Failed to fetch' ? 'Network problem. Check your connection.' : error?.message || 'Something went wrong.'}</span>{onRetry && <button className="btn-ghost !py-2" onClick={onRetry}>Retry</button>}</div>;
// Renders a query result with a stable-height skeleton, an inline retry on failure, and an empty state, so one failing section never blanks a page.
export function Section({ q, height = 'h-24', empty, isEmpty, children }) {
  if (q.isPending) return <Skeleton className={height} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (isEmpty?.(q.data)) return empty;
  return typeof children === 'function' ? children(q.data) : children;
}
export const Skeleton = ({ className = 'h-24' }) => <div className={`rounded-card bg-card animate-pulse ${className}`} />;
export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => { if (!open) return; const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; }; }, [open]);
  if (!open) return null;
  // Rendered into <body> so it always sits over the whole screen, whichever card or animated parent opened it.
  return createPortal(<div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[2px] sm:p-4 animate-fade" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className={`bg-card border border-line rounded-t-modal sm:rounded-modal w-full ${wide ? 'sm:max-w-xl' : 'sm:max-w-md'} max-h-[88dvh] overflow-y-auto overscroll-contain animate-sheet`} style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
      <div className="sticky top-0 z-10 flex justify-between items-center px-5 py-3 bg-card border-b border-divider"><h2 className="text-lg font-semibold">{title}</h2><button onClick={onClose} aria-label="Close" className="text-ink2 text-2xl leading-none w-9 h-9 grid place-items-center rounded-full hover:bg-card2">×</button></div>
      <div className="p-5">{children}</div>
    </div></div>, document.body);
}
// Adds the "in" class once visible, which triggers CSS draw/grow/reveal animations.
export function Reveal({ children, className = '', as: Tag = 'div' }) {
  const ref = useRef(); const [on, setOn] = useState(false);
  useEffect(() => { const o = new IntersectionObserver(([e]) => e.isIntersecting && (setOn(true), o.disconnect()), { threshold: 0.25 }); o.observe(ref.current); return () => o.disconnect(); }, []);
  return <Tag ref={ref} className={`reveal ${on ? 'in' : ''} ${className}`}>{children}</Tag>;
}
export function CountUp({ to, prefix = '', suffix = '' }) {
  const ref = useRef(); const [v, setV] = useState(0);
  useEffect(() => { const o = new IntersectionObserver(([e]) => { if (!e.isIntersecting) return; o.disconnect(); const t0 = performance.now(); const tick = (t) => { const p = Math.min(1, (t - t0) / 1200); setV(Math.round(to * (1 - (1 - p) ** 3))); p < 1 && requestAnimationFrame(tick); }; requestAnimationFrame(tick); }); o.observe(ref.current); return () => o.disconnect(); }, [to]);
  return <span ref={ref}>{prefix}{v.toLocaleString()}{suffix}</span>;
}

/** Lightweight animated SVG area/line chart. points: [{label, value}] */
export function LineChart({ points, height = 160 }) {
  const W = 320, H = height, pad = 18; const max = Math.max(1, ...points.map((p) => p.value));
  const xy = points.map((p, i) => [pad + (i * (W - pad * 2)) / Math.max(1, points.length - 1), H - pad - (p.value / max) * (H - pad * 2)]);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const len = Math.round(xy.reduce((n, p, i) => (i ? n + Math.hypot(p[0] - xy[i - 1][0], p[1] - xy[i - 1][1]) : 0), 0)) + 4;
  return <Reveal><svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Trend chart">
    <defs><linearGradient id="lg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8B5CF6" stopOpacity=".35" /><stop offset="1" stopColor="#8B5CF6" stopOpacity="0" /></linearGradient></defs>
    {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={pad} x2={W - pad} y1={H - pad - f * (H - pad * 2)} y2={H - pad - f * (H - pad * 2)} stroke="#292935" />)}
    <path d={`${d} L${xy.at(-1)[0]},${H - pad} L${xy[0][0]},${H - pad} Z`} fill="url(#lg)" />
    <path className="draw" style={{ '--len': len }} d={d} fill="none" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    {xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#EC4899" />)}
    {points.map((p, i) => <text key={i} x={xy[i][0]} y={H - 3} textAnchor="middle" fontSize="9" fill="#77778D">{p.label}</text>)}
  </svg></Reveal>;
}
export function BarChart({ points, height = 140 }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return <Reveal><div className="flex items-end gap-2" style={{ height }} role="img" aria-label="Bar chart">
    {points.map((p, i) => <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
      <div className="bar w-full rounded-t-md bg-gradient-to-t from-violet to-pink" style={{ height: `${Math.max(4, (p.value / max) * 100)}%`, animationDelay: `${i * 80}ms` }} />
      <span className="text-[10px] text-muted">{p.label}</span></div>)}
  </div></Reveal>;
}
export function Donut({ parts }) { // [{label,value,color}]
  const total = parts.reduce((n, p) => n + p.value, 0) || 1; let acc = 0; const R = 40, C = 2 * Math.PI * R;
  return <Reveal><div className="flex items-center gap-4"><svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
    {parts.map((p) => { const len = (p.value / total) * C; const el = <circle key={p.label} cx="50" cy="50" r={R} fill="none" stroke={p.color} strokeWidth="14" strokeDasharray={`${len} ${C}`} strokeDashoffset={-acc} className="draw" style={{ '--len': len, strokeDasharray: `${len} ${C}` }} />; acc += len; return el; })}
  </svg><ul className="text-sm space-y-1">{parts.map((p) => <li key={p.label} className="flex items-center gap-2"><i className="w-3 h-3 rounded-full" style={{ background: p.color }} />{p.label} <b>{Math.round((p.value / total) * 100)}%</b></li>)}</ul></div></Reveal>;
}
