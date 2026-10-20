import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Avatar, CreatorBadge } from './ui.jsx';
import { api } from '../lib/api';
import { get } from '../lib/query.js';

export function PersonCard({ u }) {
  const [following, setFollowing] = useState(!!u.following); const [busy, setBusy] = useState(false);
  const toggle = async () => { setBusy(true); try { const d = await api(`/follow/${u._id}`, { method: 'POST' }); setFollowing(d.following); } finally { setBusy(false); } };
  return <div className="card !p-3 w-36 shrink-0 text-center space-y-2 animate-rise"><Link to={`/u/${u.username}`} className="block"><span className="inline-block"><Avatar user={u} size={56} /></span><p className="font-semibold text-sm truncate mt-1">{u.displayName || u.username}</p><p className="text-[11px] text-muted truncate">@{u.username}</p></Link>
    <div className="h-4">{u.accountMode === 'CREATOR' && <CreatorBadge small />}</div><p className="text-[11px] text-ink2">{u.followers ?? 0} followers</p>
    <button onClick={toggle} disabled={busy} className={`chip w-full ${following ? 'border-line text-ink2' : 'border-violet text-violet-light'}`}>{following ? 'Following' : 'Follow'}</button></div>;
}
// "Suggested for you": shown between posts and on Explore.
export default function SuggestedRow({ title = 'Suggested for you' }) {
  const q = useQuery({ queryKey: ['suggestions'], queryFn: get('/suggestions?limit=10'), staleTime: 5 * 60_000 });
  if (q.isError || (q.data && q.data.users.length === 0)) return null;
  return <section className="card !p-3 space-y-2" aria-label={title}><div className="flex justify-between items-center"><h3 className="font-semibold text-sm">{title}</h3><Link to="/explore" className="text-xs text-violet-light">See more</Link></div>
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">{q.isPending ? [1, 2, 3].map((i) => <div key={i} className="w-36 h-40 shrink-0 rounded-card bg-card2 animate-pulse" />) : q.data.users.map((u) => <PersonCard key={u._id} u={u} />)}</div></section>;
}
