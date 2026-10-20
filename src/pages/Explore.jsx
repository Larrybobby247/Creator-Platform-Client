import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Hash, Users, Search } from 'lucide-react';
import { Avatar, Badge, CreatorBadge, Empty, Skeleton, ErrorState } from '../components/ui.jsx';
import SuggestedRow, { PersonCard } from '../components/Suggested.jsx';
import { api } from '../lib/api';
import { get, keys } from '../lib/query.js';
const CATS = ['Music', 'Comedy', 'Fashion', 'Fitness', 'Food', 'Tech', 'Art', 'Travel'];
function useDebounced(v, ms) { const [d, setD] = useState(v); useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]); return d; }
const Head = ({ icon: I, children, to }) => <div className="flex items-center justify-between"><h2 className="font-semibold flex items-center gap-2"><I size={16} className="text-violet-light" />{children}</h2>{to && <Link to={to} className="text-xs text-violet-light">See all</Link>}</div>;
const CommunityCard = ({ c }) => <Link to={`/communities/${c._id}`} className="card !p-3 flex items-center gap-3 animate-rise hover:border-violet"><span className="grid place-items-center w-10 h-10 rounded-full bg-gradient-to-br from-violet to-pink text-white font-bold">{c.name[0]}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{c.name}</b><span className="text-xs text-muted">{c.memberCount} members{c.accessFeePoints > 0 && ` · ${c.accessFeePoints} pts`}</span></span><span className="text-violet-light text-sm">View</span></Link>;

