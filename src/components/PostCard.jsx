import { useEffect, useRef, useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Heart, MessageCircle, Gift, Lock, MoreHorizontal, Pin, Eye } from 'lucide-react';
import { Avatar, Badge, CreatorBadge, Err, Modal } from './ui.jsx';
import PostMedia from './PostMedia.jsx';
import CommentsModal from './CommentsModal.jsx';
import { api, ago } from '../lib/api';
import { useLive } from '../context/Live.jsx';
import { useAuth } from '../context/Auth.jsx';
import { useConfirmSpend } from './ConfirmSpend.jsx';

// ---- unique-viewer tracking: report posts that were on screen for a second, batched every 3 s
const queue = new Set(), seen = new Set(); let timer;
const flush = () => { const ids = [...queue]; queue.clear(); if (ids.length) api('/posts/views', { method: 'POST', body: { ids } }).catch(() => {}); };
const trackView = (id) => { if (seen.has(id)) return; seen.add(id); queue.add(id); clearTimeout(timer); timer = setTimeout(flush, 3000); };

const DOTS = [[-18, -16], [18, -16], [0, -24], [-20, 8], [20, 8], [-8, 18], [8, 18]];
function LikeButton({ liked, count, onClick }) {
  const [burst, setBurst] = useState(0);
  return <button onClick={() => { if (!liked) setBurst(Date.now()); onClick(); }} className={`relative flex items-center gap-1 ${liked ? 'text-pink' : ''}`} aria-label="Like" aria-pressed={liked}>
    <span key={liked ? 'on' : 'off'} className={liked ? 'inline-block animate-heart' : 'inline-block'}><Heart size={18} fill={liked ? 'currentColor' : 'none'} /></span>
    {burst > 0 && <span key={burst} className="absolute left-2 top-2 pointer-events-none" aria-hidden>{DOTS.map(([x, y], i) => <i key={i} className="burst-dot animate-burst" style={{ '--x': `${x}px`, '--y': `${y}px`, animationDelay: `${i * 15}ms` }} />)}</span>}{count}</button>;
}
const REPORT_CATS = [['SPAM', 'Spam'], ['INAPPROPRIATE_CONTENT', 'Inappropriate content'], ['HARASSMENT', 'Harassment'], ['IMPERSONATION', 'Impersonation'], ['FRAUD', 'Fraud or scam'], ['SAFETY', 'Safety concern'], ['OTHER', 'Something else']];

