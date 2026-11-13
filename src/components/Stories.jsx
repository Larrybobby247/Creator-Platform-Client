import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, ImagePlus, Heart, Send, Loader2, Eye, ImageOff } from 'lucide-react';
import { Avatar, Modal, Err } from './ui.jsx';
import { api } from '../lib/api';
import { get } from '../lib/query.js';
import { uploadWithProgress } from '../lib/upload.js';
import { shrinkImage } from '../lib/image.js';
import { useAuth } from '../context/Auth.jsx';
import { useLive } from '../context/Live.jsx';

import VideoTrimmer from './VideoTrimmer.jsx';
import { videoDuration, fmtTime } from '../lib/video.js';
import { FREE_BG as BG, PRO_FLAT_KEYS, PRO_DOODLE_KEYS, isProBg, statusBg } from '../lib/statusBg.js';
const Ring = ({ unseen, children }) => <span className={`inline-block p-[2px] rounded-full ${unseen ? 'bg-gradient-to-tr from-violet to-pink' : 'bg-line'}`}><span className="block p-[2px] bg-bg rounded-full">{children}</span></span>;

export function AddStoryModal({ open, onClose }) {
  const qc = useQueryClient(); const { user } = useAuth(); const { toast } = useLive(); const fileRef = useRef(); const isPro = user?.accountMode === 'CREATOR' && user?.creatorPlan === 'PRO';
  const [file, setFile] = useState(null); const [url, setUrl] = useState(null); const [text, setText] = useState(''); const [bg, setBg] = useState('violet'); const [pct, setPct] = useState(0); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [dur, setDur] = useState(0); const [trim, setTrim] = useState(null); const [trimming, setTrimming] = useState(false);
  const pro = useQuery({ queryKey: ['pro'], queryFn: get('/pro'), staleTime: 5 * 60_000, enabled: open }); const maxSec = pro.data?.limits[user?.creatorPlan === 'PRO' && user?.accountMode === 'CREATOR' ? 'PRO' : 'DEFAULT']?.videoSec;
  useEffect(() => { if (!open) { setFile(null); setUrl(null); setText(''); setPct(0); setErr(''); setBusy(false); setDur(0); setTrim(null); } }, [open]);
  useEffect(() => { setDur(0); setTrim(null); if (url && file?.type.startsWith('video/')) videoDuration(url).then(setDur); }, [url]);
  const pick = async (e) => { const f = e.target.files[0]; if (!f) return; const out = f.type.startsWith('image/') ? await shrinkImage(f, 1280) : f; setFile(out); setUrl(URL.createObjectURL(out)); };
  const post = async () => { setBusy(true); setErr(''); setPct(0);
    try { const fd = new FormData(); if (trim) { fd.append('trimStart', trim.start); fd.append('trimEnd', trim.end); } if (file) fd.append('file', file); if (text.trim()) fd.append('text', text.trim()); fd.append('bg', bg); await uploadWithProgress('/stories', fd, setPct);
      toast('Status posted. It disappears in 24 hours.'); qc.invalidateQueries({ queryKey: ['stories'] }); onClose(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); } };
  const video = file?.type.startsWith('video/');
  return <><Modal open={open} onClose={() => !busy && onClose()} title="Add to your status">
    <div className="space-y-3">
      {url ? <div className="relative rounded-card overflow-hidden bg-black">{video ? <video src={url} controls className="w-full max-h-72" /> : <img src={url} alt="Status preview" className="w-full max-h-72 object-contain" />}<button className="absolute top-2 right-2 bg-bg/80 rounded-full p-1" aria-label="Remove" onClick={() => { setFile(null); setUrl(null); }}><X size={16} /></button>{video && dur > 0 && <button type="button" onClick={() => setTrimming(true)} className={`absolute bottom-2 left-2 text-[11px] rounded-full px-2.5 py-1.5 ${maxSec && (trim ? trim.end - trim.start : dur) > maxSec + 0.25 ? 'bg-bad text-white' : 'bg-bg/85'}`}>✂ {trim ? `Trimmed · ${fmtTime(trim.end - trim.start)}` : maxSec && dur > maxSec + 0.25 ? `Too long · trim to ${maxSec}s` : `Trim · ${fmtTime(dur)}`}</button>}</div>
        : <div className={`rounded-card ${statusBg(bg).className} p-6 min-h-[160px] grid place-items-center`} style={statusBg(bg).style}><textarea maxLength={220} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a status…" aria-label="Status text" className="w-full bg-transparent text-center text-xl font-semibold placeholder:text-white/60 resize-none outline-none" rows={3} /></div>}
      {!url && <div className="space-y-2"><div className="flex gap-2 items-center flex-wrap">{Object.keys(BG).map((k) => <button key={k} aria-label={`Colour ${k}`} onClick={() => setBg(k)} className={`w-7 h-7 rounded-full bg-gradient-to-br ${BG[k]} ${bg === k ? 'ring-2 ring-white' : ''}`} />)}<span className="text-xs text-muted ml-auto">{text.length}/220</span></div>
        <div className="space-y-1.5"><p className="text-xs font-semibold flex items-center gap-1.5"><span className="rounded-full bg-gradient-to-r from-violet to-pink text-white px-1.5 py-[1px] text-[9px]">PRO</span>Privy Pro colours{!isPro && <span className="text-muted font-normal">· for Pro creators</span>}</p>
          <div className={`flex gap-2 items-center flex-wrap ${isPro ? '' : 'opacity-60'}`}>{[...PRO_FLAT_KEYS, ...PRO_DOODLE_KEYS].map((k) => <button key={k} aria-label={`Pro colour ${k.replace('-', ' ')}`} onClick={() => (isPro ? setBg(k) : toast('Flat and doodle colours are for Privy Pro creators.'))} className={`w-7 h-7 rounded-full border border-white/20 ${bg === k ? 'ring-2 ring-white' : ''}`} style={{ ...statusBg(k).style, backgroundSize: '34px 34px' }} />)}</div></div></div>}
      {url && <label className="block"><span className="sr-only">Caption</span><input value={text} maxLength={220} onChange={(e) => setText(e.target.value)} placeholder="Add a caption…" aria-label="Caption" className="input" /><span className="text-xs text-muted block text-right mt-1">{text.length}/220</span></label>}
      <input ref={fileRef} type="file" hidden accept="image/*,video/*" onChange={pick} />
      <button type="button" disabled={busy} onClick={() => fileRef.current.click()} className="btn-ghost w-full animate-glow"><ImagePlus size={18} />{url ? 'Choose a different photo or video' : 'Add a photo or video'}</button>
      <p className="text-xs text-muted">Videos up to {user.creatorPlan === 'PRO' && user.accountMode === 'CREATOR' ? 'the Pro' : 'your plan\'s'} length limit (checked by the server). Statuses disappear after 24 hours.</p>
      {busy && <div className="h-2 rounded-full bg-card2 overflow-hidden" role="progressbar" aria-valuenow={pct}><div className="h-full bg-gradient-to-r from-violet to-pink transition-all" style={{ width: `${pct}%` }} /></div>}
      <Err>{err}</Err>
      <button className="btn-primary w-full" disabled={busy || (!file && !text.trim())} onClick={post}>{busy ? (pct < 100 ? `Uploading… ${pct}%` : 'Finishing…') : 'Share status'}</button>
    </div></Modal>{trimming && url && dur > 0 && <VideoTrimmer url={url} duration={dur} initial={trim} maxSec={maxSec} onClose={() => setTrimming(false)} onSave={(t) => { setTrim(t); setTrimming(false); }} />}</>;
}

// A thin progress segment. Image: waits (shimmers) until the picture has fully loaded. Video: shows how much has LOADED (lighter) ahead of how much has PLAYED, and keeps following the download.
const Seg = ({ state, p, buf, loading }) => <i className="relative h-[3px] flex-1 rounded-full bg-white/30 overflow-hidden">
  {state === 'done' ? <b className="absolute inset-0 bg-white" /> : state === 'now' ? <>
    {buf > 0 && <b className="absolute inset-y-0 left-0 bg-white/50 transition-[width] duration-300" style={{ width: `${buf * 100}%` }} />}
    <b className="absolute inset-y-0 left-0 bg-white" style={{ width: `${p * 100}%` }} />
    {loading && <b className="absolute inset-y-0 left-0 w-1/3 bg-white/60 animate-[shimmer_1.1s_linear_infinite]" />}</> : null}</i>;

// startStoryId: open on that exact status of the group (used when you tap a status quoted inside a chat message).
export function StoryViewer({ groups, start = 0, startStoryId, onClose }) {
  const qc = useQueryClient(); const { toast } = useLive(); const [gi, setGi] = useState(start); const [si, setSi] = useState(() => Math.max(0, groups[start]?.stories.findIndex((x) => String(x._id) === String(startStoryId)) ?? 0));
  const [p, setP] = useState(0); const [buf, setBuf] = useState(0); const [loaded, setLoaded] = useState(false); const [waiting, setWaiting] = useState(false); const [failed, setFailed] = useState(false);
  const swipe = useRef(null); const swiped = useRef(false); const [hold, setHold] = useState(false); const [typing, setTyping] = useState(false); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [liked, setLiked] = useState({}); const [pop, setPop] = useState(0);
  const vid = useRef(); const g = groups[gi]; const s = g?.stories[si]; const mine = g?.source === 'me';
  const media = useQuery({ queryKey: ['story-media', s?._id], queryFn: get(`/stories/${s?._id}/media`), enabled: !!s?.hasMedia, staleTime: 4 * 60_000, retry: false });
  const access = useQuery({ queryKey: ['story-reply-status', s?._id], queryFn: get(`/stories/${s?._id}/reply-status`), enabled: !!s && !mine, staleTime: 60_000, retry: false });
  const canReply = !mine && access.data?.ok; const blockedWhy = !mine && access.data && !access.data.ok ? access.data.reason : '';
  const paused = hold || typing || busy;
  const reset = () => { setP(0); setBuf(0); setLoaded(false); setWaiting(false); setFailed(false); setErr(''); setText(''); };
  const next = () => { reset(); if (si < g.stories.length - 1) setSi(si + 1); else if (gi < groups.length - 1) { setGi(gi + 1); setSi(0); } else close(); };
  const prev = () => { reset(); if (si > 0) setSi(si - 1); else if (gi > 0) { setGi(gi - 1); setSi(0); } };
  // WhatsApp style: swipe left = the next person's status, swipe right = the previous person's. Tapping the sides still moves between one person's statuses.
  const nextUser = () => { if (gi < groups.length - 1) { reset(); setGi(gi + 1); setSi(0); } else close(); };
  const prevUser = () => { if (gi > 0) { reset(); setGi(gi - 1); setSi(0); } };
  const down = (e) => { setHold(true); swipe.current = { x: e.clientX, y: e.clientY }; swiped.current = false; };
  const up = (e) => { setHold(false); const s0 = swipe.current; swipe.current = null; if (!s0) return; const dx = e.clientX - s0.x, dy = e.clientY - s0.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) { swiped.current = true; setTimeout(() => { swiped.current = false; }, 0); dx < 0 ? nextUser() : prevUser(); } };
  const close = () => { qc.invalidateQueries({ queryKey: ['stories'] }); onClose(); };
  useEffect(() => { if (s && !mine) api(`/stories/${s._id}/view`, { method: 'POST' }).catch(() => {}); }, [s?._id]);
  useEffect(() => { if (mine) qc.invalidateQueries({ queryKey: ['stories'] }); }, []); // fresh love/view counts for your own status
  useEffect(() => { const k = (e) => { if (e.target.closest?.('input,textarea')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); }; window.addEventListener('keydown', k); const prevOv = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prevOv; }; });
  useEffect(() => { const v = vid.current; if (!v) return; if (paused) v.pause(); else v.play().catch(() => {}); }, [paused, media.data?.url]);
  // The 5-second timer only runs for text and for photos that have FINISHED loading. Videos follow their own playback time.
  const ready = s?.type === 'TEXT' || (s?.type === 'IMAGE' && loaded && !failed);
  useEffect(() => { if (!s || paused || !ready) return; let raf, last = performance.now(); const tick = (t) => { setP((x) => { const n = x + (t - last) / 5000; last = t; if (n >= 1) { next(); return 0; } return n; }); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [s?._id, paused, ready]);
  if (!g || !s) return null;

  const isLiked = liked[s._id] ?? s.liked;
  const like = async () => { setLiked((m) => ({ ...m, [s._id]: !isLiked })); setPop((n) => n + 1); try { const d = await api(`/stories/${s._id}/like`, { method: 'POST' }); setLiked((m) => ({ ...m, [s._id]: d.liked })); } catch (e) { setLiked((m) => ({ ...m, [s._id]: isLiked })); toast(e.message); } };
  const send = async (e) => { e.preventDefault(); const t = text.trim(); if (!t || busy) return; setBusy(true); setErr('');
    try { await api(`/stories/${s._id}/reply`, { method: 'POST', body: { text: t } }); setText(''); setTyping(false); toast('Reply sent'); qc.invalidateQueries({ queryKey: ['conversations'] }); document.activeElement?.blur(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); } };
  const loading = s.type === 'VIDEO' ? (!media.data?.url || waiting || buf === 0) : s.type === 'IMAGE' ? !loaded && !failed : false;

  return createPortal(<div className="fixed inset-0 z-[70] bg-black grid place-items-center animate-fade" role="dialog" aria-modal="true" aria-label="Status viewer">
    <div className="relative w-full max-w-md h-[100dvh] sm:h-[92vh] sm:rounded-modal overflow-hidden bg-black select-none flex flex-col">
      <div className="absolute top-0 inset-x-0 z-20 p-3 space-y-3 bg-gradient-to-b from-black/70 to-transparent" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex gap-1">{g.stories.map((x, i) => <Seg key={x._id} state={i < si ? 'done' : i === si ? 'now' : 'todo'} p={p} buf={s.type === 'VIDEO' ? buf : 0} loading={i === si && loading} />)}</div>
        <div className="flex items-center gap-2 text-white text-sm"><Link to={`/u/${g.user.username}`} onClick={close} aria-label={`Open ${g.user.username}'s profile`} className="shrink-0"><Avatar user={g.user} size={32} /></Link><Link to={`/u/${g.user.username}`} onClick={close} className="font-bold hover:underline underline-offset-2 truncate">{g.user.displayName || g.user.username}</Link>{g.source === 'suggested' && <span className="text-[10px] bg-white/20 rounded-full px-2 py-0.5">Suggested</span>}<button className="ml-auto w-9 h-9 grid place-items-center" onClick={close} aria-label="Close"><X /></button></div></div>

      {/* media area: press and hold to pause, tap the sides to move */}
      <div className="relative flex-1 min-h-0 touch-none" onPointerDown={down} onPointerUp={up} onPointerLeave={() => setHold(false)} onPointerCancel={() => { setHold(false); swipe.current = null; }}>
        {s.type === 'TEXT' ? <div className={`h-full grid place-items-center p-8 ${statusBg(s.bg).className}`} style={statusBg(s.bg).style}><p className="text-white text-2xl font-bold text-center break-words animate-pop">{s.text}</p></div>
          : failed ? <div className="h-full grid place-items-center text-white/70 text-center p-6"><div className="space-y-2"><ImageOff className="mx-auto" /><p className="text-sm">This status could not be loaded.</p><p className="text-xs">Tap the right side to skip.</p></div></div>
          : media.data?.url ? (s.type === 'VIDEO'
            ? <video key={media.data.url} ref={vid} src={media.data.url} autoPlay playsInline preload="auto" className="w-full h-full object-contain" onTimeUpdate={(e) => setP(e.target.currentTime / (e.target.duration || 1))}
                onProgress={(e) => { const v = e.target; if (v.duration && v.buffered.length) setBuf(v.buffered.end(v.buffered.length - 1) / v.duration); }} onLoadedData={(e) => { const v = e.target; if (v.duration && v.buffered.length) setBuf(v.buffered.end(v.buffered.length - 1) / v.duration); }}
                onWaiting={() => setWaiting(true)} onCanPlay={() => setWaiting(false)} onPlaying={() => setWaiting(false)} onError={() => setFailed(true)} onEnded={next} />
            : <img key={media.data.url} src={media.data.url} alt="" className={`w-full h-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`} ref={(el) => { if (el?.complete && el.naturalWidth) setLoaded(true); }} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />)
          : null}
        {loading && s.type !== 'TEXT' && !failed && <div className="absolute inset-0 grid place-items-center pointer-events-none"><span className="w-14 h-14 rounded-full bg-black/55 backdrop-blur grid place-items-center"><Loader2 className="animate-spin text-white" size={28} /></span></div>}
        {s.text && s.type !== 'TEXT' && <p className="absolute bottom-6 inset-x-0 text-center text-white px-6 drop-shadow font-medium">{s.text}</p>}
        <button aria-label="Previous" className="absolute left-0 top-20 bottom-0 w-1/3" onClick={(e) => { e.stopPropagation(); if (!swiped.current) prev(); }} /><button aria-label="Next" className="absolute right-0 top-20 bottom-0 w-1/3" onClick={(e) => { e.stopPropagation(); if (!swiped.current) next(); }} />
      </div>

      {gi > 0 && <button aria-label="Previous person" onClick={prevUser} className="hidden sm:grid absolute left-2 top-1/2 z-20 w-10 h-10 place-items-center rounded-full bg-white/15 hover:bg-white/25 text-white text-xl">‹</button>}
      {gi < groups.length - 1 && <button aria-label="Next person" onClick={nextUser} className="hidden sm:grid absolute right-2 top-1/2 z-20 w-10 h-10 place-items-center rounded-full bg-white/15 hover:bg-white/25 text-white text-xl">›</button>}
      {/* footer: reply + love (other people's statuses) or love/view counts (your own) */}
      <div className="shrink-0 p-3 bg-gradient-to-t from-black via-black/90 to-black/60 text-white space-y-2" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }} onPointerDown={(e) => e.stopPropagation()}>
        {mine ? <div className="flex items-center justify-center gap-6 text-sm" aria-label="Your status stats"><span className="flex items-center gap-1.5"><Heart size={18} className="text-pink" fill="currentColor" /><b>{s.likeCount ?? 0}</b> love{(s.likeCount ?? 0) === 1 ? '' : 's'}</span><span className="flex items-center gap-1.5"><Eye size={18} /><b>{s.viewCount ?? 0}</b> view{(s.viewCount ?? 0) === 1 ? '' : 's'}</span></div>
          : <>
            {(err || blockedWhy) && <p role="alert" className="text-xs text-warn leading-snug px-1">{err || blockedWhy}</p>}
            <form onSubmit={send} className="flex items-center gap-2">
              {canReply || access.isPending ? <input value={text} onChange={(e) => setText(e.target.value)} onFocus={() => setTyping(true)} onBlur={() => setTyping(false)} maxLength={1000} disabled={busy || access.isPending} placeholder={`Reply to ${g.user.displayName || g.user.username}…`} aria-label="Reply to status" className="flex-1 min-w-0 rounded-full bg-white/12 border border-white/25 px-4 py-2.5 text-sm placeholder:text-white/60 outline-none focus:border-white/60" />
                : <div className="flex-1 rounded-full bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white/60 truncate" aria-disabled>Replies are not available</div>}
              {text.trim() ? <button disabled={busy} aria-label="Send reply" className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-violet to-pink grid place-items-center animate-pop">{busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button> : null}
              <button type="button" onClick={like} aria-label={isLiked ? 'Remove love' : 'Love this status'} aria-pressed={isLiked} className="w-11 h-11 shrink-0 rounded-full grid place-items-center active:scale-90 transition"><Heart key={pop} size={26} className={`${isLiked ? 'text-pink animate-pop' : 'text-white'}`} fill={isLiked ? 'currentColor' : 'none'} /></button>
            </form></>}
      </div>
    </div></div>, document.body);
}

