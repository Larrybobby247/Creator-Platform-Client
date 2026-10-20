import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import PostCard from '../components/PostCard.jsx';
import GiftModal from '../components/GiftModal.jsx';
import { Empty, Skeleton, ErrorState } from '../components/ui.jsx';
import { api } from '../lib/api';
export default function Topic() {
  const { tag } = useParams(); const qc = useQueryClient(); const [gift, setGift] = useState(null); const sentinel = useRef();
  const feed = useInfiniteQuery({ queryKey: ['feed', 'topic', tag], initialPageParam: '', queryFn: ({ pageParam, signal }) => api(`/feed?tag=${encodeURIComponent(tag)}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`, { signal }), getNextPageParam: (l) => l.nextCursor || undefined, staleTime: 30_000 });
  const refetch = useCallback(() => qc.invalidateQueries({ queryKey: ['feed'] }), [qc]);
  useEffect(() => { const el = sentinel.current; if (!el) return; const o = new IntersectionObserver(([e]) => e.isIntersecting && feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage(), { rootMargin: '500px' }); o.observe(el); return () => o.disconnect(); }, [feed.hasNextPage, feed.isFetchingNextPage]);
  const posts = feed.data?.pages.flatMap((p) => p.posts) || [];
  return <div className="space-y-4"><div><Link to="/explore" className="text-sm text-violet-light">← Explore</Link><h1 className="text-3xl font-bold">#{tag}</h1></div>
    {feed.isPending ? [1, 2].map((i) => <Skeleton key={i} className="h-44" />) : feed.isError ? <ErrorState error={feed.error} onRetry={() => feed.refetch()} /> : posts.length === 0 ? <Empty>No public posts with #{tag} yet.</Empty> : <>{posts.map((p) => <PostCard key={p._id} post={p} onGift={setGift} onChange={refetch} />)}<div ref={sentinel} className="h-8 grid place-items-center text-xs text-muted">{feed.isFetchingNextPage ? 'Loading more…' : feed.hasNextPage ? '' : 'End of results'}</div></>}
    <GiftModal creator={gift} onClose={() => setGift(null)} /></div>;
}
