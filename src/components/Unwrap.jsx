import { useEffect, useRef, useState } from 'react';

const SPARKS = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; const r = 60 + (i % 4) * 26; return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r), d: (i % 5) * 45, c: ['#fbbf24', '#ec4899', '#a78bfa', '#ffffff'][i % 4] }; });
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// True for ~2 seconds right after something that WAS locked in this view becomes unlocked (the person just paid / subscribed).
// Content that is already open when the page loads does not animate: only the moment of unlocking does.
export function useUnwrap(locked) {
  const prev = useRef(locked); const [on, setOn] = useState(false);
  useEffect(() => {
    const was = prev.current; prev.current = locked;
    if (!(was && !locked) || reduced()) return;
    setOn(true); const t = setTimeout(() => setOn(false), 2100); return () => clearTimeout(t);
  }, [locked]);
  return on;
}

// Gift-wrap overlay: the ribbon is cut and slides away, the bow pops, the two halves of the paper swing open like doors and sparkles burst.
// Put it inside a `relative overflow-hidden` box and give the content under it the `unwrap-reveal` class while it plays.
export function UnwrapOverlay() {
  return <div className="unwrap" aria-hidden="true">
    <i className="unwrap-door unwrap-l" /><i className="unwrap-door unwrap-r" />
    <i className="unwrap-rib-v" /><i className="unwrap-rib-h" />
    <span className="unwrap-bow">🎀</span>
    {SPARKS.map((s, i) => <i key={i} className="unwrap-spark" style={{ '--x': `${s.x}px`, '--y': `${s.y}px`, background: s.c, animationDelay: `${650 + s.d}ms` }} />)}
  </div>;
}
