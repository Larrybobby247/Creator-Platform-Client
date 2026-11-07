import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lock, Play, Crown, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { get } from '../lib/query.js';
import MediaViewer from './MediaViewer.jsx';
import { useUnwrap, UnwrapOverlay } from './Unwrap.jsx';

// Plays by itself (muted, looping) while at least 60% of it is on screen, and pauses when you scroll away. Only one feed video plays at a time. Tap to open it full screen with sound.
let current = null;
// Muted looping autoplay is allowed by every browser. We deliberately do NOT switch it off for "reduce motion" / data-saver: many phones have those on by default and the videos then never started.
const canAutoplay = () => true;
function AutoVideo({ src, single }) {
  const ref = useRef(); const [muted, setMuted] = useState(true); const [playing, setPlaying] = useState(false); const [waiting, setWaiting] = useState(true); const [pct, setPct] = useState(0);
  const inView = useRef(false);
  useEffect(() => { if (ref.current) { ref.current.muted = muted; ref.current.defaultMuted = muted; } }, [muted]); // React does not reliably apply the muted attribute, and an unmuted video is blocked from autoplaying
  const start = () => { const el = ref.current; if (!el || !inView.current || !canAutoplay()) return; if (current && current !== el) current.pause(); current = el; const p = el.play(); if (p?.catch) p.catch(() => { if (!el.muted) { el.muted = true; setMuted(true); el.play().catch(() => {}); } }); };
  useEffect(() => { const el = ref.current; if (!el) return; el.muted = true;
    // "reached" = about half of the video (or, for a tall video, half of the screen) is visible
    const o = new IntersectionObserver(([e]) => { const half = e.intersectionRatio >= 0.5 || e.intersectionRect.height >= window.innerHeight * 0.5; inView.current = half; if (half) start(); else { el.pause(); if (current === el) current = null; } }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    o.observe(el); return () => { o.disconnect(); inView.current = false; el.pause(); if (current === el) current = null; }; }, [src]);
  const loaded = () => { const e = ref.current; if (e?.duration && e.buffered.length) setPct(e.buffered.end(e.buffered.length - 1) / e.duration); };
  return <>
    <video ref={ref} src={src} muted={muted} loop playsInline preload="auto" className={`w-full ${single ? 'max-h-[420px]' : 'h-full'} object-cover pointer-events-none`} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onWaiting={() => setWaiting(true)} onCanPlay={() => { setWaiting(false); start(); }} onLoadedData={() => start()} onPlaying={() => setWaiting(false)} onProgress={loaded} />
    {waiting && <span className="absolute inset-0 grid place-items-center pointer-events-none"><span className="w-11 h-11 rounded-full bg-black/55 grid place-items-center"><Loader2 size={22} className="animate-spin" /></span></span>}
    {!playing && !waiting && <span className="absolute inset-0 grid place-items-center pointer-events-none"><span className="w-12 h-12 rounded-full bg-black/55 grid place-items-center ring-1 ring-white/20"><Play fill="white" size={20} className="ml-0.5" /></span></span>}
    <span role="button" tabIndex={0} aria-label={muted ? 'Turn sound on' : 'Mute'} onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setMuted((m) => !m); } }} className="absolute bottom-2 right-2 z-10 w-8 h-8 rounded-full bg-black/60 grid place-items-center">{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</span>
    {pct > 0 && pct < 0.999 && <span className="absolute bottom-0 inset-x-0 h-[3px] bg-white/20"><i className="block h-full bg-white/60 transition-all" style={{ width: `${pct * 100}%` }} /></span>}
  </>;
}
const GRID = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-2', 4: 'grid-cols-2' }; // 3 items: the third spans the full second row
const Tag = ({ it, mixed }) => it.locked ? <span className="absolute top-2 left-2 z-10 flex items-center gap-1 text-[11px] font-semibold bg-bg/85 rounded-full px-2 py-1"><Lock size={11} />{it.access === 'EXCLUSIVE' ? `Exclusive · ${it.pricePoints} pts` : 'Subscribers'}</span>
  : it.access === 'PUBLIC' ? (mixed ? <span className="absolute top-2 left-2 z-10 text-[11px] font-semibold bg-ok/90 text-black rounded-full px-2 py-1">Free</span> : null)
  : <span className="absolute top-2 left-2 z-10 flex items-center gap-1 text-[11px] font-semibold bg-violet/90 rounded-full px-2 py-1"><Crown size={11} />{it.access === 'EXCLUSIVE' ? 'Unlocked' : 'Subscriber'}</span>;

