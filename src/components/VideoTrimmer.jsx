import { useEffect, useRef, useState } from 'react';
import { Modal } from './ui.jsx';
import { fmtTime } from '../lib/video.js';

// Choose which part of a video to keep. The video previews (and loops) only the chosen part; the cut itself is made on the server
// when the post is published, so nothing is lost until then. `maxSec` is the length your plan allows.
export default function VideoTrimmer({ url, duration, initial, maxSec, onSave, onClose }) {
  const GAP = 1; const v = useRef(null);
  const [a, setA] = useState(initial?.start ?? 0); const [b, setB] = useState(initial?.end ?? duration);
  const len = Math.max(0, b - a); const over = maxSec && len > maxSec + 0.25;
  useEffect(() => { if (v.current) v.current.currentTime = a; }, [a]);
  const loop = () => { const e = v.current; if (e && e.currentTime >= b) e.currentTime = a; };
  const fit = () => { const nb = Math.min(duration, a + maxSec); setB(Math.round(nb * 10) / 10); };
  return <Modal open onClose={onClose} title="Trim video"><div className="space-y-3">
    <video ref={v} src={`${url}#t=${a}`} controls playsInline muted autoPlay loop={false} onTimeUpdate={loop} className="w-full max-h-72 rounded-btn bg-black" />
    <div className="grid grid-cols-2 gap-3 text-sm"><label>Start · <b>{fmtTime(a)}</b><input type="range" min={0} max={Math.max(0, duration - GAP)} step={0.1} value={a} onChange={(e) => { const x = Number(e.target.value); setA(x); if (b - x < GAP) setB(Math.min(duration, x + GAP)); }} className="w-full accent-[var(--color-violet)]" aria-label="Start time" /></label>
      <label>End · <b>{fmtTime(b)}</b><input type="range" min={GAP} max={duration} step={0.1} value={b} onChange={(e) => { const x = Number(e.target.value); setB(x); if (x - a < GAP) setA(Math.max(0, x - GAP)); }} className="w-full accent-[var(--color-violet)]" aria-label="End time" /></label></div>
    <p className={`text-sm flex items-center justify-between ${over ? 'text-bad' : 'text-ink2'}`}><span>Length: <b>{len.toFixed(1)}s</b> of {duration.toFixed(1)}s{maxSec ? ` · your limit is ${maxSec}s` : ''}</span>{maxSec && duration > maxSec && <button type="button" className="chip border-line text-xs" onClick={fit}>Fit to {maxSec}s</button>}</p>
    <div className="flex gap-2"><button type="button" className="btn-ghost flex-1" onClick={() => onSave(null)}>Keep full video</button><button type="button" className="btn-primary flex-1" disabled={over || len < GAP} onClick={() => onSave(a <= 0.05 && b >= duration - 0.05 ? null : { start: Math.round(a * 10) / 10, end: Math.round(b * 10) / 10 })}>Save</button></div></div></Modal>;
}