export default function Explore() {
  const qc = useQueryClient(); const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [page, setPage] = useState(0); const dq = useDebounced(q.trim(), 300); const searching = dq.length >= 2;
  useEffect(() => setPage(0), [cat]);
  const trending = useQuery({ queryKey: ['trending'], queryFn: get('/trending'), staleTime: 5 * 60_000 });
  const search = useQuery({ queryKey: ['search', dq], queryFn: ({ signal }) => api(`/search?q=${encodeURIComponent(dq)}`, { signal }), enabled: searching, placeholderData: keepPreviousData, staleTime: 60_000 }); // aborted when you keep typing
  const dir = useQuery({ queryKey: [...keys.explore('', cat), page], queryFn: ({ signal }) => api(`/explore?category=${cat}&page=${page}`, { signal }), placeholderData: keepPreviousData, staleTime: 60_000, enabled: !searching });
  const follow = async (c) => { await api(`/follow/${c._id}`, { method: 'POST' }); qc.invalidateQueries({ queryKey: ['explore'] }); qc.invalidateQueries({ queryKey: ['suggestions'] }); qc.invalidateQueries({ queryKey: ['feed'] }); };
  const s = search.data;
  return <div className="space-y-6"><h1 className="text-3xl font-bold">Explore</h1>
    <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className="input !pl-9" placeholder="Search people, creators, communities and topics…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></div>
    {searching ? <div className={`space-y-5 animate-tab ${search.isPlaceholderData ? 'opacity-60' : ''}`}>
      {search.isPending ? <Skeleton className="h-40" /> : search.isError ? <ErrorState error={search.error} onRetry={() => search.refetch()} /> : !s.people.length && !s.communities.length && !s.topics.length ? <Empty>No results for “{dq}”.</Empty> : <>
        {s.topics.length > 0 && <section className="space-y-2"><Head icon={Hash}>Topics</Head><div className="flex flex-wrap gap-2">{s.topics.map((t) => <Link key={t.tag} to={`/topic/${t.tag}`} className="chip border-line hover:border-violet">#{t.tag} <span className="text-muted">{t.count}</span></Link>)}</div></section>}
        {s.people.length > 0 && <section className="space-y-2"><Head icon={Users}>People</Head>{s.people.map((p) => <div key={p._id} className="card !p-3 flex items-center gap-3 animate-rise"><Link to={`/u/${p.username}`}><Avatar user={p} /></Link><Link to={`/u/${p.username}`} className="min-w-0 flex-1"><b className="flex items-center gap-1.5 text-sm truncate">{p.displayName || p.username}{p.accountMode === 'CREATOR' && <CreatorBadge small />}</b><span className="text-xs text-muted">@{p.username}</span></Link><button onClick={async () => { await api(`/follow/${p._id}`, { method: 'POST' }); search.refetch(); }} className={`chip ${p.following ? 'border-line text-ink2' : 'border-violet text-violet-light'}`}>{p.following ? 'Following' : 'Follow'}</button></div>)}</section>}
        {s.communities.length > 0 && <section className="space-y-2"><Head icon={Users}>Communities</Head>{s.communities.map((c) => <CommunityCard key={c._id} c={c} />)}</section>}</>}</div>
    : <div className="space-y-6 animate-tab">
      <section className="space-y-2"><Head icon={Hash}>Trending topics</Head>{trending.isPending ? <Skeleton className="h-10" /> : trending.data?.topics.length ? <div className="flex flex-wrap gap-2">{trending.data.topics.map((t, i) => <Link key={t.tag} to={`/topic/${t.tag}`} className="chip border-line hover:border-violet animate-rise" style={{ animationDelay: `${i * 30}ms` }}><span className="text-violet-light">#</span>{t.tag} <span className="text-muted text-xs">{t.count}</span></Link>)}</div> : <p className="text-sm text-muted">Topics appear here as people use #hashtags.</p>}</section>
      <SuggestedRow title="Suggested to follow" />
      <section className="space-y-2"><Head icon={Users} to="/communities">Popular communities</Head>{trending.isPending ? <Skeleton className="h-20" /> : trending.data?.communities.length ? trending.data.communities.slice(0, 5).map((c) => <CommunityCard key={c._id} c={c} />) : <p className="text-sm text-muted">No communities yet.</p>}</section>
      {trending.data?.creators.length > 0 && <section className="space-y-2"><Head icon={Users}>Popular creators</Head><div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">{trending.data.creators.map((u) => <PersonCard key={u._id} u={{ ...u, followers: undefined }} />)}</div></section>}
      <section className="space-y-3"><h2 className="font-semibold">Browse creators</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1"><button onClick={() => setCat('')} className={`chip ${!cat ? 'bg-violet border-violet' : 'border-line text-ink2'}`}>All</button>{CATS.map((c) => <button key={c} onClick={() => setCat(c)} className={`chip ${cat === c ? 'bg-violet border-violet' : 'border-line text-ink2'}`}>{c}</button>)}</div>
        {dir.isPending ? <div className="grid sm:grid-cols-2 gap-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48" />)}</div> : dir.isError ? <ErrorState error={dir.error} onRetry={() => dir.refetch()} /> : dir.data.creators.length === 0 ? <Empty>No creators in this category yet.</Empty> :
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 transition-opacity ${dir.isPlaceholderData ? 'opacity-60' : ''}`}>{dir.data.creators.map((c) => <div key={c._id} className="card !p-0 overflow-hidden animate-rise"><div className="h-20 bg-gradient-to-r from-violet/50 to-pink/40" />
            <div className="p-4 -mt-9 space-y-2"><Link to={`/u/${c.username}`} onClick={() => c.sponsored && api('/promotions/click', { method: 'POST', body: { targetType: 'PROFILE', targetId: c._id } })}><span className="inline-block rounded-full ring-4 ring-card"><Avatar user={c} size={56} /></span></Link>
              <div className="flex items-center gap-2 flex-wrap"><Link to={`/u/${c.username}`} className="font-semibold">{c.displayName || c.username}</Link><CreatorBadge small />{c.creatorPlan === 'PRO' && <Badge>PRO</Badge>}{c.sponsored && <Badge tone="pink">Sponsored</Badge>}</div><p className="text-ink2 text-sm line-clamp-2">{c.bio}</p>
              <div className="flex items-center justify-between text-xs text-ink2"><span>{c.followers} followers{c.rating && ` · ★ ${c.rating.avg} (${c.rating.count})`}</span><button onClick={() => follow(c)} className={`chip ${c.following ? 'border-line' : 'border-violet text-violet-light'}`}>{c.following ? 'Following' : 'Follow'}</button></div></div></div>)}</div>}
        {(page > 0 || dir.data?.hasMore) && <div className="flex justify-between"><button className="btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>← Previous</button><button className="btn-ghost" disabled={!dir.data?.hasMore} onClick={() => setPage(page + 1)}>Next →</button></div>}</section></div>}
  </div>;
}
