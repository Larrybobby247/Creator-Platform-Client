import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Share2, Pencil } from 'lucide-react';
import PostCard from '../components/PostCard.jsx';
import GiftModal from '../components/GiftModal.jsx';
import EditProfileModal from '../components/EditProfileModal.jsx';
import PeopleModal from '../components/PeopleModal.jsx';
import { ProfileStory } from '../components/Stories.jsx';
import { Badge, CreatorBadge, Modal, Empty, Err, Skeleton, ErrorState } from '../components/ui.jsx';
import { api, uid } from '../lib/api';
import { get } from '../lib/query.js';
import { useAuth } from '../context/Auth.jsx';
import { useLive } from '../context/Live.jsx';
import { useConfirmSpend } from '../components/ConfirmSpend.jsx';

const Stars = ({ n }) => <span className="text-warn" aria-label={`${n} stars`}>{'★'.repeat(n)}<span className="text-line">{'★'.repeat(5 - n)}</span></span>;
const DM_NOTE = { PAID: (c) => `Messaging this creator costs ${c.dmPolicy.pricePoints} pts (free for subscribers).`, SUBSCRIBERS: () => 'Only subscribers can message this creator.' };

function RequestModal({ creator, onClose }) {
  const { toast } = useLive(); const ask = useConfirmSpend(); const rs = creator.requestSettings || {}; const min = rs.minPricePoints || 1;
  const [d, setD] = useState(''); const [p, setP] = useState(min); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const go = async () => { if (!(await ask({ title: 'Send this request?', detail: `Points are held until ${creator.displayName || creator.username} rejects it (refund) or you confirm delivery.`, points: Number(p), confirmLabel: 'Send request' }))) return; setBusy(true); setErr('');
    try { await api('/requests', { method: 'POST', body: { creatorId: creator._id, description: d, offerPoints: Number(p) } }); toast('Request sent'); window.dispatchEvent(new Event('wallet:changed')); onClose(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return <Modal open onClose={onClose} title="Special request"><div className="space-y-3">{rs.instructions && <p className="text-sm bg-card2 rounded-btn p-3">{rs.instructions}</p>}<p className="text-xs text-muted">Minimum {min} pts · usually delivered within {rs.turnaroundDays || 7} days</p>
    <textarea className="input min-h-[100px]" placeholder="Describe what you want (min 10 characters)" value={d} onChange={(e) => setD(e.target.value)} /><label className="block text-sm">Your offer (points)<input type="number" min={min} className="input mt-1" value={p} onChange={(e) => setP(e.target.value)} /></label><Err>{err}</Err>
    <button className="btn-primary w-full" disabled={busy || d.length < 10 || Number(p) < min} onClick={go}>{busy ? 'Sending…' : `Continue · ${p} pts`}</button></div></Modal>;
}
function MeetupModal({ creator, onClose }) {
  const { toast } = useLive(); const ask = useConfirmSpend(); const m = creator.meetup; const [at, setAt] = useState(''); const [err, setErr] = useState(''); const [key] = useState(uid()); const [busy, setBusy] = useState(false); const total = (m.pricePoints || 0) + (m.transportPoints || 0);
  const go = async () => { if (!(await ask({ title: 'Confirm Innercircle payment', detail: `Innercircle fee ${m.pricePoints} pts + transport ${m.transportPoints} pts. The fee is held until the booking is completed.`, points: total, confirmLabel: 'Pay and request' }))) return; setBusy(true); setErr('');
    try { await api('/meetups', { method: 'POST', body: { creatorId: creator._id, slotAt: new Date(at).toISOString(), idempotencyKey: key } }); toast('Innercircle requested'); window.dispatchEvent(new Event('wallet:changed')); onClose(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return <Modal open onClose={onClose} title="Request Innercircle"><div className="space-y-3 text-sm"><label className="block">Date and time<input type="datetime-local" className="input mt-1" value={at} onChange={(e) => setAt(e.target.value)} /></label>
    <div className="bg-card2 rounded-btn p-3 space-y-1"><p className="flex justify-between"><span>Innercircle fee (held until completion)</span><b>{m.pricePoints} pts</b></p><p className="flex justify-between"><span>Transport fee (separate)</span><b>{m.transportPoints} pts</b></p><p className="flex justify-between border-t border-line pt-1"><span>Total</span><b>{total} pts</b></p></div>
    <p className="text-ink2">{m.durationMin} min · {m.area} · {m.noticeHours}h notice. {m.cancelRule}</p><Err>{err}</Err><button className="btn-primary w-full" disabled={!at || busy} onClick={go}>{busy ? 'Working…' : 'Continue'}</button></div></Modal>;
}

export default function Profile() {
  const { username } = useParams(); const { user, refresh, logout } = useAuth(); const nav = useNavigate(); const { toast } = useLive(); const qc = useQueryClient(); const ask = useConfirmSpend();
  const [tab, setTab] = useState('posts'); const [gift, setGift] = useState(null); const [modal, setModal] = useState(''); const [people, setPeople] = useState(null); const [editing, setEditing] = useState(false);
  const [rate, setRate] = useState({ stars: 5, text: '' }); const sentinel = useRef();
  const prof = useQuery({ queryKey: ['profile', username], queryFn: get(`/creators/${username}`), staleTime: 60_000 });
  const d = prof.data; const c = d?.creator; const own = c && c._id === user.id; const isCreator = c?.accountMode === 'CREATOR';
  useEffect(() => { setTab('posts'); }, [username]);
  const reload = useCallback(() => qc.invalidateQueries({ queryKey: ['profile', username] }), [qc, username]);
  const posts = useInfiniteQuery({ queryKey: ['feed', 'profile', c?._id, tab === 'exclusive'], enabled: !!c && (tab === 'posts' || tab === 'exclusive'), initialPageParam: '', queryFn: ({ pageParam, signal }) => api(`/feed?author=${c._id}${tab === 'exclusive' ? '&access=EXCLUSIVE' : ''}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`, { signal }), getNextPageParam: (l) => l.nextCursor || undefined, staleTime: 30_000 });
  const rev = useQuery({ queryKey: ['reviews', c?._id], queryFn: get(`/creators/${c?._id}/ratings`), enabled: !!c && isCreator && tab === 'reviews' }); const elig = useQuery({ queryKey: ['eligible', c?._id], queryFn: get(`/ratings/eligible/${c?._id}`), enabled: !!c && isCreator && tab === 'reviews' && !own });
  const gifts = useQuery({ queryKey: ['gifts', c?._id], queryFn: get(`/creators/${c?._id}/gifts`), enabled: !!c && isCreator && tab === 'gifts' });
  useEffect(() => { const el = sentinel.current; if (!el) return; const o = new IntersectionObserver(([e]) => e.isIntersecting && posts.hasNextPage && !posts.isFetchingNextPage && posts.fetchNextPage(), { rootMargin: '400px' }); o.observe(el); return () => o.disconnect(); }, [posts.hasNextPage, posts.isFetchingNextPage, tab]);

  if (prof.isPending) return <Skeleton className="h-72" />; if (prof.isError) return <ErrorState error={prof.error} onRetry={() => prof.refetch()} />;
  const follow = async () => { await api(`/follow/${c._id}`, { method: 'POST' }); reload(); qc.invalidateQueries({ queryKey: ['feed'] }); qc.invalidateQueries({ queryKey: ['suggestions'] }); qc.invalidateQueries({ queryKey: ['trending'] }); qc.invalidateQueries({ queryKey: ['search'] }); qc.invalidateQueries({ queryKey: ['explore'] }); };
  const subscribe = async () => { if (!(await ask({ title: `Subscribe to ${c.displayName || c.username}?`, detail: 'Unlock their subscriber-only posts for 30 days.', points: c.subscriptionPricePoints, confirmLabel: 'Subscribe' }))) return; try { await api(`/subscriptions/${c._id}`, { method: 'POST' }); toast('Subscribed!'); window.dispatchEvent(new Event('wallet:changed')); reload(); qc.invalidateQueries({ queryKey: ['feed'] }); } catch (e) { toast(e.message); } };
  const share = async () => { const url = `${location.origin}/u/${c.username}`; try { if (navigator.share) await navigator.share({ title: c.displayName || c.username, url }); else { await navigator.clipboard.writeText(url); toast('Profile link copied'); } } catch { /* cancelled */ } };
  const submitRate = async (id) => { try { await api(`/creators/${c._id}/ratings`, { method: 'POST', body: { qualifyingId: id, ...rate } }); toast('Thanks for your review'); qc.invalidateQueries({ queryKey: ['reviews', c._id] }); qc.invalidateQueries({ queryKey: ['eligible', c._id] }); reload(); } catch (e) { toast(e.message); } };
  const tabs = isCreator ? [['posts', 'Posts'], ['exclusive', 'Exclusive'], ['reviews', 'Reviews'], ['gifts', 'Gifts']] : [];
  const list = posts.data?.pages.flatMap((p) => p.posts) || [];
  const rs = c.requestSettings;

  return <div className="space-y-4">
    <div className="card !p-0 overflow-hidden">{c.coverUrl ? <img src={c.coverUrl} alt="" className="h-28 w-full object-cover" /> : <div className="h-28 bg-gradient-to-r from-violet/50 to-pink/40" />}
      <div className="p-4 -mt-10 space-y-3"><ProfileStory userId={c._id} person={c} own={own} />
        <div><h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">{c.displayName || c.username}{isCreator && <CreatorBadge />}{isCreator && c.creatorPlan === 'PRO' && <Badge>PRO</Badge>}</h1><p className="text-muted text-sm flex items-center gap-2">@{c.username}{c.location && ` · ${c.location}`}{c.online && !own && <span className="inline-flex items-center gap-1 text-ok text-xs"><i className="w-2 h-2 rounded-full bg-ok" />Online</span>}</p></div>
        {c.bio && <p className="text-ink2 text-sm whitespace-pre-wrap">{c.bio}</p>}
        <p className="text-sm text-ink2 flex flex-wrap gap-x-4 gap-y-1">
          {own ? <button className="hover:text-ink" onClick={() => setPeople('followers')}><b className="text-ink">{d.followers}</b> followers</button> : <span><b className="text-ink">{d.followers}</b> followers</span>}
          {own ? <button className="hover:text-ink" onClick={() => setPeople('following')}><b className="text-ink">{d.following}</b> following</button> : <span><b className="text-ink">{d.following}</b> following</span>}
          {isCreator && d.subscribers > 0 && <span><b className="text-ink">{d.subscribers}</b> subscriber{d.subscribers === 1 ? '' : 's'}</span>}{d.rating && <span><span className="text-warn">★</span> <b className="text-ink">{d.rating.avg}</b> ({d.rating.count})</span>}</p>
        {own ? <div className="space-y-3"><div className="flex flex-wrap gap-2"><button className="btn-primary" onClick={() => setEditing(true)}><Pencil size={15} />Edit profile</button><button className="btn-ghost" onClick={share} aria-label="Share profile"><Share2 size={16} />Share</button>{isCreator && <Link to="/studio" className="btn-ghost">Creator Studio</Link>}</div>
          {!isCreator && <div className="card !bg-card2 space-y-2"><p className="font-semibold">Become a creator</p><p className="text-sm text-ink2">Sell exclusive content, earn from gifts and subscribers, and get a Creator badge.</p><Link to="/become-creator" className="btn-primary">Become a Creator</Link></div>}
          <div className="grid grid-cols-2 gap-2 text-sm">{[['/wallet', 'Wallet'], ['/insights', 'Insights & promotions'], ['/notifications', 'Notifications'], ['/communities', 'Communities'], ['/referrals', 'Referrals'], ['/requests', 'My requests'], ['/meetups', 'My Innercircle'], ['/subscriptions', 'Subscriptions'], ['/settings', 'Settings & privacy']].map(([to, l]) => <Link key={to} to={to} className="btn-ghost">{l}</Link>)}<button className="btn-ghost text-bad" onClick={logout}>Log out</button></div></div>
        : <div className="space-y-2"><div className="flex flex-wrap gap-2"><button onClick={follow} className={d.isFollowing ? 'btn-ghost' : 'btn-primary'}>{d.isFollowing ? 'Following' : 'Follow'}</button><Link to={`/messages?to=${c._id}`} className="btn-ghost">Message</Link><button className="btn-ghost" onClick={share} aria-label="Share profile"><Share2 size={16} /></button>
          {isCreator && <>{c.services?.tipsGifts?.enabled !== false && <button className="btn-ghost text-pink" onClick={() => setGift({ ...c, id: c._id })}>🎁 Gift</button>}{c.subscriptionPricePoints > 0 && <button className="btn-ghost" disabled={d.subscribed} onClick={subscribe}>{d.subscribed ? 'Subscribed ✓' : `Subscribe · ${c.subscriptionPricePoints} pts`}</button>}{rs?.enabled !== false && <button className="btn-ghost" onClick={() => setModal('request')}>Request</button>}{c.meetup?.enabled && <button className="btn-ghost" onClick={() => setModal('meetup')}>Innercircle</button>}</>}</div>
          {isCreator && DM_NOTE[c.dmPolicy?.mode] && <p className="text-xs text-muted">{DM_NOTE[c.dmPolicy.mode](c)}</p>}</div>}</div></div>

    {isCreator ? <div className="flex border-b border-divider overflow-x-auto no-scrollbar" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 shrink-0 px-4 py-3 text-sm font-medium border-b-2 ${tab === k ? 'border-violet' : 'border-transparent text-ink2'}`}>{l}</button>)}</div> : <h2 className="font-semibold px-1">Posts</h2>}
    <div key={tab} className="space-y-4 animate-tab">
      {(tab === 'posts' || tab === 'exclusive') && (posts.isPending ? <Skeleton className="h-40" /> : posts.isError ? <ErrorState error={posts.error} onRetry={() => posts.refetch()} /> : list.length === 0 ? <Empty>{own ? 'You have not posted yet.' : 'Nothing here yet.'}</Empty> : <>{list.map((p) => <PostCard key={p._id} post={p} onGift={setGift} onChange={() => { reload(); posts.refetch(); }} />)}<div ref={sentinel} className="h-6 grid place-items-center text-xs text-muted">{posts.isFetchingNextPage ? 'Loading…' : ''}</div></>)}
      {tab === 'reviews' && (rev.isPending ? <Skeleton /> : <div className="space-y-3">
        <div className="card flex gap-6 items-center"><div className="text-center"><p className="text-4xl font-bold">{rev.data.avg ?? '–'}</p><p className="text-xs text-muted">{rev.data.count} reviews</p></div><div className="flex-1 space-y-1">{[5, 4, 3, 2, 1].map((s) => <div key={s} className="flex items-center gap-2 text-xs"><span>{s}</span><div className="flex-1 h-2 bg-card2 rounded-full overflow-hidden"><div className="h-full bg-warn transition-all duration-700" style={{ width: `${rev.data.count ? (rev.data.distribution[s - 1] / rev.data.count) * 100 : 0}%` }} /></div></div>)}</div></div>
        {(elig.data?.items || []).map((e) => <div key={e.id} className="card space-y-2"><p className="text-sm font-semibold">Rate your {e.kind}</p><select className="input" value={rate.stars} onChange={(x) => setRate({ ...rate, stars: Number(x.target.value) })}>{[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{s} stars</option>)}</select><textarea className="input" placeholder="Optional review" onChange={(x) => setRate({ ...rate, text: x.target.value })} /><button className="btn-primary" onClick={() => submitRate(e.id)}>Submit review</button></div>)}
        {rev.data.items.length === 0 ? <Empty>No reviews yet. Reviews come from completed requests and Innercircle bookings.</Empty> : rev.data.items.map((r) => <div key={r._id} className="card !p-4 space-y-1"><div className="flex justify-between"><span className="font-medium text-sm">{r.reviewerId?.username}</span><Stars n={r.stars} /></div><p className="text-sm text-ink2">{r.text}</p><p className="text-[11px] text-ok">✓ Verified interaction</p></div>)}</div>)}
      {tab === 'gifts' && (gifts.isPending ? <Skeleton /> : gifts.data.items.length === 0 ? <Empty>No gifts received yet.</Empty> : <div className="grid grid-cols-3 gap-2">{gifts.data.items.map((g) => <div key={g.gift?._id} className="card !p-3 text-center animate-rise"><p className="font-semibold text-sm">{g.gift?.name}</p><p className="text-2xl font-bold">×{g.quantity}</p><p className="text-xs text-muted">{g.pointsSpent} pts</p></div>)}</div>)}
    </div>
    <GiftModal creator={gift} onClose={() => { setGift(null); qc.invalidateQueries({ queryKey: ['gifts'] }); }} />
    {modal === 'request' && <RequestModal creator={c} onClose={() => setModal('')} />}{modal === 'meetup' && <MeetupModal creator={c} onClose={() => setModal('')} />}
    {own && <><EditProfileModal open={editing} onClose={() => { setEditing(false); reload(); }} /><PeopleModal kind="followers" open={people === 'followers'} onClose={() => { setPeople(null); reload(); }} /><PeopleModal kind="following" open={people === 'following'} onClose={() => { setPeople(null); reload(); }} /></>}
  </div>;
}
