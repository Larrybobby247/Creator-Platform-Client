import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, CornerDownRight, Trash2, Send } from 'lucide-react';
import { Modal, Avatar, CreatorBadge, Empty, ErrorState } from './ui.jsx';
import { api, ago } from '../lib/api';
import { get } from '../lib/query.js';
import { useAuth } from '../context/Auth.jsx';
import { useLive } from '../context/Live.jsx';

function CommentRow({ c, postId, onReply, onDeleted, isReply }) {
  const { toast } = useLive(); const [liked, setLiked] = useState(c.liked); const [n, setN] = useState(c.likeCount); const [pop, setPop] = useState(0); const [open, setOpen] = useState(false);
  useEffect(() => { setLiked(c.liked); setN(c.likeCount); }, [c.liked, c.likeCount]);
  const replies = useQuery({ queryKey: ['comments', postId, 'replies', c._id], queryFn: get(`/posts/${postId}/comments?parent=${c._id}`), enabled: open && !isReply, staleTime: 10_000 });
  const like = async () => { const was = liked; setLiked(!was); setN((x) => x + (was ? -1 : 1)); if (!was) setPop(Date.now());
    try { const d = await api(`/comments/${c._id}/like`, { method: 'POST' }); setLiked(d.liked); setN(d.likeCount); } catch { setLiked(was); setN(c.likeCount); toast('Could not update like'); } };
  const del = async () => { if (!confirm('Delete this comment?')) return; try { await api(`/comments/${c._id}`, { method: 'DELETE' }); onDeleted(c); } catch (e) { toast(e.message); } };
  return <div className="space-y-2 animate-rise">
    <div className="flex gap-3"><Link to={`/u/${c.user?.username}`}><Avatar user={c.user} size={isReply ? 28 : 36} /></Link>
      <div className="min-w-0 flex-1"><div className="bg-card2 rounded-card px-3 py-2"><p className="text-sm flex items-center gap-2 flex-wrap"><Link to={`/u/${c.user?.username}`} className="font-semibold">{c.user?.displayName || c.user?.username}</Link>{c.user?.accountMode === 'CREATOR' && <CreatorBadge small />}<span className="text-[11px] text-muted">{ago(c.createdAt)}</span></p>
        {c.deleted ? <p className="text-sm italic text-muted">This comment was deleted</p> : <p className="text-sm break-words whitespace-pre-wrap">{c.text}</p>}</div>
        {!c.deleted && <div className="flex gap-4 text-xs text-ink2 mt-1 px-2 items-center">
          <button onClick={like} className={`relative flex items-center gap-1 ${liked ? 'text-pink' : ''}`} aria-pressed={liked} aria-label="Like comment"><span key={liked ? 'on' : 'off'} className={liked ? 'inline-block animate-heart' : 'inline-block'}><Heart size={14} fill={liked ? 'currentColor' : 'none'} /></span>{n > 0 && n}{pop > 0 && <span key={pop} className="absolute left-2 top-2">{[[-14, -12], [14, -12], [0, -18], [-10, 10], [10, 10]].map(([x, y], i) => <i key={i} className="burst-dot animate-burst" style={{ '--x': `${x}px`, '--y': `${y}px` }} />)}</span>}</button>
          <button onClick={() => onReply({ rootId: c.parentId || c._id, username: c.user?.username })} className="hover:text-ink">Reply</button>
          {c.canDelete && <button onClick={del} className="hover:text-bad flex items-center gap-1" aria-label="Delete comment"><Trash2 size={13} /></button>}</div>}
        {!isReply && c.replyCount > 0 && <button onClick={() => setOpen(!open)} className="text-xs text-violet-light mt-1 px-2 flex items-center gap-1"><CornerDownRight size={12} />{open ? 'Hide replies' : `View ${c.replyCount} repl${c.replyCount === 1 ? 'y' : 'ies'}`}</button>}</div></div>
    {open && !isReply && <div className="ml-10 space-y-2">{replies.isPending ? <div className="h-10 rounded-card bg-card2 animate-pulse" /> : replies.isError ? <ErrorState compact error={replies.error} onRetry={() => replies.refetch()} /> : replies.data.comments.map((r) => <CommentRow key={r._id} c={r} postId={postId} isReply onReply={onReply} onDeleted={onDeleted} />)}</div>}</div>;
}

export default function CommentsModal({ postId, open, onClose, onCountChange }) {
  const { user } = useAuth(); const qc = useQueryClient(); const { toast } = useLive(); const input = useRef();
  const [text, setText] = useState(''); const [replyTo, setReplyTo] = useState(null); const [busy, setBusy] = useState(false);
  const q = useInfiniteQuery({ queryKey: ['comments', postId], enabled: open, initialPageParam: '', queryFn: ({ pageParam, signal }) => api(`/posts/${postId}/comments${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''}`, { signal }), getNextPageParam: (l) => l.nextCursor || undefined, staleTime: 10_000 });
  useEffect(() => { if (!open) { setText(''); setReplyTo(null); } }, [open]);
  const submit = async (e) => { e.preventDefault(); const t = text.trim(); if (!t || busy) return; setBusy(true);
    try { await api(`/posts/${postId}/comments`, { method: 'POST', body: { text: t, parentId: replyTo?.rootId } }); setText(''); onCountChange?.(1);
      await qc.invalidateQueries({ queryKey: ['comments', postId] }); setReplyTo(null); }
    catch (x) { toast(x.message); } finally { setBusy(false); } };
  const onDeleted = () => { onCountChange?.(-1); qc.invalidateQueries({ queryKey: ['comments', postId] }); };
  const list = q.data?.pages.flatMap((p) => p.comments) || [];
  return <Modal open={open} onClose={onClose} title="Comments">
    <div className="flex flex-col" style={{ minHeight: '55vh' }}>
      <div className="flex-1 space-y-4 overflow-y-auto pb-3">
        {q.isPending ? [1, 2, 3].map((i) => <div key={i} className="h-14 rounded-card bg-card2 animate-pulse" />) : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : list.length === 0 ? <Empty>No comments yet. Start the conversation!</Empty> :
          <>{list.map((c) => <CommentRow key={c._id} c={c} postId={postId} onReply={(r) => { setReplyTo(r); input.current?.focus(); }} onDeleted={onDeleted} />)}{q.hasNextPage && <button className="btn-ghost w-full !py-2" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>{q.isFetchingNextPage ? 'Loading…' : 'Load more comments'}</button>}</>}</div>
      <form onSubmit={submit} className="sticky bottom-0 bg-card pt-2 border-t border-divider space-y-1">
        {replyTo && <p className="text-xs text-ink2 flex justify-between animate-rise">Replying to @{replyTo.username}<button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">×</button></p>}
        <div className="flex gap-2 items-center"><Avatar user={user} size={32} /><input ref={input} className="input" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder={replyTo ? 'Write a reply…' : 'Add a comment…'} aria-label="Comment" /><button className="btn-primary !px-3" disabled={!text.trim() || busy} aria-label="Post comment"><Send size={16} /></button></div></form>
    </div></Modal>;
}
