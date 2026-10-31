import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, ImagePlus } from 'lucide-react';
import { Avatar, Modal, Err } from './ui.jsx';
import { api } from '../lib/api';
import { get } from '../lib/query.js';
import { uploadWithProgress } from '../lib/upload.js';
import { shrinkImage } from '../lib/image.js';
import { useAuth } from '../context/Auth.jsx';
import { useLive } from '../context/Live.jsx';

const BG = { violet: 'from-violet to-pink', pink: 'from-pink to-violet', blue: 'from-info to-violet', green: 'from-ok to-info', amber: 'from-warn to-pink', teal: 'from-teal-500 to-emerald-700', red: 'from-red-500 to-rose-800', orange: 'from-orange-400 to-red-500', indigo: 'from-indigo-500 to-blue-800', slate: 'from-slate-500 to-slate-900' };
const Ring = ({ unseen, children }) => <span className={`inline-block p-[2px] rounded-full ${unseen ? 'bg-gradient-to-tr from-violet to-pink' : 'bg-line'}`}><span className="block p-[2px] bg-bg rounded-full">{children}</span></span>;

export function AddStoryModal({ open, onClose }) {
  const qc = useQueryClient(); const { user } = useAuth(); const { toast } = useLive(); const fileRef = useRef();
  const [file, setFile] = useState(null); const [url, setUrl] = useState(null); const [text, setText] = useState(''); const [bg, setBg] = useState('violet'); const [pct, setPct] = useState(0); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { if (!open) { setFile(null); setUrl(null); setText(''); setPct(0); setErr(''); setBusy(false); } }, [open]);
  const pick = async (e) => { const f = e.target.files[0]; if (!f) return; const out = f.type.startsWith('image/') ? await shrinkImage(f, 1280) : f; setFile(out); setUrl(URL.createObjectURL(out)); };
  const post = async () => { setBusy(true); setErr(''); setPct(0);
    try { const fd = new FormData(); if (file) fd.append('file', file); if (text.trim()) fd.append('text', text.trim()); fd.append('bg', bg); await uploadWithProgress('/stories', fd, setPct);
      toast('Status posted. It disappears in 24 hours.'); qc.invalidateQueries({ queryKey: ['stories'] }); onClose(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); } };
  const video = file?.type.startsWith('video/');
  return <Modal open={open} onClose={() => !busy && onClose()} title="Add to your status">
    <div className="space-y-3">
      {url ? <div className="relative rounded-card overflow-hidden bg-black">{video ? <video src={url} controls className="w-full max-h-72" /> : <img src={url} alt="Status preview" className="w-full max-h-72 object-contain" />}<button className="absolute top-2 right-2 bg-bg/80 rounded-full p-1" aria-label="Remove" onClick={() => { setFile(null); setUrl(null); }}><X size={16} /></button></div>
        : <div className={`rounded-card bg-gradient-to-br ${BG[bg]} p-6 min-h-[160px] grid place-items-center`}><textarea maxLength={220} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a status…" aria-label="Status text" className="w-full bg-transparent text-center text-xl font-semibold placeholder:text-white/60 resize-none outline-none" rows={3} /></div>}
      {!url && <div className="flex gap-2 items-center flex-wrap">{Object.keys(BG).map((k) => <button key={k} aria-label={`Colour ${k}`} onClick={() => setBg(k)} className={`w-7 h-7 rounded-full bg-gradient-to-br ${BG[k]} ${bg === k ? 'ring-2 ring-white' : ''}`} />)}<span className="text-xs text-muted ml-auto">{text.length}/220</span></div>}
      <input ref={fileRef} type="file" hidden accept="image/*,video/*" onChange={pick} />
      <button type="button" disabled={busy} onClick={() => fileRef.current.click()} className="btn-ghost w-full animate-glow"><ImagePlus size={18} />{url ? 'Choose a different photo or video' : 'Add a photo or video'}</button>
      <p className="text-xs text-muted">Videos up to {user.creatorPlan === 'PRO' && user.accountMode === 'CREATOR' ? 'the Pro' : 'your plan\'s'} length limit (checked by the server). Statuses disappear after 24 hours.</p>
      {busy && <div className="h-2 rounded-full bg-card2 overflow-hidden" role="progressbar" aria-valuenow={pct}><div className="h-full bg-gradient-to-r from-violet to-pink transition-all" style={{ width: `${pct}%` }} /></div>}
      <Err>{err}</Err>
      <button className="btn-primary w-full" disabled={busy || (!file && !text.trim())} onClick={post}>{busy ? (pct < 100 ? `Uploading… ${pct}%` : 'Finishing…') : 'Share status'}</button>
    </div></Modal>;
}

