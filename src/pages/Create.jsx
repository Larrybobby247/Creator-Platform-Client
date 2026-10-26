import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, X, Lock, Play } from 'lucide-react';
import { api, uid } from '../lib/api';
import { get } from '../lib/query.js';
import { uploadWithProgress } from '../lib/upload.js';
import { shrinkImage } from '../lib/image.js';
import { useAuth } from '../context/Auth.jsx';
import { Err } from '../components/ui.jsx';
import { useLive } from '../context/Live.jsx';
import MentionInput from '../components/MentionInput.jsx';
import PricePrompt from '../components/PricePrompt.jsx';

const MAX = 4, MAX_VIDEOS = 2;
const GRID = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-2', 4: 'grid-cols-2' };
const ACCESS = [['PUBLIC', 'Free'], ['EXCLUSIVE', 'Exclusive'], ['SUBSCRIBERS', 'Subscribers']];

export default function Create() {
  const { user } = useAuth(); const nav = useNavigate(); const { toast } = useLive(); const qc = useQueryClient(); const fileRef = useRef();
  const creator = user.accountMode === 'CREATOR';
  const pro = useQuery({ queryKey: ['pro'], queryFn: get('/pro'), staleTime: 5 * 60_000 });
  const lim = pro.data?.limits[user.creatorPlan === 'PRO' && creator ? 'PRO' : 'DEFAULT'];
  const [content, setContent] = useState(''); const [exclusiveText, setExclusiveText] = useState(''); const [items, setItems] = useState([]); const [picked, setPicked] = useState(null); // picked = files waiting for the free/paid prompt
  const [err, setErr] = useState(''); const [pct, setPct] = useState(0); const [stage, setStage] = useState(''); const busy = !!stage;
  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.url)), []);
  const videos = items.filter((i) => i.type === 'VIDEO').length;

  const pick = async (e) => {
    const files = [...e.target.files]; e.target.value = ''; if (!files.length) return; setErr('');
    const room = MAX - items.length; if (room <= 0) return setErr(`You can add up to ${MAX} photos or videos.`);
    let vids = videos; const ok = [];
    for (const f of files.slice(0, room)) { const v = f.type.startsWith('video/'); if (!v && !f.type.startsWith('image/')) continue; if (v && vids >= MAX_VIDEOS) { setErr(`At most ${MAX_VIDEOS} videos per post.`); continue; } if (v) vids++; ok.push(f); }
    if (files.length > room) setErr(`Only ${room} more item${room === 1 ? '' : 's'} fit. The rest were skipped.`);
    if (!ok.length) return;
    const prepared = await Promise.all(ok.map(async (f) => { const out = f.type.startsWith('image/') ? await shrinkImage(f, 1600, 0.88) : f; return { id: uid(), file: out, url: URL.createObjectURL(out), type: out.type.startsWith('video/') ? 'VIDEO' : 'IMAGE', access: 'PUBLIC', price: 0 }; }));
    creator ? setPicked(prepared) : setItems((x) => [...x, ...prepared]); // creators are asked "free or paid?" first
  };
  const setItem = (id, patch) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const remove = (id) => setItems((xs) => { const g = xs.find((x) => x.id === id); g && URL.revokeObjectURL(g.url); return xs.filter((x) => x.id !== id); });
  const gated = items.some((i) => i.access !== 'PUBLIC');

  const submit = (draft) => async (e) => { e.preventDefault(); if (busy) return; setErr(''); setPct(0);
    if (items.some((i) => i.access === 'EXCLUSIVE' && !(Number(i.price) >= 1))) return setErr('Set a price (at least 1 point) for every exclusive item.');
    try {
      const media = []; let n = 0;
      for (const it of items) { n++; setStage(`Uploading ${n} of ${items.length}`); setPct(0); const fd = new FormData(); fd.append('file', it.file); const up = await uploadWithProgress('/media/upload', fd, setPct); media.push({ mediaId: up.id, access: it.access, pricePoints: it.access === 'EXCLUSIVE' ? Number(it.price) : 0 }); }
      setStage('Publishing'); await api('/media/posts', { method: 'POST', body: { content, draft, media: media.length ? media : undefined, exclusiveText: creator && gated && exclusiveText ? exclusiveText : undefined } });
      toast(draft ? 'Saved as draft' : 'Published!'); qc.invalidateQueries({ queryKey: ['feed'] }); qc.invalidateQueries({ queryKey: ['insights'] }); nav(draft ? '/insights' : '/home');
    } catch (x) { setErr(x.message); } finally { setStage(''); } };

  return <form onSubmit={submit(false)} className="card space-y-4"><h1 className="text-2xl font-bold">New post</h1>
    <MentionInput value={content} onChange={setContent} placeholder="What's on your mind? Use #hashtags and tag people with @username" disabled={busy} />
    <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={pick} />
    {items.length > 0 && <div className={`grid gap-1.5 ${GRID[items.length]}`}>{items.map((it, idx) => <div key={it.id} className={`relative rounded-card overflow-hidden bg-black animate-pop ${items.length === 3 && idx === 2 ? 'col-span-2' : ''}`}>
      <div className={items.length === 1 ? 'max-h-72' : 'h-40'}>{it.type === 'VIDEO' ? <video src={`${it.url}#t=0.1`} preload="metadata" muted playsInline className="w-full h-full object-cover" /> : <img src={it.url} alt="Selected" className="w-full h-full object-cover" />}</div>
      {it.type === 'VIDEO' && <span className="absolute top-2 left-2 text-[11px] bg-bg/80 rounded-full px-2 py-1 flex items-center gap-1"><Play size={10} />Video</span>}
      {!busy && <button type="button" onClick={() => remove(it.id)} className="absolute top-2 right-2 bg-bg/80 rounded-full p-1.5" aria-label="Remove file"><X size={16} /></button>}
      {creator && <div className="p-2 bg-card2 space-y-1.5"><div className="flex gap-1" role="radiogroup" aria-label="Who can view this item">{ACCESS.map(([k, l]) => <button type="button" key={k} disabled={busy} role="radio" aria-checked={it.access === k} onClick={() => setItem(it.id, { access: k, price: k === 'EXCLUSIVE' ? (it.price || 5) : 0 })} className={`flex-1 text-[11px] py-1.5 rounded-full border ${it.access === k ? 'bg-violet border-violet' : 'border-line text-ink2'}`}>{l}</button>)}</div>
        {it.access === 'EXCLUSIVE' && <label className="flex items-center gap-2 text-xs">Price<input type="number" min={1} disabled={busy} className="input !py-1 !px-2 w-20" value={it.price} onChange={(e) => setItem(it.id, { price: e.target.value })} />pts</label>}</div>}
    </div>)}</div>}
    {items.length < MAX && <button type="button" disabled={busy} onClick={() => fileRef.current.click()} className={`w-full rounded-card border-2 border-dashed border-line grid place-items-center gap-2 text-ink2 hover:border-violet group ${items.length ? 'py-4' : 'py-10'}`} aria-label="Add photos or videos">
      {!items.length && <span className="grid place-items-center w-16 h-16 rounded-full bg-violet/20 text-violet-light animate-glow group-hover:scale-110 transition"><ImagePlus size={30} /></span>}
      <span className="text-sm">{items.length ? `Add more (${items.length}/${MAX})` : 'Tap to add photos or videos'}</span>
      {!items.length && <span className="text-xs text-muted text-center px-4">Up to {MAX} items, with at most {MAX_VIDEOS} videos · videos up to {lim ? `${lim.videoSec}s` : 'your plan limit'}</span>}</button>}
    {creator ? gated && <label className="block text-sm animate-rise">Protected text <span className="text-muted">(shown after someone unlocks an item)</span><textarea className="input mt-1" value={exclusiveText} onChange={(e) => setExclusiveText(e.target.value)} disabled={busy} maxLength={5000} /></label>
      : <p className="text-xs text-muted flex items-center gap-1"><Lock size={12} />Exclusive and paid posts are for creators. <Link to="/become-creator" className="text-violet-light underline">Become a creator</Link></p>}
    {busy && <div className="space-y-1 animate-fade"><div className="h-2.5 rounded-full bg-card2 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-gradient-to-r from-violet to-pink transition-all duration-200" style={{ width: stage === 'Publishing' ? '100%' : `${pct}%` }} /></div><p className="text-xs text-ink2 text-center">{stage === 'Publishing' ? 'Publishing…' : `${stage}… ${pct}%`}</p></div>}
    <Err>{err}</Err>
    <div className="flex gap-2"><button type="button" className="btn-ghost flex-1" disabled={busy} onClick={submit(true)}>Save draft</button><button className="btn-primary flex-1" disabled={busy || (!content.trim() && !items.length)}>{busy ? 'Working…' : 'Publish'}</button></div>
    {picked && <PricePrompt title={`Add ${picked.length > 1 ? `${picked.length} files` : picked[0].type === 'VIDEO' ? 'video' : 'photo'}: free or paid?`} noun={picked.length > 1 ? 'each item' : 'this item'} allowSubscribers defaultPrice={user.services?.paidPhotos?.pricePoints || 5}
      onClose={() => { picked.forEach((p) => URL.revokeObjectURL(p.url)); setPicked(null); }} onDone={({ access, price }) => { setItems((x) => [...x, ...picked.map((p) => ({ ...p, access, price }))]); setPicked(null); }} />}
  </form>;
}
