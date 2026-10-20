import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fmtPoints, fmtNaira } from '../lib/api';
import { get, keys } from '../lib/query.js';
import { Section, Empty, Err, Skeleton } from '../components/ui.jsx';
import { useLive } from '../context/Live.jsx';
const tone = { COMPLETED: 'text-ok', PENDING: 'text-warn', FAILED: 'text-bad', REVERSED: 'text-info' };

export default function Wallet() {
  const { toast } = useLive(); const qc = useQueryClient(); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [amt, setAmt] = useState('5');
  const wallet = useQuery({ queryKey: keys.wallet, queryFn: get('/points/wallet') });
  const history = useQuery({ queryKey: ['transactions'], queryFn: get('/points/transactions'), staleTime: 15_000 }); // loads independently of the balance cards
  const refresh = () => { qc.invalidateQueries({ queryKey: keys.wallet }); qc.invalidateQueries({ queryKey: ['transactions'] }); };
  useEffect(() => { const ref = new URLSearchParams(location.search).get('ref'); if (ref) api(`/points/purchase/${ref}/status`).then(refresh).catch(() => {}); }, []); // server-side verification after the payment redirect
  const buy = async (points) => { setBusy(true); setErr('');
    try { const d = await api('/points/purchase', { method: 'POST', body: { points } });
      if (d.mock) { await api(`/points/purchase/${d.reference}/mock-pay`, { method: 'POST' }); toast('Test payment complete (dev mode)'); refresh(); } else window.location.href = d.authorizationUrl; }
    catch (e) { setErr(e.message); } finally { setBusy(false); } };
  const w = wallet.data;
  return <div className="space-y-6"><h1 className="text-3xl font-bold">Wallet</h1><Err>{err}</Err>
    <Section q={wallet} height="h-28">{() => <>
      <div className="grid grid-cols-2 gap-3"><div className="card"><p className="text-ink2 text-sm">Available points</p><p className="text-4xl font-bold mt-1">{w.availablePoints.toLocaleString()}</p><p className="text-xs text-muted mt-1">≈ {fmtNaira(w.availablePoints * w.nairaPerPoint)} of in-app credit</p></div>
        <div className="card"><p className="text-ink2 text-sm">Reserved</p><p className="text-4xl font-bold mt-1">{w.reservedPoints.toLocaleString()}</p></div></div>
      <section className="card space-y-3"><h2 className="text-xl font-semibold">Buy points</h2><p className="text-sm text-ink2">1 point = {fmtNaira(w.nairaPerPoint)}. Choose any amount from 1 point. Points are for use inside the app only.</p>
        <div className="flex flex-wrap gap-2">{w.packages.map((p) => <button key={p.points} onClick={() => setAmt(String(p.points))} className={`chip ${Number(amt) === p.points ? 'bg-violet border-violet' : 'border-line text-ink2'}`}>{p.points} pt{p.points === 1 ? '' : 's'}{p.bonusPoints > 0 && <span className="text-ok text-xs"> +{p.bonusPoints} bonus</span>}</button>)}</div>
        <label className="block text-sm">Number of points<input type="number" inputMode="numeric" min={1} max={w.maxPurchasePoints} step={1} className="input mt-1 text-lg font-semibold" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^\d]/g, ''))} /></label>
        {(() => { const n = Number(amt); const ok = Number.isInteger(n) && n >= 1 && n <= w.maxPurchasePoints; const bonus = w.packages.find((p) => p.points === n)?.bonusPoints || 0; return <><p className="text-sm text-ink2 text-center">{ok ? <>You pay <b className="text-ink text-lg">{fmtNaira(n * w.nairaPerPoint)}</b> and get <b className="text-ink">{n}{bonus ? ` + ${bonus} bonus` : ''}</b> point{n === 1 && !bonus ? '' : 's'}</> : `Enter between 1 and ${w.maxPurchasePoints.toLocaleString()} points`}</p>
          <button className="btn-primary w-full" disabled={busy || !ok} onClick={() => buy(n)}>{busy ? 'Please wait…' : ok ? `Buy ${n} point${n === 1 ? '' : 's'} · ${fmtNaira(n * w.nairaPerPoint)}` : 'Enter an amount'}</button></>; })()}
      </section></>}</Section>
    <section><h2 className="text-xl font-semibold mb-3">History</h2>
      <Section q={history} height="h-40" isEmpty={(d) => d.items.length === 0} empty={<Empty>No transactions yet.</Empty>}>{(d) => <ul className="space-y-2">{d.items.map((t) => <li key={t._id} className="card !p-3 flex justify-between gap-3 text-sm">
        <div className="min-w-0"><p className="font-medium truncate">{t.type.replaceAll('_', ' ')}</p><p className="text-muted text-xs truncate">{t.reference} · {new Date(t.createdAt).toLocaleString()}</p></div>
        <div className="text-right"><p className="font-semibold">{t.direction === 'CREDIT' ? '+' : '−'}{fmtPoints(t.amount)}</p><p className={`text-xs ${tone[t.status]}`}>{t.status}</p></div></li>)}</ul>}</Section></section></div>;
}
