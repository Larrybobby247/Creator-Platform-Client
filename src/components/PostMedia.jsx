import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/query.js';
// The signed URL is requested only when the post is close to the screen (not for all 20 posts at once) and cached for 4 minutes (URLs live 5).
export default function PostMedia({ post }) {
  const ref = useRef(); const [near, setNear] = useState(false);
  const want = post.locked ? post.hasPreview : post.mediaType;
  useEffect(() => { if (!want) return; const o = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), o.disconnect()), { rootMargin: '600px' }); o.observe(ref.current); return () => o.disconnect(); }, [want]);
  const q = useQuery({ queryKey: ['media', post._id, post.locked], queryFn: get(`/media/posts/${post._id}/${post.locked ? 'preview' : 'playback'}`), enabled: !!want && near, staleTime: 4 * 60_000, retry: false });
  if (!want) return null;
  const video = post.locked || post.mediaType === 'VIDEO';
  return <div ref={ref} className="relative min-h-[12rem]">
    {q.data?.url ? (video ? <video src={q.data.url} controls playsInline preload="none" className="w-full max-h-[70vh] rounded-card bg-black" /> : <img src={q.data.url} alt="" loading="lazy" decoding="async" className="w-full max-h-[70vh] object-contain rounded-card bg-black" />)
      : q.isError ? null : <div className="h-48 rounded-card bg-card2 animate-pulse" />}
    {post.locked && q.data?.url && <span className="absolute top-2 left-2 text-[11px] bg-bg/80 rounded-full px-2 py-1">Preview</span>}</div>;
}