export function StoryViewer({ groups, start = 0, onClose }) {
  const qc = useQueryClient(); const [gi, setGi] = useState(start); const [si, setSi] = useState(0); const [p, setP] = useState(0); const [hold, setHold] = useState(false); const vid = useRef();
  const g = groups[gi]; const s = g?.stories[si];
  const media = useQuery({ queryKey: ['story-media', s?._id], queryFn: get(`/stories/${s?._id}/media`), enabled: !!s?.hasMedia, staleTime: 4 * 60_000, retry: false });
  const next = () => { if (si < g.stories.length - 1) { setSi(si + 1); setP(0); } else if (gi < groups.length - 1) { setGi(gi + 1); setSi(0); setP(0); } else close(); };
  const prev = () => { if (si > 0) { setSi(si - 1); setP(0); } else if (gi > 0) { setGi(gi - 1); setSi(0); setP(0); } };
  const close = () => { qc.invalidateQueries({ queryKey: ['stories'] }); onClose(); };
  useEffect(() => { if (s && g.source !== 'me') api(`/stories/${s._id}/view`, { method: 'POST' }).catch(() => {}); }, [s?._id]);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); });
  useEffect(() => { // progress: 5s for text/photos, real playback time for videos
    if (!s || hold) return; if (s.type === 'VIDEO') return; let raf, last = performance.now(); const tick = (t) => { setP((x) => { const n = x + (t - last) / 5000; last = t; if (n >= 1) { next(); return 0; } return n; }); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [s?._id, hold]);
  if (!g || !s) return null;
  return <div className="fixed inset-0 z-50 bg-black grid place-items-center animate-fade" role="dialog" aria-modal="true" aria-label="Status viewer">
    <div className="relative w-full max-w-md h-full sm:h-[92vh] sm:rounded-modal overflow-hidden bg-black select-none" onPointerDown={() => { setHold(true); vid.current?.pause(); }} onPointerUp={() => { setHold(false); vid.current?.play(); }}>
      <div className="absolute top-0 inset-x-0 z-10 p-3 space-y-3 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex gap-1">{g.stories.map((x, i) => <i key={x._id} className="h-[3px] flex-1 rounded-full bg-white/30 overflow-hidden"><b className="block h-full bg-white" style={{ width: i < si ? '100%' : i === si ? `${p * 100}%` : '0%' }} /></i>)}</div>
        <div className="flex items-center gap-2 text-white text-sm"><Avatar user={g.user} size={32} /><b>{g.user.displayName || g.user.username}</b>{g.source === 'suggested' && <span className="text-[10px] bg-white/20 rounded-full px-2 py-0.5">Suggested</span>}<button className="ml-auto" onClick={close} aria-label="Close"><X /></button></div></div>
      {s.type === 'TEXT' ? <div className={`h-full grid place-items-center p-8 bg-gradient-to-br ${BG[s.bg] || BG.violet}`}><p className="text-white text-2xl font-bold text-center break-words animate-pop">{s.text}</p></div>
        : media.data?.url ? (s.type === 'VIDEO' ? <video ref={vid} src={media.data.url} autoPlay playsInline className="w-full h-full object-contain" onTimeUpdate={(e) => setP(e.target.currentTime / (e.target.duration || 1))} onEnded={next} /> : <img src={media.data.url} alt="" className="w-full h-full object-contain" />)
        : <div className="h-full grid place-items-center text-white/60 animate-pulse">Loading…</div>}
      {s.text && s.type !== 'TEXT' && <p className="absolute bottom-10 inset-x-0 text-center text-white px-6 drop-shadow font-medium">{s.text}</p>}
      <button aria-label="Previous" className="absolute left-0 top-16 bottom-0 w-1/3" onClick={(e) => { e.stopPropagation(); prev(); }} /><button aria-label="Next" className="absolute right-0 top-16 bottom-0 w-1/3" onClick={(e) => { e.stopPropagation(); next(); }} />
    </div></div>;
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
