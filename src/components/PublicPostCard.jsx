import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Lock } from 'lucide-react';
import { Avatar, Badge, CreatorBadge } from './ui.jsx';
import PostMedia from './PostMedia.jsx';
import RichText from './RichText.jsx';
import { ago } from '../lib/api';
import { loginUrl } from '../lib/next.js';
// Read-only post for visitors who are not logged in. Anything that needs an account (like, comment, unlock, subscribe) sends them to the login page and brings them back here afterwards.
export default function PublicPostCard({ post: p, backTo }) {
  const nav = useNavigate(); const a = p.authorId || {}; const login = () => nav(loginUrl(backTo));
  return <article className="card space-y-3 animate-rise">
    <div className="flex items-center gap-3"><Link to={`/u/${a.username}`}><Avatar user={a} /></Link><div className="min-w-0 flex-1"><Link to={`/u/${a.username}`} className="font-semibold flex items-center gap-1.5 truncate">{a.displayName || a.username}{a.accountMode === 'CREATOR' && <CreatorBadge small />}{a.creatorPlan === 'PRO' && a.accountMode === 'CREATOR' && <Badge>PRO</Badge>}</Link><p className="text-xs text-muted">@{a.username} · {ago(p.createdAt)}</p></div></div>
    {p.content && <RichText text={p.content} />}
    <PostMedia post={p} publicMode onLocked={login} />
    {(p.items || []).some((i) => i.locked) && <button onClick={login} className="btn-ghost w-full !py-2 text-sm"><Lock size={14} />Log in to unlock exclusive content</button>}
    <div className="flex gap-5 text-ink2 text-sm pt-1"><button onClick={login} className="flex items-center gap-1.5" aria-label="Log in to like"><Heart size={18} />{p.likeCount}</button><button onClick={login} className="flex items-center gap-1.5" aria-label="Log in to comment"><MessageCircle size={18} />{p.commentCount}</button></div>
  </article>;
}
