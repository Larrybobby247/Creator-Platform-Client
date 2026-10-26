import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, RotateCcw, RotateCw } from 'lucide-react';
// Full-screen viewer: natural aspect ratio, real video controls (play, pause, seek bar, ±10 s), swipe or arrows between items, tap outside to close.
export default function MediaViewer({ items, start = 0, onClose }) {
  const [i, setI] = useState(start); const vid = useRef(); const touch = useRef(null); const n = items.length; const it = items[i];
  const go = (d) => setI((x) => Math.min(n - 1, Math.max(0, x + d)));
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); }; window.addEventListener('keydown', k); const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; }; }, []);
  const skip = (s) => { const v = vid.current; if (v) v.currentTime = Math.max(0, Math.min(v.duration || 1e9, v.currentTime + s)); };
  if (!it) return null;
  return createPortal(<div className="fixed inset-0 z-[80] bg-black/95 flex flex-col animate-fade" role="dialog" aria-modal="true" aria-label="Media viewer" onClick={(e) => e.target === e.currentTarget && onClose()}
    onTouchStart={(e) => { touch.current = e.touches[0].clientX; }} onTouchEnd={(e) => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }}>
    <div className="flex items-center justify-between p-3 text-white" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }} onClick={(e) => e.target === e.currentTarget && onClose()}><span className="text-sm opacity-80">{n > 1 ? `${i + 1} / ${n}` : ''}</span><button onClick={onClose} aria-label="Close viewer" className="w-10 h-10 grid place-items-center rounded-full bg-white/10"><X /></button></div>
    <div className="flex-1 min-h-0 relative flex items-center justify-center px-2" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {it.type === 'VIDEO' ? <video key={it.url} ref={vid} src={it.url} controls autoPlay playsInline className="max-w-full max-h-full" />
        : it.type === 'AUDIO' ? <audio key={it.url} src={it.url} controls autoPlay className="w-full max-w-md" />
        : <img key={it.url} src={it.url} alt="" className="max-w-full max-h-full object-contain select-none" draggable={false} />}
      {i > 0 && <button onClick={() => go(-1)} aria-label="Previous" className="hidden sm:grid absolute left-3 w-11 h-11 place-items-center rounded-full bg-white/10 text-white"><ChevronLeft /></button>}
      {i < n - 1 && <button onClick={() => go(1)} aria-label="Next" className="hidden sm:grid absolute right-3 w-11 h-11 place-items-center rounded-full bg-white/10 text-white"><ChevronRight /></button>}
    </div>
    {it.type === 'VIDEO' && <div className="flex justify-center gap-6 p-3 text-white" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
      <button onClick={() => skip(-10)} className="flex items-center gap-1 text-sm bg-white/10 rounded-full px-4 py-2" aria-label="Rewind 10 seconds"><RotateCcw size={16} />10s</button>
      <button onClick={() => skip(10)} className="flex items-center gap-1 text-sm bg-white/10 rounded-full px-4 py-2" aria-label="Forward 10 seconds">10s<RotateCw size={16} /></button></div>}
    {n > 1 && <div className="flex justify-center gap-1.5 pb-3" onClick={(e) => e.target === e.currentTarget && onClose()}>{items.map((_, k) => <i key={k} className={`w-1.5 h-1.5 rounded-full ${k === i ? 'bg-white' : 'bg-white/30'}`} />)}</div>}
  </div>, document.body);
}
