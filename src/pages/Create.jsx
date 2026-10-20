import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, X, Lock } from 'lucide-react';
import { api } from '../lib/api';
import { get } from '../lib/query.js';
import { uploadWithProgress } from '../lib/upload.js';
import { shrinkImage } from '../lib/image.js';
import { useAuth } from '../context/Auth.jsx';
import { Err } from '../components/ui.jsx';
import { useLive } from '../context/Live.jsx';

export default function Create() {
  const { user } = useAuth(); const nav = useNavigate(); const { toast } = useLive(); const qc = useQueryClient(); const fileRef = useRef();
  const creator = user.accountMode === 'CREATOR';
  const pro = useQuery({ queryKey: ['pro'], queryFn: get('/pro'), staleTime: 5 * 60_000 });
  const [f, setF] = useState({ content: '', access: 'PUBLIC', price: 2, exclusiveText: '' }); const [file, setFile] = useState(null); const [url, setUrl] = useState(null); const [preview, setPreview] = useState(null);
  const [err, setErr] = useState(''); const [pct, setPct] = useState(0); const [stage, setStage] = useState(''); const busy = !!stage;
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
  const lim = pro.data?.limits[user.creatorPlan === 'PRO' && creator ? 'PRO' : 'DEFAULT'];
  const video = file?.type.startsWith('video/');
  const pick = async (e) => { const x = e.target.files[0]; if (!x) return; setErr(''); const out = x.type.startsWith('image/') ? await shrinkImage(x, 1600, 0.88) : x; setFile(out); setUrl(URL.createObjectURL(out)); e.target.value = ''; };
  const upload = async (blob, qs = '') => { const fd = new FormData(); fd.append('file', blob); return (await uploadWithProgress(`/media/upload${qs}`, fd, setPct)).id; };
  const submit = (draft) => async (e) => { e.preventDefault(); if (busy) return; setErr(''); setPct(0);
    try {
      let mediaId, previewMediaId; if (file) { setStage('Uploading'); mediaId = await upload(file); } if (preview) { setStage('Uploading preview'); setPct(0); previewMediaId = await upload(preview, '?kind=preview'); }
      setStage('Publishing'); await api('/media/posts', { method: 'POST', body: { content: f.content, mediaId, previewMediaId, draft, access: creator ? f.access : 'PUBLIC', unlockPricePoints: creator && f.access === 'EXCLUSIVE' ? Number(f.price) : 0, exclusiveText: creator && f.exclusiveText ? f.exclusiveText : undefined } });
      toast(draft ? 'Saved as draft' : 'Published!'); qc.invalidateQueries({ queryKey: ['feed'] }); qc.invalidateQueries({ queryKey: ['insights'] }); nav(draft ? '/insights' : '/home');
    } catch (x) { setErr(x.message); } finally { setStage(''); } };
  return <form onSubmit={submit(false)} className="card space-y-4"><h1 className="text-2xl font-bold">New post</h1>
    <textarea className="input min-h-[120px]" placeholder="What's on your mind? Use #hashtags so people can find it" value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} aria-label="Caption" maxLength={5000} disabled={busy} />
    <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={pick} />
    {url ? <div className="relative rounded-card overflow-hidden bg-black animate-pop">{video ? <video src={url} controls className="w-full max-h-72" /> : <img src={url} alt="Selected" className="w-full max-h-72 object-contain" />}
        {!busy && <button type="button" onClick={() => { setFile(null); setUrl(null); }} className="absolute top-2 right-2 bg-bg/80 rounded-full p-1.5" aria-label="Remove file"><X size={16} /></button>}</div>
      : <button type="button" onClick={() => fileRef.current.click()} className="w-full rounded-card border-2 border-dashed border-line py-10 grid place-items-center gap-2 text-ink2 hover:border-violet group" aria-label="Add a photo or video">
        <span className="grid place-items-center w-16 h-16 rounded-full bg-violet/20 text-violet-light animate-glow group-hover:scale-110 transition"><ImagePlus size={30} /></span><span className="text-sm">Tap to add a photo or video</span><span className="text-xs text-muted">Videos up to {lim ? `${lim.videoSec}s` : 'your plan limit'} · checked by the server</span></button>}
    {url && !busy && <button type="button" onClick={() => fileRef.current.click()} className="text-sm text-violet-light">Choose a different file</button>}
    {creator ? <>
      <label className="block text-sm">Who can see it<select className="input mt-1" value={f.access} onChange={(e) => setF({ ...f, access: e.target.value })} disabled={busy}><option value="PUBLIC">Everyone</option><option value="EXCLUSIVE">Exclusive (pay to unlock)</option><option value="SUBSCRIBERS">Subscribers only</option></select></label>
      {f.access === 'EXCLUSIVE' && <label className="block text-sm animate-rise">Unlock price (points)<input type="number" min={1} max={lim?.maxUnlockPoints} className="input mt-1" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} disabled={busy} /><span className="text-xs text-muted">Your plan allows up to {lim?.maxUnlockPoints ?? '…'} points{user.creatorPlan !== 'PRO' && ' (Pro allows more)'}.</span></label>}
      {f.access !== 'PUBLIC' && <label className="block text-sm animate-rise">Protected text (revealed after access)<textarea className="input mt-1" value={f.exclusiveText} onChange={(e) => setF({ ...f, exclusiveText: e.target.value })} disabled={busy} /></label>}
      {f.access !== 'PUBLIC' && video && <label className="block text-sm animate-rise">Public preview clip <span className="text-muted">(short video, visible to everyone)</span><input type="file" accept="video/*" className="input mt-1" onChange={(e) => setPreview(e.target.files[0])} disabled={busy} /></label>}
    </> : <p className="text-xs text-muted flex items-center gap-1"><Lock size={12} />Exclusive and paid posts are for creators. Become a creator from your profile.</p>}
    {busy && <div className="space-y-1 animate-fade"><div className="h-2.5 rounded-full bg-card2 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-gradient-to-r from-violet to-pink transition-all duration-200" style={{ width: stage === 'Publishing' ? '100%' : `${pct}%` }} /></div><p className="text-xs text-ink2 text-center">{stage === 'Publishing' ? 'Publishing…' : `${stage}… ${pct}%`}</p></div>}
    <Err>{err}</Err>
    <div className="flex gap-2"><button type="button" className="btn-ghost flex-1" disabled={busy} onClick={submit(true)}>Save draft</button><button className="btn-primary flex-1" disabled={busy || (!f.content.trim() && !file)}>{busy ? 'Working…' : 'Publish'}</button></div></form>;
}
