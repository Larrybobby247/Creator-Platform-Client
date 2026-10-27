import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lock, Play, Crown } from 'lucide-react';
import { get } from '../lib/query.js';
import MediaViewer from './MediaViewer.jsx';

const GRID = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-2', 4: 'grid-cols-2' }; // 3 items: the third spans the full second row
const Tag = ({ it, mixed }) => it.locked ? <span className="absolute top-2 left-2 z-10 flex items-center gap-1 text-[11px] font-semibold bg-bg/85 rounded-full px-2 py-1"><Lock size={11} />{it.access === 'EXCLUSIVE' ? `Exclusive · ${it.pricePoints} pts` : 'Subscribers'}</span>
  : it.access === 'PUBLIC' ? (mixed ? <span className="absolute top-2 left-2 z-10 text-[11px] font-semibold bg-ok/90 text-black rounded-full px-2 py-1">Free</span> : null)
  : <span className="absolute top-2 left-2 z-10 flex items-center gap-1 text-[11px] font-semibold bg-violet/90 rounded-full px-2 py-1"><Crown size={11} />{it.access === 'EXCLUSIVE' ? 'Unlocked' : 'Subscriber'}</span>;

function Cell({ post, it, single, mixed, near, onOpen, onLocked, spanFull, register, publicMode }) {
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
      : url ? (video ? <video src={`${url}#t=0.1`} preload="metadata" muted playsInline className={`w-full ${single ? 'max-h-[420px]' : 'h-full'} object-cover pointer-events-none`} /> : <img src={url} alt="" loading="lazy" decoding="async" className={`w-full ${single ? 'max-h-[420px]' : 'h-full'} object-cover`} />)
      : q.isError ? <div className="absolute inset-0 grid place-items-center text-xs text-muted">Unavailable</div> : <div className="absolute inset-0 bg-card2 animate-pulse" />}
    {video && url && <span className="absolute inset-0 grid place-items-center pointer-events-none"><span className="w-12 h-12 rounded-full bg-black/60 grid place-items-center"><Play fill="white" size={20} /></span></span>}
    {legacyPreview && url && <span className="absolute top-2 right-2 text-[11px] bg-bg/80 rounded-full px-2 py-1">Preview</span>}
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