const Item = ({ children, label, sub, onClick, aria, delay = 0 }) => <button onClick={onClick} aria-label={aria} className="flex flex-col items-center gap-1 shrink-0 w-[68px] snap-start animate-rise" style={{ animationDelay: `${delay}ms` }}>{children}<span className="text-[11px] text-ink2 truncate w-full text-center leading-4">{label}</span><span className="text-[9px] text-muted leading-3 h-3 -mt-1">{sub || ''}</span></button>;
export function StoryBar() {
  const { user } = useAuth(); const q = useQuery({ queryKey: ['stories'], queryFn: get('/stories'), staleTime: 60_000 }); const [view, setView] = useState(null); const [adding, setAdding] = useState(false);
  const groups = q.data ? (q.data.mine ? [q.data.mine, ...q.data.groups] : q.data.groups) : []; const mine = q.data?.mine;
  // Every item has the same width, ring size and two-line label block, so the avatars sit on one line and the row lines up with the feed cards.
  return <div className="flex items-start gap-2 overflow-x-auto no-scrollbar snap-x pb-1 -mx-1 px-1" aria-label="Statuses">
    <div className="relative shrink-0 w-[68px]"><Item aria="View or add your status" label="Your status" onClick={() => (mine ? setView({ start: 0 }) : setAdding(true))}><Ring unseen={!!mine}><Avatar user={user} size={52} /></Ring></Item>
      <button onClick={() => setAdding(true)} aria-label="Add status" className="absolute top-[40px] right-[4px] grid place-items-center w-5 h-5 rounded-full bg-violet text-white ring-2 ring-bg"><Plus size={12} /></button></div>
    {q.isPending && [1, 2, 3, 4].map((i) => <div key={i} className="w-[68px] shrink-0 flex flex-col items-center gap-1"><div className="w-[60px] h-[60px] rounded-full bg-card animate-pulse" /><div className="w-10 h-2 rounded bg-card animate-pulse" /></div>)}
    {(q.data?.groups || []).map((g, i) => <Item key={g.user._id} label={g.user.username} sub={g.source === 'suggested' ? 'suggested' : ''} delay={i * 40} onClick={() => setView({ start: groups.indexOf(g) })}><Ring unseen={g.unseen}><Avatar user={g.user} size={52} /></Ring></Item>)}
    {view && <StoryViewer groups={groups} start={view.start} onClose={() => setView(null)} />}<AddStoryModal open={adding} onClose={() => setAdding(false)} /></div>;
}
// Used on a profile: ring + click-to-view for a person's active status.
export function ProfileStory({ userId, person, own, size = 80 }) {
  const q = useQuery({ queryKey: ['stories', 'user', userId], queryFn: get(`/stories/user/${userId}`), staleTime: 60_000 }); const [view, setView] = useState(false); const [adding, setAdding] = useState(false); const g = q.data?.group;
  return <div className="relative inline-block"><button onClick={() => g && setView(true)} aria-label={g ? 'View status' : 'Profile photo'} className={g ? '' : 'cursor-default'}>{g ? <Ring unseen={g.unseen || own}><Avatar user={person} size={size} /></Ring> : <span className="inline-block rounded-full ring-4 ring-card"><Avatar user={person} size={size} /></span>}</button>
    {own && <button onClick={() => setAdding(true)} aria-label="Add status" className="absolute bottom-0 right-0 grid place-items-center w-7 h-7 rounded-full bg-violet text-white ring-2 ring-card animate-glow"><Plus size={16} /></button>}
    {view && g && <StoryViewer groups={[{ ...g, source: own ? 'me' : g.source }]} onClose={() => setView(false)} />}<AddStoryModal open={adding} onClose={() => { setAdding(false); q.refetch(); }} /></div>;
}
