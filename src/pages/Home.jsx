import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import PostCard from '../components/PostCard.jsx';
import GiftModal from '../components/GiftModal.jsx';
import SuggestedRow from '../components/Suggested.jsx';
import { StoryBar } from '../components/Stories.jsx';
import { Empty, Skeleton, ErrorState } from '../components/ui.jsx';
import { api } from '../lib/api';
import { get, keys } from '../lib/query.js';

const TABS = [['forYou', 'For You'], ['following', 'Following'], ['latest', 'Latest'], ['communities', 'Communities']];
export default function Home() {
  const qc = useQueryClient(); const [tab, setTab] = useState('forYou'); const [gift, setGift] = useState(null); const tabsRef = useRef();
  const feed = useInfiniteQuery({ queryKey: keys.feed(tab), initialPageParam: '', queryFn: ({ pageParam, signal }) => api(`/feed?tab=${tab}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`, { signal }), getNextPageParam: (l) => l.nextCursor || undefined, staleTime: 30_000 });
  const trending = useQuery({ queryKey: ['trending'], queryFn: get('/trending'), staleTime: 5 * 60_000, enabled: tab === 'communities' });
  const refetch = useCallback(() => qc.invalidateQueries({ queryKey: ['feed'] }), [qc]);
  const sentinel = useRef(); const [atEnd, setAtEnd] = useState(false); const [refreshing, setRefreshing] = useState(false);
  useEffect(() => { const el = sentinel.current; if (!el) return; const o = new IntersectionObserver(([e]) => e.isIntersecting && feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage(), { rootMargin: '500px' }); o.observe(el); return () => o.disconnect(); }, [feed.hasNextPage, feed.isFetchingNextPage, feed.fetchNextPage]);
  // Once the reader has scrolled to the very end, a pill appears at the top to pull in the newest posts.
  useEffect(() => { const el = sentinel.current; if (!el) return; const o = new IntersectionObserver(([e]) => e.isIntersecting && !feed.hasNextPage && feed.data && setAtEnd(true)); o.observe(el); return () => o.disconnect(); }, [feed.hasNextPage, feed.data]);
  useEffect(() => setAtEnd(false), [tab]);
  const refresh = async () => { setRefreshing(true); window.scrollTo({ top: 0, behavior: 'smooth' }); try { await qc.resetQueries({ queryKey: keys.feed(tab) }); qc.invalidateQueries({ queryKey: ['stories'] }); } finally { setRefreshing(false); setAtEnd(false); } };
  const choose = (k, e) => { setTab(k); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); };
  const posts = feed.data?.pages.flatMap((p) => p.posts) || [];
  const empty = tab === 'following' ? 'Follow people on Explore to fill your feed.' : tab === 'communities' ? 'Join communities to see their posts here.' : 'No posts yet.';
  return <div className="space-y-4">
    {atEnd && <div className="fixed top-16 inset-x-0 z-30 flex justify-center pointer-events-none lg:pl-60"><button onClick={refresh} disabled={refreshing} className="pointer-events-auto btn-primary !py-2 !px-4 text-sm shadow-lg animate-[slide_.25s_ease-out]"><ArrowUp size={16} className={refreshing ? 'animate-bounce' : ''} />{refreshing ? 'Refreshing…' : 'Refresh for recent posts'}</button></div>}
    <StoryBar />
    <div ref={tabsRef} className="flex border-b border-divider overflow-x-auto no-scrollbar snap-x" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={(e) => choose(k, e)} className={`shrink-0 snap-center px-5 py-3 text-sm font-medium border-b-2 ${tab === k ? 'border-violet text-ink' : 'border-transparent text-ink2 hover:text-ink'}`}>{l}</button>)}</div>
    <div key={tab} className="space-y-4 animate-tab">
      {feed.isPending ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />) : feed.isError ? <ErrorState error={feed.error} onRetry={() => feed.refetch()} /> : posts.length === 0 ? <>
          <Empty>{empty}</Empty>{tab === 'communities' && trending.data?.communities.length > 0 && <div className="space-y-2"><h3 className="font-semibold text-sm">Popular communities</h3>{trending.data.communities.slice(0, 4).map((c) => <Link key={c._id} to={`/communities/${c._id}`} className="card !p-3 flex justify-between text-sm"><span><b>{c.name}</b><span className="block text-xs text-muted">{c.memberCount} members</span></span><span className="text-violet-light self-center">View</span></Link>)}</div>}</> :
        <>{posts.map((p, i) => <div key={p._id} className="space-y-4"><PostCard post={p} onGift={setGift} onChange={refetch} />{(i === 3 || i === 12) && <SuggestedRow />}</div>)}
          <div ref={sentinel} className="h-8 grid place-items-center text-xs text-muted">{feed.isFetchingNextPage ? 'Loading more…' : feed.hasNextPage ? <button className="btn-ghost !py-2" onClick={() => feed.fetchNextPage()}>Load more</button> : 'You are all caught up'}</div></>}
    </div>
    <GiftModal creator={gift} onClose={() => setGift(null)} />
  </div>;
}
