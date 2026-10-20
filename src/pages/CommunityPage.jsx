import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import PostCard from '../components/PostCard.jsx';
import GiftModal from '../components/GiftModal.jsx';
import { Avatar, Badge, Empty, Err, Skeleton } from '../components/ui.jsx';
import { api, ago } from '../lib/api';
import { useAuth } from '../context/Auth.jsx';
import { useLive } from '../context/Live.jsx';
import { useConfirmSpend } from '../components/ConfirmSpend.jsx';

export default function CommunityPage() {
  const { id } = useParams(); const { user } = useAuth(); const { toast } = useLive();
  const [d, setD] = useState(null); const [posts, setPosts] = useState(null); const [text, setText] = useState(''); const [err, setErr] = useState(''); const [gift, setGift] = useState(null); const [inv, setInv] = useState(''); const [tab, setTab] = useState('posts'); const [edit, setEdit] = useState({});
  const load = useCallback(() => api(`/communities/${id}`).then(setD).catch((e) => setErr(e.message)), [id]);
  const loadPosts = useCallback(() => api(`/feed?community=${id}`).then((x) => setPosts(x.posts)).catch((e) => { setPosts([]); e.code !== 'NOT_MEMBER' && setErr(e.message); }), [id]);
  useEffect(() => { load(); loadPosts(); }, [load, loadPosts]);
  if (err && !d) return <Empty>{err}</Empty>; if (!d) return <Skeleton className="h-60" />;
  const c = d.community;
  const ask = useConfirmSpend();
  const join = async () => { if (c.accessFeePoints > 0 && !(await ask({ title: `Join ${c.name}?`, detail: 'One-time access fee.', points: c.accessFeePoints, confirmLabel: 'Join' }))) return; try { await api(`/communities/${id}/join`, { method: 'POST' }); toast(`Joined ${c.name}`); window.dispatchEvent(new Event('wallet:changed')); load(); loadPosts(); } catch (e) { toast(e.code === 'INSUFFICIENT_POINTS' ? 'Not enough points. Top up in your wallet.' : e.message); } };
  const post = async (e) => { e.preventDefault(); if (!text.trim()) return; try { await api(`/communities/${id}/posts`, { method: 'POST', body: { content: text } }); setText(''); loadPosts(); } catch (x) { setErr(x.message); } };
  const del = async (pid) => { await api(`/communities/${id}/posts/${pid}`, { method: 'DELETE' }); loadPosts(); };
  const kick = async (uid) => { if (confirm('Remove this member?')) { await api(`/communities/${id}/members/${uid}`, { method: 'DELETE' }); load(); } };
  const invite = async () => { try { await api(`/communities/${id}/invite`, { method: 'POST', body: { username: inv } }); toast('Member added'); setInv(''); load(); } catch (e) { setErr(e.message); } };
  const save = async () => { try { await api(`/communities/${id}`, { method: 'PATCH', body: { ...edit, accessFeePoints: edit.accessFeePoints === undefined ? undefined : Number(edit.accessFeePoints) } }); toast('Saved'); load(); } catch (e) { setErr(e.message); } };
  return <div className="space-y-4">
    <div className="card !p-0 overflow-hidden"><div className="h-24 bg-gradient-to-r from-violet/50 to-pink/40" /><div className="p-4 space-y-2">
      <div className="flex items-center gap-2 flex-wrap"><h1 className="text-2xl font-bold">{c.name}</h1><Badge>{c.visibility === 'PRIVATE' ? 'Private' : 'Public'}</Badge>{c.accessFeePoints > 0 && <Badge tone="pink">{c.accessFeePoints} pts</Badge>}</div>
      <p className="text-ink2 text-sm">{c.description}</p><p className="text-xs text-muted">{c.memberCount} members · owner <Link className="underline" to={`/u/${c.ownerId.username}`}>@{c.ownerId.username}</Link></p>
      {!d.member && c.visibility === 'PUBLIC' && <button className="btn-primary" onClick={join}>{c.accessFeePoints > 0 ? `Join · ${c.accessFeePoints} pts` : 'Join'}</button>}</div></div>
    <Err>{err}</Err>
    <div className="flex border-b border-divider" role="tablist">{[['posts', 'Posts'], ['rules', 'Rules'], ['members', 'Members'], ...(d.owner ? [['manage', 'Manage']] : [])].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 py-3 text-sm border-b-2 ${tab === k ? 'border-violet' : 'border-transparent text-ink2'}`}>{l}</button>)}</div>
    {tab === 'posts' && <>{d.member && <form onSubmit={post} className="card !p-3 flex gap-2"><input className="input" placeholder="Share with the community…" value={text} onChange={(e) => setText(e.target.value)} /><button className="btn-primary">Post</button></form>}
      {!posts ? <Skeleton /> : posts.length === 0 ? <Empty>{d.member ? 'No posts yet. Start the conversation!' : 'Join to see and share posts.'}</Empty> : posts.map((p) => <div key={p._id} className="space-y-1"><PostCard post={p} onGift={setGift} onChange={loadPosts} />{(d.owner || p.authorId._id === user.id) && <button className="text-xs text-bad px-2" onClick={() => del(p._id)}>Remove post</button>}</div>)}</>}
    {tab === 'rules' && <div className="card text-sm whitespace-pre-wrap">{c.rules || 'No rules set yet.'}</div>}
    {tab === 'members' && (d.members.length === 0 ? <Empty>Join to see members.</Empty> : <div className="space-y-2">{d.members.map((m) => <div key={m._id} className="card !p-3 flex items-center gap-3"><Avatar user={m} size={32} /><Link to={`/u/${m.username}`} className="flex-1 text-sm">{m.displayName || m.username}</Link>{d.owner && m._id !== user.id && <button className="text-xs text-bad" onClick={() => kick(m._id)}>Remove</button>}</div>)}</div>)}
    {tab === 'manage' && <div className="card space-y-3"><textarea className="input" defaultValue={c.description} placeholder="Description" onChange={(e) => setEdit({ ...edit, description: e.target.value })} /><textarea className="input min-h-[90px]" defaultValue={c.rules} placeholder="Rules" onChange={(e) => setEdit({ ...edit, rules: e.target.value })} />
      {user.accountMode === 'CREATOR' && <label className="block text-sm">Access fee (points)<input type="number" min={0} className="input mt-1" defaultValue={c.accessFeePoints} onChange={(e) => setEdit({ ...edit, accessFeePoints: e.target.value })} /></label>}<button className="btn-primary" onClick={save}>Save changes</button>
      <div className="flex gap-2"><input className="input" placeholder="Add member by username" value={inv} onChange={(e) => setInv(e.target.value)} /><button className="btn-ghost" onClick={invite}>Add</button></div></div>}
    <GiftModal creator={gift} onClose={() => setGift(null)} /></div>;
}
