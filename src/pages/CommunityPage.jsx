import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import PostCard from '../components/PostCard.jsx';
import GiftModal from '../components/GiftModal.jsx';
import { Avatar, Badge, Empty, Err, Skeleton } from '../components/ui.jsx';
import { api, ago } from '../lib/api';
import { useAuth } from '../context/Auth.jsx';
import { useLive } from '../context/Live.jsx';
import { useConfirmSpend } from '../components/ConfirmSpend.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import MentionInput from '../components/MentionInput.jsx';
import { uploadWithProgress } from '../lib/upload.js';
import { shrinkImage } from '../lib/image.js';
import { ImagePlus, X, Share2 } from 'lucide-react';

export default function CommunityPage() {
  const { id } = useParams(); const { user } = useAuth(); const { toast } = useLive();
  const [d, setD] = useState(null); const [posts, setPosts] = useState(null); const [text, setText] = useState(''); const [err, setErr] = useState(''); const [gift, setGift] = useState(null); const [inv, setInv] = useState(''); const [tab, setTab] = useState('posts'); const [edit, setEdit] = useState({}); const [files, setFiles] = useState([]); const [pct, setPct] = useState(0); const [busy, setBusy] = useState(false); const fileRef = useRef(); const confirm = useConfirm();
  const load = useCallback(() => api(`/communities/${id}`).then(setD).catch((e) => setErr(e.message)), [id]);
  const loadPosts = useCallback(() => api(`/feed?community=${id}`).then((x) => setPosts(x.posts)).catch((e) => { setPosts([]); e.code !== 'NOT_MEMBER' && setErr(e.message); }), [id]);
  useEffect(() => { load(); loadPosts(); }, [load, loadPosts]);
  if (err && !d) return <Empty>{err}</Empty>; if (!d) return <Skeleton className="h-60" />;
  const c = d.community;
  const ask = useConfirmSpend();
  const join = async () => { if (c.accessFeePoints > 0 && !(await ask({ title: `Join ${c.name}?`, detail: 'One-time access fee.', points: c.accessFeePoints, confirmLabel: 'Join' }))) return; try { await api(`/communities/${id}/join`, { method: 'POST' }); toast(`Joined ${c.name}`); window.dispatchEvent(new Event('wallet:changed')); load(); loadPosts(); } catch (e) { toast(e.code === 'INSUFFICIENT_POINTS' ? 'Not enough points. Top up in your wallet.' : e.message); } };
  const pickFiles = async (e) => { const picked = [...e.target.files]; e.target.value = ''; const room = 4 - files.length; const out = []; let vids = files.filter((f) => f.type.startsWith('video/')).length;
    for (const f of picked.slice(0, room)) { if (f.type.startsWith('video/')) { if (vids >= 2) { setErr('At most 2 videos per post.'); continue; } vids++; out.push({ file: f, url: URL.createObjectURL(f), type: f.type }); } else if (f.type.startsWith('image/')) { const sm = await shrinkImage(f, 1600, 0.88); out.push({ file: sm, url: URL.createObjectURL(sm), type: sm.type }); } }
    setFiles((x) => [...x, ...out]); };
  const post = async (e) => { e.preventDefault(); if ((!text.trim() && !files.length) || busy) return; setBusy(true); setErr('');
    try { const mediaIds = []; for (const f of files) { const fd = new FormData(); fd.append('file', f.file); mediaIds.push((await uploadWithProgress('/media/upload', fd, setPct)).id); }
      await api(`/communities/${id}/posts`, { method: 'POST', body: { content: text, mediaIds } }); files.forEach((f) => URL.revokeObjectURL(f.url)); setFiles([]); setText(''); setPct(0); loadPosts(); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  const share = async () => { const url = `${location.origin}/communities/${id}`; try { if (navigator.share) await navigator.share({ title: c.name, text: `Join ${c.name} on ${location.host}`, url }); else { await navigator.clipboard.writeText(url); toast('Community link copied. Share it so people can join.'); } } catch { /* cancelled */ } };
  const canPost = d.member && (c.allowPosting !== false || d.owner); const canMedia = c.allowMedia !== false || d.owner;
  const del = async (pid) => { if (!(await confirm({ title: 'Remove this post?', confirmLabel: 'Remove', danger: true }))) return; await api(`/communities/${id}/posts/${pid}`, { method: 'DELETE' }); loadPosts(); };
  const kick = async (uid) => { if (await confirm({ title: 'Remove this member?', confirmLabel: 'Remove', danger: true })) { await api(`/communities/${id}/members/${uid}`, { method: 'DELETE' }); load(); } };
  const invite = async () => { try { await api(`/communities/${id}/invite`, { method: 'POST', body: { username: inv } }); toast('Member added'); setInv(''); load(); } catch (e) { setErr(e.message); } };
  const save = async () => { try { await api(`/communities/${id}`, { method: 'PATCH', body: { ...edit, accessFeePoints: edit.accessFeePoints === undefined ? undefined : Number(edit.accessFeePoints) } }); toast('Saved'); load(); } catch (e) { setErr(e.message); } };
  return <div className="space-y-4">
    <div className="card !p-0 overflow-hidden"><div className="h-24 bg-gradient-to-r from-violet/50 to-pink/40" /><div className="p-4 space-y-2">
      <div className="flex items-center gap-2 flex-wrap"><h1 className="text-2xl font-bold">{c.name}</h1><Badge>{c.visibility === 'PRIVATE' ? 'Private' : 'Public'}</Badge>{c.accessFeePoints > 0 && <Badge tone="pink">{c.accessFeePoints} pts</Badge>}</div>
      <p className="text-ink2 text-sm">{c.description}</p><p className="text-xs text-muted">{c.memberCount} members · owner <Link className="underline" to={`/u/${c.ownerId.username}`}>@{c.ownerId.username}</Link></p>
      <div className="flex flex-wrap gap-2">{!d.member && c.visibility === 'PUBLIC' && <button className="btn-primary" onClick={join}>{c.accessFeePoints > 0 ? `Join · ${c.accessFeePoints} pts` : 'Join'}</button>}{c.visibility === 'PUBLIC' && <button className="btn-ghost" onClick={share} aria-label="Share community"><Share2 size={16} />Share</button>}</div></div></div>
    <Err>{err}</Err>
    <div className="flex border-b border-divider" role="tablist">{[['posts', 'Posts'], ['rules', 'Rules'], ['members', 'Members'], ...(d.owner ? [['manage', 'Manage']] : [])].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 py-3 text-sm border-b-2 ${tab === k ? 'border-violet' : 'border-transparent text-ink2'}`}>{l}</button>)}</div>
    {tab === 'posts' && <>{canPost ? <form onSubmit={post} className="card !p-3 space-y-2"><MentionInput value={text} onChange={setText} minHeight={70} label="Post" placeholder="Share with the community… use #tags and @mentions" disabled={busy} />
        {files.length > 0 && <div className="grid grid-cols-4 gap-1.5">{files.map((f, i) => <div key={f.url} className="relative aspect-square rounded-btn overflow-hidden bg-black">{f.type.startsWith('video/') ? <video src={`${f.url}#t=0.1`} muted preload="metadata" className="w-full h-full object-cover" /> : <img src={f.url} alt="" className="w-full h-full object-cover" />}{!busy && <button type="button" className="absolute top-1 right-1 bg-bg/80 rounded-full p-1" aria-label="Remove" onClick={() => setFiles((x) => x.filter((_, k) => k !== i))}><X size={12} /></button>}</div>)}</div>}
        {busy && files.length > 0 && <div className="h-2 rounded-full bg-card2 overflow-hidden"><div className="h-full bg-gradient-to-r from-violet to-pink transition-all" style={{ width: `${pct}%` }} /></div>}
        <div className="flex items-center gap-2"><input ref={fileRef} type="file" hidden multiple accept="image/*,video/*" onChange={pickFiles} />{canMedia && files.length < 4 && <button type="button" className="btn-ghost !px-3" disabled={busy} onClick={() => fileRef.current.click()} aria-label="Add photos or videos"><ImagePlus size={18} /></button>}<span className="text-xs text-muted flex-1">{canMedia ? 'Up to 4 photos/videos (max 2 videos)' : 'Photos and videos are turned off here'}</span><button className="btn-primary" disabled={busy || (!text.trim() && !files.length)}>{busy ? 'Posting…' : 'Post'}</button></div></form>
      : d.member && <div className="card !p-3 text-sm text-ink2">The owner has turned off posting in this community.</div>}
      {!posts ? <Skeleton /> : posts.length === 0 ? <Empty>{d.member ? 'No posts yet. Start the conversation!' : 'Join to see and share posts.'}</Empty> : posts.map((p) => <div key={p._id} className="space-y-1"><PostCard post={p} onGift={setGift} onChange={loadPosts} />{(d.owner || p.authorId._id === user.id) && <button className="text-xs text-bad px-2" onClick={() => del(p._id)}>Remove post</button>}</div>)}</>}
    {tab === 'rules' && <div className="card text-sm whitespace-pre-wrap">{c.rules || 'No rules set yet.'}</div>}
    {tab === 'members' && (d.members.length === 0 ? <Empty>Join to see members.</Empty> : <div className="space-y-2">{d.members.map((m) => <div key={m._id} className="card !p-3 flex items-center gap-3"><Avatar user={m} size={32} /><Link to={`/u/${m.username}`} className="flex-1 text-sm">{m.displayName || m.username}</Link>{d.owner && m._id !== user.id && <button className="text-xs text-bad" onClick={() => kick(m._id)}>Remove</button>}</div>)}</div>)}
    {tab === 'manage' && <div className="card space-y-3"><p className="font-semibold text-sm">Community settings</p>{[['allowPosting', 'Members can post'], ['allowMedia', 'Members can post photos and videos']].map(([k, l]) => { const on = (edit[k] ?? c[k]) !== false; return <label key={k} className="flex items-center justify-between gap-3 text-sm"><span>{l}</span><button type="button" role="switch" aria-checked={on} onClick={() => setEdit({ ...edit, [k]: !on })} className={`relative w-11 h-6 rounded-full shrink-0 transition ${on ? 'bg-violet' : 'bg-card2 border border-line'}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition ${on ? 'translate-x-5' : ''}`} /></button></label>; })}<p className="text-xs text-muted">As the owner you can always post. Turning posting off also stops everyone else from sharing.</p><textarea className="input" defaultValue={c.description} placeholder="Description" onChange={(e) => setEdit({ ...edit, description: e.target.value })} /><textarea className="input min-h-[90px]" defaultValue={c.rules} placeholder="Rules" onChange={(e) => setEdit({ ...edit, rules: e.target.value })} />
      {user.accountMode === 'CREATOR' && <label className="block text-sm">Access fee (points)<input type="number" min={0} className="input mt-1" defaultValue={c.accessFeePoints} onChange={(e) => setEdit({ ...edit, accessFeePoints: e.target.value })} /></label>}<button className="btn-primary" onClick={save}>Save changes</button>
      <div className="flex gap-2"><input className="input" placeholder="Add member by username" value={inv} onChange={(e) => setInv(e.target.value)} /><button className="btn-ghost" onClick={invite}>Add</button></div></div>}
    <GiftModal creator={gift} onClose={() => setGift(null)} /></div>;
}
