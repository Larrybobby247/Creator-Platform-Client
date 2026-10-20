import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, Avatar, CreatorBadge, Empty, ErrorState } from './ui.jsx';
import { api } from '../lib/api';
// Your own followers / following. Unfollow here, or follow people back.
export default function PeopleModal({ kind, open, onClose }) {
  const qc = useQueryClient(); const [state, setState] = useState({});
  const q = useInfiniteQuery({ queryKey: ['people', kind], enabled: open, initialPageParam: 0, queryFn: ({ pageParam, signal }) => api(`/me/${kind}?page=${pageParam}`, { signal }), getNextPageParam: (l, all) => (l.hasMore ? all.length : undefined), staleTime: 0 });
  const users = q.data?.pages.flatMap((p) => p.users) || [];
  const toggle = async (u) => { const cur = state[u._id] ?? u.following; setState((s) => ({ ...s, [u._id]: !cur })); try { const d = await api(`/follow/${u._id}`, { method: 'POST' }); setState((s) => ({ ...s, [u._id]: d.following })); qc.invalidateQueries({ queryKey: ['profile'] }); qc.invalidateQueries({ queryKey: ['feed'] }); qc.invalidateQueries({ queryKey: ['suggestions'] }); } catch { setState((s) => ({ ...s, [u._id]: cur })); } };
  return <Modal open={open} onClose={onClose} title={kind === 'followers' ? 'Followers' : 'Following'}>
    {q.isPending ? <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-card bg-card2 animate-pulse" />)}</div> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : users.length === 0 ? <Empty>{kind === 'followers' ? 'No followers yet.' : 'You are not following anyone yet.'}</Empty> :
      <div className="space-y-2">{users.map((u) => { const on = state[u._id] ?? u.following; return <div key={u._id} className="flex items-center gap-3 animate-rise"><Link to={`/u/${u.username}`} onClick={onClose}><Avatar user={u} size={40} /></Link><Link to={`/u/${u.username}`} onClick={onClose} className="min-w-0 flex-1"><b className="text-sm flex items-center gap-1.5 truncate">{u.displayName || u.username}{u.accountMode === 'CREATOR' && <CreatorBadge small />}</b><span className="text-xs text-muted">@{u.username}</span></Link>
        <button onClick={() => toggle(u)} className={`chip ${on ? 'border-line text-ink2' : 'border-violet text-violet-light'}`}>{on ? (kind === 'following' ? 'Unfollow' : 'Following') : kind === 'followers' ? 'Follow back' : 'Follow'}</button></div>; })}
        {q.hasNextPage && <button className="btn-ghost w-full !py-2" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>{q.isFetchingNextPage ? 'Loading…' : 'Load more'}</button>}</div>}</Modal>;
}
