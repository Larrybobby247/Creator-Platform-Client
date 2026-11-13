import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, RotateCw, Loader2, AlertTriangle } from 'lucide-react';

const fmt = (s) => { if (!Number.isFinite(s)) return '0:00'; const m = Math.floor(s / 60), r = Math.floor(s % 60); return `${m}:${String(r).padStart(2, '0')}`; };
const SPEEDS = [1, 1.25, 1.5, 2, 0.75];

// Full video player: big play/pause with a quick animation, a seek bar that shows how much has LOADED (lighter) and how much has PLAYED (colour),
// a spinner while buffering, +/-10 s buttons, speed, mute, and controls that fade away while playing.
export default function VideoPlayer({ src, autoPlay = true, onEnded, className = '', protect = false }) {
  const v = useRef(); const bar = useRef(); const hideT = useRef();
  const [playing, setPlaying] = useState(false); const [cur, setCur] = useState(0); const [dur, setDur] = useState(0); const [buf, setBuf] = useState(0);
  const [waiting, setWaiting] = useState(true); const [muted, setMuted] = useState(false); const [speed, setSpeed] = useState(1); const [show, setShow] = useState(true);
  const [drag, setDrag] = useState(null); const [flash, setFlash] = useState(0); const [failed, setFailed] = useState(false);

  const bump = useCallback(() => { setShow(true); clearTimeout(hideT.current); hideT.current = setTimeout(() => setShow(false), 2800); }, []);
  useEffect(() => () => clearTimeout(hideT.current), []);
  const readBuffer = () => { const e = v.current; if (!e || !e.duration) return; let end = 0; for (let i = 0; i < e.buffered.length; i++) if (e.buffered.start(i) <= e.currentTime + 0.5) end = Math.max(end, e.buffered.end(i)); setBuf(end / e.duration); };
  const toggle = useCallback(() => { const e = v.current; if (!e) return; if (e.paused) e.play().catch(() => {}); else e.pause(); setFlash((n) => n + 1); bump(); }, [bump]);
  const seekTo = (ratio) => { const e = v.current; if (e && e.duration) e.currentTime = Math.max(0, Math.min(1, ratio)) * e.duration; };
  const skip = (s) => { const e = v.current; if (e) { e.currentTime = Math.max(0, Math.min(e.duration || 1e9, e.currentTime + s)); bump(); } };
  const ratioAt = (ev) => { const r = bar.current.getBoundingClientRect(); return Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)); };

  // Start playing with sound; if the browser refuses (no tap yet), fall back to muted so it still starts.
  useEffect(() => { const e = v.current; if (!e || !autoPlay) return; e.play().catch(() => { e.muted = true; setMuted(true); e.play().catch(() => {}); }); }, [src, autoPlay]);
  useEffect(() => { const k = (ev) => { if (ev.target.closest?.('input,textarea')) return; if (ev.key === ' ' || ev.key.toLowerCase() === 'k') { ev.preventDefault(); toggle(); } if (ev.key.toLowerCase() === 'm') { const e = v.current; if (e) { e.muted = !e.muted; setMuted(e.muted); } } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [toggle]);

  const progress = drag !== null ? drag : dur ? cur / dur : 0;
  return <div className={`relative bg-black select-none flex items-center justify-center ${className}`} onMouseMove={bump} onTouchStart={bump}>
    <video ref={v} src={src} playsInline preload="auto" className={`max-w-full max-h-full ${protect ? 'no-save' : ''}`} onClick={toggle} {...(protect ? { controlsList: 'nodownload noremoteplayback', disablePictureInPicture: true, disableRemotePlayback: true, onContextMenu: (e) => e.preventDefault() } : {})}
      onPlay={() => { setPlaying(true); bump(); }} onPause={() => { setPlaying(false); setShow(true); }} onEnded={() => { setPlaying(false); setShow(true); onEnded?.(); }}
      onLoadedMetadata={(e) => { setDur(e.target.duration || 0); readBuffer(); }} onDurationChange={(e) => setDur(e.target.duration || 0)}
      onTimeUpdate={(e) => { if (drag === null) setCur(e.target.currentTime); readBuffer(); }} onProgress={readBuffer}
      onWaiting={() => setWaiting(true)} onStalled={() => setWaiting(true)} onCanPlay={() => { setWaiting(false); setFailed(false); }} onPlaying={() => setWaiting(false)} onLoadStart={() => setWaiting(true)}
      onError={() => { setFailed(true); setWaiting(false); }} onVolumeChange={(e) => setMuted(e.target.muted)} />

    {/* centre: spinner while loading, otherwise a big play/pause that pops when you tap */}
    {failed ? <div className="absolute inset-0 grid place-items-center text-white text-center p-6"><div className="space-y-3"><AlertTriangle className="mx-auto" /><p className="text-sm">This video could not be played.</p><button className="px-4 py-2 rounded-full bg-white/15 text-sm" onClick={() => { setFailed(false); setWaiting(true); v.current?.load(); v.current?.play().catch(() => {}); }}>Try again</button></div></div>
      : waiting ? <div className="absolute inset-0 grid place-items-center pointer-events-none"><span className="grid place-items-center w-16 h-16 rounded-full bg-black/55 backdrop-blur"><Loader2 className="animate-spin text-white" size={30} /></span></div>
      : <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className={`absolute inset-0 m-auto w-[72px] h-[72px] rounded-full grid place-items-center text-white bg-black/50 backdrop-blur ring-1 ring-white/25 transition duration-200 ${playing ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100 hover:scale-105'}`}><Play size={32} fill="white" className="ml-1" /></button>}
    {!failed && !waiting && playing && flash > 0 && <span key={flash} className="absolute inset-0 m-auto w-[72px] h-[72px] rounded-full grid place-items-center text-white bg-black/45 pointer-events-none animate-[ping_.5s_ease-out_1_forwards]"><Pause size={30} fill="white" /></span>}

    {/* bottom controls */}
    <div className={`absolute inset-x-0 bottom-0 px-3 pt-10 pb-2 bg-gradient-to-t from-black/85 via-black/45 to-transparent text-white transition-opacity duration-300 ${show || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={(e) => e.stopPropagation()}>
      <div ref={bar} role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(cur)} tabIndex={0} className="group relative h-6 flex items-center touch-none cursor-pointer"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(ratioAt(e)); }} onPointerMove={(e) => drag !== null && setDrag(ratioAt(e))} onPointerUp={(e) => { if (drag !== null) { seekTo(ratioAt(e)); setCur(ratioAt(e) * dur); setDrag(null); } }} onPointerCancel={() => setDrag(null)}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.stopPropagation(); skip(5); } if (e.key === 'ArrowLeft') { e.stopPropagation(); skip(-5); } }}>
        <div className="relative w-full h-1 group-hover:h-1.5 rounded-full bg-white/25 transition-all overflow-visible">
          <div className="absolute inset-y-0 left-0 rounded-full bg-white/45 transition-[width] duration-300" style={{ width: `${buf * 100}%` }} />
          <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet to-pink" style={{ width: `${progress * 100}%` }} />
          <span className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white shadow ${drag !== null ? 'w-4 h-4' : 'w-3 h-3 group-hover:w-4 group-hover:h-4'} transition-all`} style={{ left: `${progress * 100}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/15">{playing ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}</button>
        <button onClick={() => skip(-10)} aria-label="Rewind 10 seconds" className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/15"><RotateCcw size={18} /></button>
        <button onClick={() => skip(10)} aria-label="Forward 10 seconds" className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/15"><RotateCw size={18} /></button>
        <span className="tabular-nums ml-1 opacity-90">{fmt(drag !== null ? drag * dur : cur)} <span className="opacity-60">/ {fmt(dur)}</span></span>
        <span className="flex-1" />
        {buf < 0.999 && dur > 0 && <span className="opacity-70 mr-1">Loaded {Math.round(buf * 100)}%</span>}
        <button onClick={() => { const n = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]; setSpeed(n); if (v.current) v.current.playbackRate = n; bump(); }} aria-label={`Playback speed ${speed}x`} className="h-8 px-2 rounded-full hover:bg-white/15 font-semibold">{speed}x</button>
        <button onClick={() => { const e = v.current; if (e) { e.muted = !e.muted; setMuted(e.muted); } }} aria-label={muted ? 'Unmute' : 'Mute'} className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/15">{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
      </div>
    </div>
  </div>;
}
