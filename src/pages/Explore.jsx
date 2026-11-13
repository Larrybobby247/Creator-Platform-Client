import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Search, ChevronUp, ChevronDown, Plus, Film } from 'lucide-react';
import { Avatar, CreatorBadge } from '../components/ui.jsx';
import CommentsModal from '../components/CommentsModal.jsx';
import RichText from '../components/RichText.jsx';
import { api } from '../lib/api';
import { get } from '../lib/query.js';
import { useAuth } from '../context/Auth.jsx';
import { useLive } from '../context/Live.jsx';

// Explore = Reels: one short vertical video per screen. Scroll (or swipe, or use the arrow keys) to move to the next one; the video that
// is on screen plays by itself, the others stay paused. Like, comment, share, follow and open the creator's profile without leaving the feed.
const compact = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K` : String(n || 0));

function Reel({ post, active, near, muted, setMuted, onComment, onChange, onProfile }) {
  const { user } = useAuth(); const { toast } = useLive();
  const videoRef = useRef(null); const wrap = useRef(null); const lastTap = useRef(0); const tapTimer = useRef(null);
  const [p, setP] = useState(post); const [paused, setPaused] = useState(false); const [ready, setReady] = useState(false); const [waiting, setWaiting] = useState(false);
  const [progress, setProgress] = useState(0); const [hearts, setHearts] = useState([]); const [flash, setFlash] = useState(null); const [more, setMore] = useState(false);
  useEffect(() => setP(post), [post]);
  const a = p.authorId; const own = a?._id === user.id;
  // signed video link: only fetched for the reel on screen and its neighbours
  const q = useQuery({ queryKey: ['media', p._id, 0, false], queryFn: get(`/media/posts/${p._id}/media/0`), enabled: near, staleTime: 4 * 60_000, retry: 1 });
  const url = q.data?.url;
  // play only while it is the active reel
  useEffect(() => { const v = videoRef.current; if (!v) return; if (active && !paused) { const pr = v.play(); pr?.catch?.(() => { if (!v.muted) { v.muted = true; setMuted(true); v.play().catch(() => {}); } }); } else { v.pause(); if (!active) { try { v.currentTime = 0; } catch { /* not ready yet */ } setProgress(0); setPaused(false); } } }, [active, paused, url]);
  useEffect(() => { if (videoRef.current) videoRef.current.muted = muted; }, [muted, url]);
  const toggleLike = async (forceOn) => { const was = p.liked; if (forceOn && was) return; setP((x) => ({ ...x, liked: !was, likeCount: x.likeCount + (was ? -1 : 1) }));
    try { const d = await api(`/posts/${p._id}/like`, { method: 'POST' }); setP((x) => ({ ...x, liked: d.liked, likeCount: d.likeCount })); } catch (e) { setP((x) => ({ ...x, liked: was, likeCount: x.likeCount + (was ? 1 : -1) })); toast(e.message); } };
  const follow = async () => { setP((x) => ({ ...x, following: !x.following })); try { const d = await api(`/follow/${a._id}`, { method: 'POST' }); setP((x) => ({ ...x, following: d.following })); } catch (e) { setP((x) => ({ ...x, following: !x.following })); toast(e.message); } };
  // The link opens THIS video (logged-in people land on it in Explore; visitors see it on a public page with a sign-up prompt).
  const share = async () => { const link = `${location.origin}/reel/${p._id}`; const text = (p.content || '').slice(0, 100);
    try { if (navigator.share) await navigator.share({ title: `${a.displayName || a.username} on Pryvi`, text, url: link }); else { await navigator.clipboard.writeText(link); toast('Video link copied'); } }
    catch (e) { if (e?.name === 'AbortError') return; try { await navigator.clipboard.writeText(link); toast('Video link copied'); } catch { toast('Could not share this video'); } } };
  // one tap = pause / play, two quick taps = like (with a floating heart where you tapped)
  const tap = (e) => { const now = Date.now(); const r = wrap.current.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
    if (now - lastTap.current < 280) { clearTimeout(tapTimer.current); lastTap.current = 0; toggleLike(true); const id = now; setHearts((h) => [...h, { id, x, y, rot: Math.round(Math.random() * 30 - 15) }]); setTimeout(() => setHearts((h) => h.filter((k) => k.id !== id)), 900); return; }
    lastTap.current = now; tapTimer.current = setTimeout(() => { setPaused((v) => { setFlash(v ? 'play' : 'pause'); setTimeout(() => setFlash(null), 600); return !v; }); }, 280); };
  const seek = (e) => { const v = videoRef.current; if (!v?.duration) return; const r = e.currentTarget.getBoundingClientRect(); v.currentTime = ((e.clientX - r.left) / r.width) * v.duration; };
  const caption = p.content || ''; const long = caption.length > 90;
  return <section data-id={p._id} className="reel relative h-full w-full snap-start snap-always overflow-hidden bg-black" aria-label={`Reel by ${a?.username}`}>
    {/* the video keeps its own shape (nothing is cropped or stretched); the black around it is just the screen */}
    <div ref={wrap} className="absolute inset-0" onClick={tap}>
      {url ? <video ref={videoRef} src={url} loop playsInline muted={muted} preload={active ? 'auto' : 'metadata'} disablePictureInPicture
        onLoadedData={() => setReady(true)} onCanPlay={() => setWaiting(false)} onWaiting={() => setWaiting(true)} onPlaying={() => { setWaiting(false); setReady(true); }}
        onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
        className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'} object-contain`} /> : null}
      {!ready && <div className="absolute inset-0 bg-gradient-to-b from-card2 via-card to-card2 animate-pulse grid place-items-center"><Film className="text-muted" size={34} /></div>}
      {(waiting && ready && active) && <div className="absolute inset-0 grid place-items-center pointer-events-none"><span className="w-12 h-12 rounded-full border-4 border-white/25 border-t-white animate-spin" /></div>}
      {flash && <div className="absolute inset-0 grid place-items-center pointer-events-none"><span key={flash + progress} className="w-20 h-20 rounded-full bg-black/45 backdrop-blur grid place-items-center reel-pop">{flash === 'pause' ? <span className="flex gap-1.5"><i className="w-2 h-7 bg-white rounded" /><i className="w-2 h-7 bg-white rounded" /></span> : <Play size={34} fill="white" className="text-white ml-1" />}</span></div>}
      {paused && !flash && <div className="absolute inset-0 grid place-items-center pointer-events-none"><span className="w-20 h-20 rounded-full bg-black/40 backdrop-blur grid place-items-center"><Play size={34} fill="white" className="text-white ml-1" /></span></div>}
      {hearts.map((h) => <span key={h.id} className="reel-heart" style={{ left: h.x - 48, top: h.y - 64, '--rot': `${h.rot}deg` }}><Heart size={96} fill="#ff2d6f" className="text-[#ff2d6f] drop-shadow-[0_6px_18px_rgba(255,45,111,.55)]" /></span>)}
    </div>
    {/* readability gradients */}
    <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent pointer-events-none" />
    <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />
    {/* action rail */}
    <div className="absolute right-2.5 bottom-24 flex flex-col items-center gap-5 text-white z-10">
      <Link to={`/u/${a.username}`} onClick={onProfile} aria-label={`Open ${a.username}'s profile`} className="relative block"><span className="block rounded-full ring-2 ring-white overflow-hidden"><Avatar user={a} size={46} /></span>
        {!own && !p.following && <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); follow(); }} aria-label="Follow" className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-pink grid place-items-center ring-2 ring-black"><Plus size={13} strokeWidth={3} /></button>}</Link>
      <Rail label={compact(p.likeCount)} onClick={() => toggleLike()} aria={p.liked ? 'Unlike' : 'Like'}><Heart size={30} className={p.liked ? 'reel-like' : ''} fill={p.liked ? '#ff2d6f' : 'none'} color={p.liked ? '#ff2d6f' : 'white'} strokeWidth={p.liked ? 0 : 2} /></Rail>
      <Rail label={compact(p.commentCount)} onClick={() => onComment(p, (d) => setP((x) => ({ ...x, commentCount: Math.max(0, x.commentCount + d) })))} aria="Comments"><MessageCircle size={29} /></Rail>
      <Rail label="Share" onClick={share} aria="Share"><Share2 size={27} /></Rail>
      <Rail label="" onClick={() => setMuted(!muted)} aria={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX size={25} /> : <Volume2 size={25} />}</Rail>
    </div>
    {/* author + caption */}
    <div className="absolute left-3 right-20 bottom-7 text-white z-10 space-y-2">
      <div className="flex items-center gap-2 min-w-0"><Link to={`/u/${a.username}`} onClick={onProfile} className="font-semibold truncate drop-shadow">@{a.username}</Link>{a.accountMode === 'CREATOR' && <CreatorBadge />}
        {!own && <button onClick={follow} className={`shrink-0 text-xs font-semibold rounded-full px-3 py-1 border ${p.following ? 'border-white/50 text-white/90' : 'border-white bg-white text-black'}`}>{p.following ? 'Following' : 'Follow'}</button>}</div>
      {caption && <div className={`text-sm leading-snug drop-shadow ${more ? 'max-h-40 overflow-y-auto' : ''}`} onClick={() => long && setMore(!more)}>{more || !long ? <RichText text={caption} /> : <>{caption.slice(0, 90).trim()}… <span className="font-semibold">more</span></>}</div>}
    </div>
    <div className="absolute inset-x-0 bottom-0 h-3 z-20 cursor-pointer group" onClick={seek} role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><div className="absolute inset-x-0 bottom-0 h-[3px] group-hover:h-[5px] transition-all bg-white/25"><div className="h-full bg-white" style={{ width: `${progress * 100}%` }} /></div></div>
  </section>;
}
const Rail = ({ children, label, onClick, aria }) => <button onClick={(e) => { e.stopPropagation(); onClick(); }} aria-label={aria} className="flex flex-col items-center gap-1 active:scale-90 transition-transform"><span className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm grid place-items-center drop-shadow">{children}</span>{label !== '' && <span className="text-[11px] font-semibold drop-shadow">{label}</span>}</button>;

