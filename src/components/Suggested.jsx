import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, CreatorBadge } from './ui.jsx';
import { api } from '../lib/api';
import { get } from '../lib/query.js';

// Keeps every cached list (suggestions, popular creators, search, explore) in step after a follow/unfollow, so a person never shows "Follow" again after you followed them, and the follower count moves by one.
export function patchFollow(qc, id, following) {
  const fix = (u) => (u && u._id === id && !!u.following !== following ? { ...u, following, followers: Math.max(0, (u.followers ?? 0) + (following ? 1 : -1)) } : u);
  const map = (d) => { if (!d || typeof d !== 'object') return d; const o = { ...d }; for (const k of ['users', 'people', 'creators', 'items']) if (Array.isArray(d[k])) o[k] = d[k].map(fix); return o; };
  for (const key of ['suggestions', 'trending', 'search', 'explore']) qc.setQueriesData({ queryKey: [key] }, map);
  qc.invalidateQueries({ queryKey: ['suggestions'], refetchType: 'none' }); // next visit fetches a fresh list that leaves out people you follow
}
export function PersonCard({ u }) {
  const qc = useQueryClient(); const [busy, setBusy] = useState(false);
  const toggle = async () => { setBusy(true); try { const d = await api(`/follow/${u._id}`, { method: 'POST' }); patchFollow(qc, u._id, d.following); qc.invalidateQueries({ queryKey: ['feed'] }); } finally { setBusy(false); } };
  const following = !!u.following;
  return <div className="card !p-3 w-36 shrink-0 text-center space-y-2 animate-rise"><Link to={`/u/${u.username}`} className="block"><span className="inline-block"><Avatar user={u} size={56} /></span><p className="font-semibold text-sm truncate mt-1">{u.displayName || u.username}</p><p className="text-[11px] text-muted truncate">@{u.username}</p></Link>
    <div className="h-4">{u.accountMode === 'CREATOR' && <CreatorBadge small />}</div><p className="text-[11px] text-ink2">{u.followers ?? 0} follower{u.followers === 1 ? '' : 's'}</p>
    <button onClick={toggle} disabled={busy} className={`chip w-full ${following ? 'border-line text-ink2' : 'border-violet text-violet-light'}`}>{following ? 'Following' : 'Follow'}</button></div>;
}
// "Suggested for you": shown between posts and on Explore.
export default function SuggestedRow({ title = 'Suggested for you' }) {
  const q = useQuery({ queryKey: ['suggestions'], queryFn: get('/suggestions?limit=10'), staleTime: 5 * 60_000 });
  if (q.isError || (q.data && q.data.users.length === 0)) return null;
  return <section className="card !p-3 space-y-2" aria-label={title}><div className="flex justify-between items-center"><h3 className="font-semibold text-sm">{title}</h3><Link to="/explore" className="text-xs text-violet-light">See more</Link></div>
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">{q.isPending ? [1, 2, 3].map((i) => <div key={i} className="w-36 h-40 shrink-0 rounded-card bg-card2 animate-pulse" />) : q.data.users.map((u) => <PersonCard key={u._id} u={u} />)}</div></section>;
}