function ReportModal({ post, onClose }) {
  const { toast } = useLive(); const [cat, setCat] = useState('SPAM'); const [why, setWhy] = useState(''); const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await api('/report', { method: 'POST', body: { targetType: 'POST', targetId: post._id, category: cat, reason: why || REPORT_CATS.find((c) => c[0] === cat)[1] } }); toast('Report sent. Thank you.'); onClose(); } catch (e) { toast(e.message); } finally { setBusy(false); } };
  return <Modal open onClose={onClose} title="Report this post"><div className="space-y-3"><select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>{REPORT_CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><textarea className="input" placeholder="Add details (optional)" value={why} onChange={(e) => setWhy(e.target.value)} maxLength={500} /><button className="btn-primary w-full" disabled={busy} onClick={go}>{busy ? 'Sending…' : 'Send report'}</button></div></Modal>;
}
function EditModal({ post, creator, onClose, onSaved }) {
  const { toast } = useLive(); const [content, setContent] = useState(post.content || ''); const [price, setPrice] = useState(post.unlockPricePoints || 1); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const save = async () => { setBusy(true); setErr(''); try { const body = { content }; if (post.access === 'EXCLUSIVE' && creator) body.unlockPricePoints = Number(price); await api(`/media/posts/${post._id}`, { method: 'PATCH', body }); toast('Post updated'); onSaved(); onClose(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return <Modal open onClose={onClose} title="Edit post"><div className="space-y-3"><textarea className="input min-h-[120px]" value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} aria-label="Caption" />
    {post.access === 'EXCLUSIVE' && creator && <label className="block text-sm">Unlock price (points)<input type="number" min={1} className="input mt-1" value={price} onChange={(e) => setPrice(e.target.value)} /><span className="text-xs text-muted">People who already unlocked it keep access.</span></label>}<Err>{err}</Err><button className="btn-primary w-full" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button></div></Modal>;
}

function PostCard({ post, onGift, onChange }) {
  const { user } = useAuth(); const { toast } = useLive(); const ask = useConfirmSpend(); const qc = useQueryClient();
  const [p, setP] = useState(post); const [menu, setMenu] = useState(false); const [comments, setComments] = useState(false); const [edit, setEdit] = useState(false); const [report, setReport] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const ref = useRef();
  useEffect(() => setP(post), [post]); // adopt refreshed data (this is what makes an unlocked post actually open up)
  const a = p.authorId; const mine = a._id === user.id; const creatorMe = user.accountMode === 'CREATOR';
  useEffect(() => { if (mine || !ref.current) return; let t; const o = new IntersectionObserver(([e]) => { clearTimeout(t); if (e.isIntersecting) t = setTimeout(() => trackView(p._id), 1000); }, { threshold: 0.6 }); o.observe(ref.current); return () => { clearTimeout(t); o.disconnect(); }; }, [p._id, mine]);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['feed'] }); qc.invalidateQueries({ queryKey: ['insights'] }); onChange?.(); };
  const reload = async () => { const d = await api(`/posts/${p._id}`); setP(d.post); qc.invalidateQueries({ queryKey: ['feed'] }); };

  const like = async () => { const was = p.liked; setP((x) => ({ ...x, liked: !was, likeCount: x.likeCount + (was ? -1 : 1) })); try { const d = await api(`/posts/${p._id}/like`, { method: 'POST' }); setP((x) => ({ ...x, liked: d.liked, likeCount: d.likeCount })); } catch { setP(post); } };
  const follow = async () => { const d = await api(`/follow/${a._id}`, { method: 'POST' }); setP({ ...p, following: d.following }); qc.invalidateQueries({ queryKey: ['suggestions'] }); };
  const unlock = async () => {
    if (!(await ask({ title: 'Unlock this post?', detail: `Unlock ${a.displayName || a.username}'s exclusive post.`, points: p.unlockPricePoints, confirmLabel: 'Unlock' }))) return;
    setBusy(true); setErr('');
    try { await api(`/media/posts/${p._id}/unlock`, { method: 'POST' }); window.dispatchEvent(new Event('wallet:changed')); await reload(); toast('Unlocked! Enjoy.'); }
    catch (e) { setErr(e.code === 'INSUFFICIENT_POINTS' ? 'Not enough points. Top up in your wallet.' : e.message); } finally { setBusy(false); } };
  const subscribe = async () => {
    const price = a.subscriptionPricePoints; if (!price) return toast('Subscriptions are not available for this creator');
    if (!(await ask({ title: `Subscribe to ${a.displayName || a.username}?`, detail: 'Subscribers can see subscriber-only posts for 30 days.', points: price, confirmLabel: 'Subscribe' }))) return;
    setBusy(true); setErr(''); try { await api(`/subscriptions/${a._id}`, { method: 'POST' }); window.dispatchEvent(new Event('wallet:changed')); await reload(); toast('Subscribed!'); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  const pin = async () => { setMenu(false); try { const d = await api(`/media/posts/${p._id}/pin`, { method: 'POST' }); toast(d.pinned ? 'Pinned to your profile' : 'Unpinned'); refresh(); qc.invalidateQueries({ queryKey: ['feed', 'profile'] }); } catch (e) { toast(e.message); } };
  const del = async () => { setMenu(false); if (!confirm('Delete this post? This cannot be undone.')) return; try { await api(`/media/posts/${p._id}`, { method: 'DELETE' }); toast('Post deleted'); refresh(); qc.invalidateQueries({ queryKey: ['feed', 'profile'] }); } catch (e) { toast(e.message); } };
  const block = async () => { setMenu(false); if (!confirm(`Block @${a.username}?`)) return; await api(`/block/${a._id}`, { method: 'POST' }); toast('Blocked'); refresh(); };

  return <article ref={ref} className="card !p-4 space-y-3 animate-rise">
    <header className="flex items-center gap-3">
      <Link to={`/u/${a.username}`}><Avatar user={a} /></Link>
      <div className="min-w-0 flex-1"><Link to={`/u/${a.username}`} className="font-semibold truncate flex items-center gap-1.5 flex-wrap"><span className="truncate">{a.displayName || a.username}</span>{a.accountMode === 'CREATOR' && <CreatorBadge small />}{a.creatorPlan === 'PRO' && a.accountMode === 'CREATOR' && <Badge>PRO</Badge>}</Link>
        <p className="text-muted text-xs">@{a.username} · {ago(p.createdAt)}{p.community && <> · in <Link className="underline" to={`/communities/${p.community._id}`}>{p.community.name}</Link></>}</p></div>
      {p.pinned && <span className="text-violet-light flex items-center gap-1 text-xs"><Pin size={13} />Pinned</span>}{p.sponsored && <Badge tone="pink">Sponsored</Badge>}
      {!mine && <button onClick={follow} className={`chip ${p.following ? 'border-line text-ink2' : 'border-violet text-violet-light'}`}>{p.following ? 'Following' : 'Follow'}</button>}
      <div className="relative"><button aria-label="More options" aria-expanded={menu} onClick={() => setMenu(!menu)} className="p-2 text-ink2"><MoreHorizontal size={18} /></button>
        {menu && <div className="absolute right-0 z-10 bg-card2 border border-line rounded-btn text-sm w-40 overflow-hidden animate-fade">
          {mine ? <>{p.status !== 'DRAFT' && !p.community && <button className="block w-full text-left px-3 py-2 hover:bg-line" onClick={pin}>{p.pinned ? 'Unpin from profile' : 'Pin to profile'}</button>}<button className="block w-full text-left px-3 py-2 hover:bg-line" onClick={() => { setMenu(false); setEdit(true); }}>Edit</button><button className="block w-full text-left px-3 py-2 hover:bg-line text-bad" onClick={del}>Delete</button></>
            : <><button className="block w-full text-left px-3 py-2 hover:bg-line" onClick={() => { setMenu(false); setReport(true); }}>Report</button><button className="block w-full text-left px-3 py-2 hover:bg-line text-bad" onClick={block}>Block user</button></>}</div>}</div>
    </header>
    <PostMedia post={p} />
    {p.locked ? <div className="relative rounded-card overflow-hidden bg-gradient-to-br from-violet/40 to-pink/30 p-8 grid place-items-center text-center min-h-[160px] bg-cover bg-center" style={p.coverUrl ? { backgroundImage: `url(${p.coverUrl})` } : undefined}>
        <div className="absolute inset-0 backdrop-blur-xl bg-bg/40" />
        <div className="relative space-y-2"><Lock className="mx-auto" /><p className="font-semibold">{p.access === 'EXCLUSIVE' ? 'Exclusive content' : 'Subscribers only'}</p>
          {p.access === 'EXCLUSIVE' ? <button className="btn-primary" disabled={busy} onClick={unlock}>{busy ? 'Unlocking…' : `Unlock · ${p.unlockPricePoints} pts`}</button> : <button className="btn-primary" disabled={busy} onClick={subscribe}>{busy ? 'Please wait…' : `Subscribe${a.subscriptionPricePoints ? ` · ${a.subscriptionPricePoints} pts` : ''}`}</button>}</div></div>
      : <div className="space-y-2 animate-fade">{p.content && <p className="whitespace-pre-wrap break-words">{p.content.split(/(#[\p{L}\p{N}_]{2,30})/gu).map((t, i) => t.startsWith('#') ? <Link key={i} to={`/topic/${t.slice(1).toLowerCase()}`} className="text-violet-light">{t}</Link> : t)}</p>}{p.exclusiveText && <p className="bg-card2 rounded-btn p-3 text-sm">{p.exclusiveText}</p>}</div>}
    <Err>{err}</Err>
    <footer className="flex items-center gap-5 text-ink2 text-sm">
      <LikeButton liked={p.liked} count={p.likeCount} onClick={like} />
      <button onClick={() => setComments(true)} className="flex items-center gap-1" aria-label="Open comments"><MessageCircle size={18} />{p.commentCount}</button>
      {mine && p.viewCount !== undefined && <span className="flex items-center gap-1 text-xs"><Eye size={16} />{p.viewCount}</span>}
      {!mine && a.accountMode === 'CREATOR' && <button onClick={() => onGift({ ...a, id: a._id })} className="flex items-center gap-1 ml-auto text-pink" aria-label="Send gift"><Gift size={18} />Gift</button>}
    </footer>
    {comments && <CommentsModal postId={p._id} open onClose={() => setComments(false)} onCountChange={(d) => setP((x) => ({ ...x, commentCount: Math.max(0, x.commentCount + d) }))} />}
    {edit && <EditModal post={p} creator={creatorMe} onClose={() => setEdit(false)} onSaved={() => { reload(); refresh(); }} />}{report && <ReportModal post={p} onClose={() => setReport(false)} />}
  </article>;
}
export default memo(PostCard);
