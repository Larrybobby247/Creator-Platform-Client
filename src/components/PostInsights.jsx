import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Heart, MessageCircle, Lock, Rocket, TrendingUp } from 'lucide-react';
import { Modal, Section, Err } from './ui.jsx';
import { api, uid, fmtPoints } from '../lib/api';
import { get } from '../lib/query.js';
import { useConfirmSpend } from './ConfirmSpend.jsx';
import { useLive } from '../context/Live.jsx';
const Stat = ({ icon: I, l, v }) => <div className="card !p-3 !bg-card2"><p className="text-xs text-ink2 flex items-center gap-1"><I size={13} />{l}</p><p className="text-xl font-bold mt-0.5">{v}</p></div>;
const LABEL = { DAY1: '24 hours', DAY3: '3 days', DAY7: '7 days' };

// Small performance pop-up for one of your posts, with a Boost button.
export default function PostInsights({ post, onClose }) {
  const qc = useQueryClient(); const ask = useConfirmSpend(); const { toast } = useLive(); const [err, setErr] = useState(''); const [boost, setBoost] = useState(false); const [dur, setDur] = useState('DAY1'); const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ['post-insights', post._id], queryFn: get(`/insights/post/${post._id}`), staleTime: 15_000 });
  const prices = useQuery({ queryKey: ['promo-prices'], queryFn: get('/promotions/prices'), enabled: boost, staleTime: 5 * 60_000 });
  const go = async () => { if (!(await ask({ title: 'Boost this post?', detail: `It will be shown as Sponsored for ${LABEL[dur]}. Results are not guaranteed.`, points: prices.data[dur], confirmLabel: 'Boost' }))) return; setBusy(true); setErr('');
    try { await api('/promotions', { method: 'POST', body: { targetType: 'POST', targetId: post._id, duration: dur, idempotencyKey: uid() } }); toast('Boost started 🚀'); window.dispatchEvent(new Event('wallet:changed')); qc.invalidateQueries({ queryKey: ['post-insights', post._id] }); qc.invalidateQueries({ queryKey: ['feed'] }); setBoost(false); }
    catch (e) { setErr(e.code === 'INSUFFICIENT_POINTS' ? 'Not enough points. Top up in your wallet.' : e.message); } finally { setBusy(false); } };
  return <Modal open onClose={onClose} title="Post insights"><Section q={q} height="h-40">{(d) => <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2"><Stat icon={Eye} l="Views" v={d.views} /><Stat icon={Heart} l="Likes" v={d.likes} /><Stat icon={MessageCircle} l="Comments" v={d.comments} /><Stat icon={TrendingUp} l="Engagement" v={`${d.engagementPct}%`} />
      {(d.unlocks > 0 || d.revenuePoints > 0) && <><Stat icon={Lock} l="Unlocks" v={d.unlocks} /><Stat icon={Lock} l="Earned" v={fmtPoints(d.revenuePoints)} /></>}</div>
    <p className="text-xs text-muted">Engagement = (likes + comments) ÷ views. Views count each person once.</p>
    {d.boost && <div className="card !p-3 !bg-card2 text-sm"><p className="font-semibold flex items-center gap-1"><Rocket size={14} />{d.boost.active ? 'Boost is running' : 'Previous boost'}</p><p className="text-xs text-ink2">{d.boost.impressions} impressions · {d.boost.clicks} clicks</p></div>}
    {d.boostable ? (!boost ? <button className="btn-primary w-full" onClick={() => setBoost(true)}><Rocket size={16} />Boost this post</button> : <div className="space-y-3 animate-rise"><p className="text-sm text-ink2">Reach more people with a Sponsored boost.</p>
      {prices.isPending ? <div className="h-16 rounded-card bg-card2 animate-pulse" /> : <div className="grid grid-cols-3 gap-2">{Object.keys(LABEL).map((k) => <button key={k} onClick={() => setDur(k)} className={`card !p-3 text-center ${dur === k ? '!border-violet' : ''}`}><p className="text-xs">{LABEL[k]}</p><p className="font-bold">{prices.data?.[k]} pts</p></button>)}</div>}
      <Err>{err}</Err><button className="btn-primary w-full" disabled={busy || !prices.data} onClick={go}>{busy ? 'Starting…' : `Pay ${prices.data?.[dur] ?? '…'} pts and boost`}</button></div>) : <p className="text-xs text-muted">Only public posts can be boosted.</p>}
  </div>}</Section></Modal>;
}