export default function Explore() {
  const nav = useNavigate(); const [sp] = useSearchParams(); const author = sp.get('author'); const start = sp.get('start'); const only = sp.get('reel');
  const [active, setActive] = useState(0); const [muted, setMuted] = useState(true); const [comments, setComments] = useState(null); const box = useRef(null);
  const feed = useInfiniteQuery({ queryKey: ['reels', author || 'all'], initialPageParam: '', queryFn: ({ pageParam, signal }) => api(`/feed?kind=REEL${author ? `&author=${author}` : ''}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`, { signal }), getNextPageParam: (l) => l.nextCursor || undefined, staleTime: 60_000 });
  const one = useQuery({ queryKey: ['reel-one', only], queryFn: get(`/posts/${only}`), enabled: !!only, staleTime: 60_000, retry: false });
  const reels = useMemo(() => { const seen = new Set(); return [...(one.data?.post ? [one.data.post] : []), ...(feed.data?.pages.flatMap((p) => p.posts) || [])].filter((r) => r.items?.[0]?.mediaType === 'VIDEO' && !seen.has(r._id) && seen.add(r._id)); }, [feed.data, one.data]);
  // which reel is on screen
  useEffect(() => { const root = box.current; if (!root) return; const o = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && e.intersectionRatio >= 0.6) setActive(Number(e.target.dataset.i)); }), { root, threshold: [0.6] });
    root.querySelectorAll('.reel-slot').forEach((el) => o.observe(el)); return () => o.disconnect(); }, [reels.length]);
  // open on a particular reel (coming from someone's profile)
  const jumped = useRef(false);
  useEffect(() => { if (!start || jumped.current || !reels.length) return; const i = reels.findIndex((r) => r._id === start); if (i >= 0) { jumped.current = true; box.current?.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: 'start' }); } else if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage(); }, [start, reels.length, feed.hasNextPage]);
  // load more shortly before the end
  useEffect(() => { if (reels.length && active >= reels.length - 3 && feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage(); }, [active, reels.length]);
  const go = useCallback((d) => { const el = box.current?.querySelector(`[data-i="${Math.max(0, Math.min(reels.length, active + d))}"]`); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [active, reels.length]);
  useEffect(() => { const k = (e) => { if (comments || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return; if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); go(1); } else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); go(-1); } else if (e.key === 'm') setMuted((x) => !x); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [go, comments]);
  // lock the page behind (the reels scroll inside their own box)
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, []);

  return <div className="reels-shell fixed top-0 left-0 right-0 lg:left-60 z-[25] bg-black flex justify-center" style={{ bottom: 'var(--reels-bottom)' }}>
    <div className="relative h-full w-full max-w-[460px] lg:my-0 lg:border-x lg:border-white/10">
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)+0.6rem)] pb-2 text-white pointer-events-none">
        <h1 className="font-bold text-lg drop-shadow flex items-center gap-2"><Film size={18} />{author ? 'Reels' : 'Explore'}</h1>
        <div className="flex gap-2 pointer-events-auto">{author && <button onClick={() => nav(-1)} className="h-10 px-4 rounded-full bg-black/35 backdrop-blur text-sm font-semibold">Back</button>}<Link to="/search" aria-label="Search" className="w-10 h-10 rounded-full bg-black/35 backdrop-blur grid place-items-center"><Search size={18} /></Link></div></div>
      <div ref={box} className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar overscroll-contain" style={{ scrollbarWidth: 'none' }}>
        {feed.isPending || (only && one.isPending) ? <div className="h-full grid place-items-center text-white/70"><span className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin" /></div>
          : feed.isError ? <div className="h-full grid place-items-center text-center text-white p-8 space-y-3"><div><p>Couldn’t load reels.</p><button className="btn-primary mt-3" onClick={() => feed.refetch()}>Try again</button></div></div>
          : reels.length === 0 ? <div className="h-full grid place-items-center text-center text-white p-8"><div className="space-y-3"><Film className="mx-auto text-white/60" size={44} /><p className="font-semibold text-lg">No reels yet</p><p className="text-white/70 text-sm">Be the first: tap Create, switch to Reel and share a short video.</p><Link to="/create?type=reel" className="btn-primary inline-flex">Create a reel</Link></div></div>
          : <>{reels.map((r, i) => <div key={r._id} data-i={i} className="reel-slot h-full w-full snap-start snap-always"><Reel post={r} active={i === active} near={Math.abs(i - active) <= 1} muted={muted} setMuted={setMuted} onComment={(p, cb) => setComments({ p, cb })} onProfile={() => {}} /></div>)}
            <div data-i={reels.length} className="reel-slot h-full w-full snap-start snap-always grid place-items-center text-center text-white bg-gradient-to-b from-black to-[#14101f] p-8"><div className="space-y-3">{feed.hasNextPage || feed.isFetchingNextPage ? <span className="inline-block w-9 h-9 rounded-full border-4 border-white/20 border-t-white animate-spin" /> : <><p className="text-3xl">🎬</p><p className="font-semibold text-lg">You’re all caught up</p><p className="text-white/70 text-sm">That’s every reel for now.</p><button className="btn-ghost" onClick={() => box.current?.scrollTo({ top: 0, behavior: 'smooth' })}>Back to the first reel</button></>}</div></div></>}
      </div>
      {/* up / down on desktop */}
      <div className="hidden lg:flex flex-col gap-3 absolute -right-16 top-1/2 -translate-y-1/2 z-20"><button onClick={() => go(-1)} disabled={active === 0} aria-label="Previous reel" className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white grid place-items-center"><ChevronUp /></button><button onClick={() => go(1)} aria-label="Next reel" className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center"><ChevronDown /></button></div>
      {muted && reels.length > 0 && <button onClick={() => setMuted(false)} className="absolute top-14 left-1/2 -translate-x-1/2 z-20 text-xs font-semibold text-white bg-black/50 backdrop-blur rounded-full px-3 py-1.5 flex items-center gap-1.5 animate-fade"><VolumeX size={13} />Tap to turn sound on</button>}
    </div>
    {comments && <CommentsModal postId={comments.p._id} open onClose={() => setComments(null)} onCountChange={(d) => comments.cb?.(d)} />}
  </div>;
}
