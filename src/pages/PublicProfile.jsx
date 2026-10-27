import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Share2 } from 'lucide-react';
import { PublicPage } from '../components/PublicShell.jsx';
import PublicPostCard from '../components/PublicPostCard.jsx';
import { Avatar, Badge, CreatorBadge, Empty, ErrorState, Skeleton } from '../components/ui.jsx';
import { api } from '../lib/api';
import { get } from '../lib/query.js';
import { loginUrl } from '../lib/next.js';

// What a visitor without an account sees at /u/username. Looking is free; every action sends them to log in.
export default function PublicProfile() {
  const { username } = useParams(); const nav = useNavigate(); const [copied, setCopied] = useState(false); const here = `/u/${username}`; const login = () => nav(loginUrl(here));
  const prof = useQuery({ queryKey: ['public-profile', username], queryFn: get(`/public/profile/${username}`), staleTime: 60_000, retry: false });
  const posts = useInfiniteQuery({ queryKey: ['public-posts', username], enabled: prof.isSuccess, initialPageParam: '', queryFn: ({ pageParam }) => api(`/public/profile/${username}/posts${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''}`), getNextPageParam: (l) => l.nextCursor || undefined });
  const share = async () => { const url = location.href; try { if (navigator.share) await navigator.share({ title: prof.data?.creator.displayName || username, url }); else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } } catch { /* cancelled */ } };
  const d = prof.data; const c = d?.creator; const isCreator = c?.accountMode === 'CREATOR'; const list = posts.data?.pages.flatMap((p) => p.posts) || [];
  return <PublicPage><div className="max-w-3xl mx-auto p-4 space-y-4">
    {prof.isPending ? <Skeleton className="h-72" /> : prof.isError ? (prof.error.status === 404 ? <div className="card text-center space-y-3 py-10"><p className="text-xl font-bold">Profile not found</p><p className="text-ink2 text-sm">This account does not exist or is not available.</p><Link to="/" className="btn-primary">Go home</Link></div> : <ErrorState error={prof.error} onRetry={() => prof.refetch()} />) : <>
      <div className="card !p-0 overflow-hidden">{c.coverUrl ? <img src={c.coverUrl} alt="" className="h-28 w-full object-cover" /> : <div className="h-28 bg-gradient-to-r from-violet/50 to-pink/40" />}
        <div className="p-4 -mt-10 space-y-3"><Avatar user={c} size={80} />
          <div><h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">{c.displayName || c.username}{isCreator && <CreatorBadge />}{isCreator && c.creatorPlan === 'PRO' && <Badge>PRO</Badge>}</h1><p className="text-muted text-sm flex items-center gap-2">@{c.username}{c.location && ` · ${c.location}`}{c.online && <span className="inline-flex items-center gap-1 text-ok text-xs"><i className="w-2 h-2 rounded-full bg-ok" />Online</span>}</p></div>
          {c.bio && <p className="text-ink2 text-sm whitespace-pre-wrap">{c.bio}</p>}
          <p className="text-sm text-ink2 flex flex-wrap gap-x-4 gap-y-1"><span><b className="text-ink">{d.followers}</b> followers</span><span><b className="text-ink">{d.following}</b> following</span>{isCreator && d.subscribers > 0 && <span><b className="text-ink">{d.subscribers}</b> subscriber{d.subscribers === 1 ? '' : 's'}</span>}{d.rating && <span><span className="text-warn">★</span> <b className="text-ink">{d.rating.avg}</b> ({d.rating.count})</span>}</p>
          <div className="flex flex-wrap gap-2"><button className="btn-primary" onClick={login}>Follow</button><button className="btn-ghost" onClick={login}>Message</button>
            {isCreator && c.services?.tipsGifts?.enabled !== false && <button className="btn-ghost text-pink" onClick={login}>🎁 Gift</button>}{isCreator && c.subscriptionPricePoints > 0 && <button className="btn-ghost" onClick={login}>Subscribe · {c.subscriptionPricePoints} pts</button>}
            <button className="btn-ghost" onClick={share} aria-label="Share profile"><Share2 size={16} />{copied ? 'Copied!' : ''}</button></div>
          <p className="text-xs text-muted">New here? <Link to={`/signup?next=${encodeURIComponent(here)}`} className="text-violet-light underline">Create a free account</Link> or <Link to={loginUrl(here)} className="text-violet-light underline">log in</Link> to follow and interact.</p></div></div>
      {list.length === 0 && !posts.isPending ? <Empty>No public posts yet.</Empty> : list.map((p) => <PublicPostCard key={p._id} post={p} backTo={here} />)}
      {posts.isPending && <Skeleton className="h-40" />}
      {posts.hasNextPage && <button className="btn-ghost w-full" disabled={posts.isFetchingNextPage} onClick={() => posts.fetchNextPage()}>{posts.isFetchingNextPage ? 'Loading…' : 'Show more'}</button>}
    </>}</div></PublicPage>;
}
