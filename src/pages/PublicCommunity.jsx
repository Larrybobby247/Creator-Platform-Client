import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Share2, Users } from 'lucide-react';
import { PublicPage } from '../components/PublicShell.jsx';
import { Avatar, ErrorState, Skeleton } from '../components/ui.jsx';
import { get } from '../lib/query.js';
import { loginUrl } from '../lib/next.js';

// What a visitor without an account sees at /communities/:id (public communities only). Joining needs an account.
export default function PublicCommunity() {
  const { id } = useParams(); const nav = useNavigate(); const [copied, setCopied] = useState(false); const here = `/communities/${id}`; const login = () => nav(loginUrl(here));
  const q = useQuery({ queryKey: ['public-community', id], queryFn: get(`/public/community/${id}`), staleTime: 60_000, retry: false });
  const share = async () => { try { if (navigator.share) await navigator.share({ title: q.data?.community.name, url: location.href }); else { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } } catch { /* cancelled */ } };
  const c = q.data?.community;
  return <PublicPage><div className="max-w-3xl mx-auto p-4 space-y-4">
    {q.isPending ? <Skeleton className="h-60" /> : q.isError ? (q.error.status === 404 || q.error.status === 400 ? <div className="card text-center space-y-3 py-10"><p className="text-xl font-bold">Community not found</p><p className="text-ink2 text-sm">It may be private or no longer available. If you were invited, log in to open it.</p><div className="flex gap-2 justify-center"><Link to={loginUrl(here)} className="btn-primary">Log in</Link><Link to="/" className="btn-ghost">Go home</Link></div></div> : <ErrorState error={q.error} onRetry={() => q.refetch()} />) : <>
      <div className="card space-y-3"><h1 className="text-2xl font-bold">{c.name}</h1>
        <p className="text-sm text-ink2 flex items-center gap-2"><Users size={15} />{c.memberCount} member{c.memberCount === 1 ? '' : 's'}{c.accessFeePoints > 0 && <span> · Entry {c.accessFeePoints} pts</span>}</p>
        {c.description && <p className="text-ink2 text-sm whitespace-pre-wrap">{c.description}</p>}
        {c.ownerId && <Link to={`/u/${c.ownerId.username}`} className="flex items-center gap-2 text-sm"><Avatar user={c.ownerId} size={28} /><span>Created by <b>{c.ownerId.displayName || c.ownerId.username}</b></span></Link>}
        <div className="flex flex-wrap gap-2"><button className="btn-primary" onClick={login}>{c.accessFeePoints > 0 ? `Join · ${c.accessFeePoints} pts` : 'Join'}</button><button className="btn-ghost" onClick={share} aria-label="Share community"><Share2 size={16} />{copied ? 'Copied!' : 'Share'}</button></div>
        <p className="text-xs text-muted">Log in or <Link to={`/signup?next=${encodeURIComponent(here)}`} className="text-violet-light underline">create a free account</Link> to join and see what members post.</p></div>
      {c.rules && <div className="card space-y-1"><p className="font-semibold text-sm">Rules</p><p className="text-sm text-ink2 whitespace-pre-wrap">{c.rules}</p></div>}
      {q.data.members.length > 0 && <div className="card space-y-2"><p className="font-semibold text-sm">Members</p><div className="flex flex-wrap gap-2">{q.data.members.map((m) => <Link key={m._id} to={`/u/${m.username}`} title={m.displayName || m.username}><Avatar user={m} size={36} /></Link>)}</div></div>}
    </>}</div></PublicPage>;
}