function Cell({ post, it, single, mixed, near, onOpen, onLocked, spanFull, register, publicMode }) {
  const unwrap = useUnwrap(!!it.locked); // plays once, right after this item goes from locked to unlocked
  const legacyPreview = it.locked && it.hasPreview;
  const path = publicMode ? `/public/posts/${post._id}/media/${it.idx}` : it.legacy ? (it.locked ? `/media/posts/${post._id}/preview` : `/media/posts/${post._id}/playback`) : `/media/posts/${post._id}/media/${it.idx}`;
  const q = useQuery({ queryKey: ['media', post._id, it.idx, it.locked], queryFn: get(path), enabled: near && (!it.locked || (legacyPreview && !publicMode)), staleTime: 4 * 60_000, retry: false });
  const url = q.data?.url; const video = it.mediaType === 'VIDEO';
  useEffect(() => { if (url && !it.locked) register(it.idx, { url, type: it.mediaType }); }, [url, it.locked]);
  const h = single ? 'max-h-[420px] min-h-[12rem]' : 'h-44 sm:h-56';
  const click = () => (it.locked ? onLocked(it) : url && onOpen(it));
  return <button type="button" onClick={click} aria-label={it.locked ? 'Locked item' : 'Open media'} className={`relative overflow-hidden rounded-card bg-black block w-full text-left ${h} ${spanFull ? 'col-span-2' : ''}`}>
    <Tag it={it} mixed={mixed} />
    {it.locked && !url ? <div className="absolute inset-0 bg-gradient-to-br from-violet/50 to-pink/40 grid place-items-center"><div className="absolute inset-0 backdrop-blur-xl bg-bg/40" /><div className="relative text-center space-y-1"><Lock className="mx-auto" /><p className="text-xs font-semibold">{it.access === 'EXCLUSIVE' ? `Unlock · ${it.pricePoints} pts` : 'Subscribe to view'}</p></div></div>
      : url ? (video ? <div className={unwrap ? 'unwrap-reveal' : 'contents'}><AutoVideo src={url} single={single} /></div> : <img src={url} alt="" loading="lazy" decoding="async" className={`w-full ${single ? 'max-h-[420px]' : 'h-full'} object-cover ${unwrap ? 'unwrap-reveal' : ''}`} />)
      : q.isError ? <div className="absolute inset-0 grid place-items-center text-xs text-muted">Unavailable</div> : <div className="absolute inset-0 bg-card2 animate-pulse" />}
    {legacyPreview && url && <span className="absolute top-2 right-2 text-[11px] bg-bg/80 rounded-full px-2 py-1">Preview</span>}
    {unwrap && <UnwrapOverlay />}
  </button>;
}

// Up to 4 items in a responsive grid (1 full width; 2 = two columns; 3 = two + one full-width row; 4 = 2x2), each with a max height.
// Clicking an open item opens the full-screen viewer; clicking a locked one starts the unlock / subscribe flow.
export default function PostMedia({ post, onLocked, publicMode = false }) {
  const items = post.items || []; const ref = useRef(); const [near, setNear] = useState(false); const [viewer, setViewer] = useState(null); const urls = useRef({});
  useEffect(() => { if (!items.length) return; const o = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), o.disconnect()), { rootMargin: '600px' }); o.observe(ref.current); return () => o.disconnect(); }, [items.length]);
  if (!items.length) return null;
  const mixed = items.some((i) => i.access !== 'PUBLIC');
  const register = (idx, v) => { urls.current[idx] = v; };
  const open = (it) => { const list = items.filter((x) => !x.locked && urls.current[x.idx]).map((x) => ({ ...urls.current[x.idx], idx: x.idx })); setViewer({ list, start: Math.max(0, list.findIndex((x) => x.idx === it.idx)) }); };
  return <div ref={ref} className={`grid gap-1.5 ${GRID[items.length] || 'grid-cols-2'}`}>
    {items.map((it) => <Cell key={it.idx} post={post} it={it} single={items.length === 1} mixed={mixed} near={near} spanFull={items.length === 3 && it.idx === 2} onOpen={open} onLocked={onLocked} register={register} publicMode={publicMode} />)}
    {viewer && <MediaViewer items={viewer.list} start={viewer.start} onClose={() => setViewer(null)} />}
  </div>;
}
