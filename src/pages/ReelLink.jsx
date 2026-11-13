import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PublicPage } from '../components/PublicShell.jsx';
import PublicPostCard from '../components/PublicPostCard.jsx';
import { Skeleton } from '../components/ui.jsx';
import { get } from '../lib/query.js';
import { useAuth } from '../context/Auth.jsx';

// /reel/:id is the link people get when they share a video. Logged-in people go straight to that video in Explore;
// visitors see the video on a public page (free videos only) with a prompt to join.
export default function ReelLink() {
  const { id } = useParams(); const { user } = useAuth();
  const q = useQuery({ queryKey: ['public-post', id], queryFn: get(`/public/posts/${id}`), enabled: !user, retry: false, staleTime: 60_000 });
  if (user) return <Navigate to={`/explore?reel=${encodeURIComponent(id)}`} replace />;
  return <PublicPage><div className="max-w-xl mx-auto p-4 space-y-4">
    {q.isPending ? <Skeleton className="h-96" /> : q.isError ? <div className="card text-center space-y-3 py-10"><p className="text-xl font-bold">Video not available</p><p className="text-ink2 text-sm">It may have been removed, or it is only for members.</p><Link to={`/login?next=${encodeURIComponent(`/reel/${id}`)}`} className="btn-primary">Log in to look</Link></div>
      : <><PublicPostCard post={q.data.post} backTo={`/reel/${id}`} />
        <div className="card text-center space-y-2 bg-gradient-to-br from-violet/15 to-pink/10"><p className="font-semibold">Like what you see?</p><p className="text-sm text-ink2">Create a free account to like, comment and follow @{q.data.post.authorId?.username}.</p><Link to={`/signup?next=${encodeURIComponent(`/reel/${id}`)}`} className="btn-primary">Join free</Link></div></>}
  </div></PublicPage>;
}
