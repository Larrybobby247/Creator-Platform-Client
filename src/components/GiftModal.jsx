import { useEffect, useState } from 'react';
import { Modal, Err } from './ui.jsx';
import { api, fmtPoints, fmtUsd, uid } from '../lib/api';
import { useLive } from '../context/Live.jsx';
const ICON = { Heart: '❤️', Rose: '🌹', Star: '⭐', Diamond: '💎', Crown: '👑', Trophy: '🏆', 'Premium Gift': '🎁' }; // fallback; the server sends `icon` too
const CUSTOM_ICON = '🐉'; const CUSTOM_MIN = 100;

export default function GiftModal({ creator, onClose }) {
  const { toast } = useLive();
  const [gifts, setGifts] = useState([]); const [w, setW] = useState(null); const [sel, setSel] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [key] = useState(uid());
  const [customMin, setCustomMin] = useState(CUSTOM_MIN); const [amount, setAmount] = useState(String(CUSTOM_MIN));
  useEffect(() => { if (!creator) return; api('/gifts/catalogue').then((d) => { setGifts(d.gifts); if (d.custom?.minPoints) { setCustomMin(d.custom.minPoints); setAmount(String(d.custom.minPoints)); } }); api('/points/wallet').then(setW); setSel(null); setErr(''); }, [creator]);
  const iconOf = (g) => (g.custom ? CUSTOM_ICON : g.icon || ICON[g.name] || '🎁');
  const pts = sel?.custom ? Math.floor(Number(amount) || 0) : sel?.pricePoints;
  const tooLow = sel?.custom && pts < customMin;
  const send = async () => { if (tooLow) return setErr(`A custom gift is ${customMin} points or more.`); setBusy(true); setErr('');
    try { await api('/gifts/send', { method: 'POST', body: sel.custom ? { custom: true, points: pts, creatorId: creator._id || creator.id, idempotencyKey: key } : { giftId: sel._id, creatorId: creator._id || creator.id, idempotencyKey: key } });
      toast(`${iconOf(sel)} ${sel.custom ? `Custom gift (${pts} pts)` : sel.name} sent to ${creator.displayName || creator.username} 🎉`); window.dispatchEvent(new Event('wallet:changed')); onClose(); }
    catch (e) { setErr(e.code === 'INSUFFICIENT_POINTS' ? 'Not enough points. Top up in your wallet.' : e.message); } finally { setBusy(false); } };
  return <Modal open={!!creator} onClose={onClose} title={sel ? 'Confirm gift' : `Send a gift to ${creator?.displayName || creator?.username || ''}`}>
    {!sel ? <div className="grid grid-cols-3 gap-2">{gifts.map((g) => <button key={g._id} onClick={() => setSel(g)} className="bg-card2 rounded-card p-3 text-center hover:ring-2 ring-violet"><div className="text-3xl">{iconOf(g)}</div><p className="text-sm mt-1">{g.name}</p><p className="text-xs text-violet-light">{g.pricePoints} pts</p></button>)}
        <button onClick={() => setSel({ custom: true, name: 'Custom gift' })} className="bg-gradient-to-br from-violet/30 to-pink/30 rounded-card p-3 text-center ring-1 ring-violet/60 hover:ring-2" aria-label="Custom gift"><div className="text-3xl">{CUSTOM_ICON}</div><p className="text-sm mt-1">Custom</p><p className="text-xs text-violet-light">{customMin}+ pts</p></button></div> :
      <div className="space-y-3 text-center"><div className="text-6xl">{iconOf(sel)}</div><p className="font-semibold">{sel.name}</p>
        {sel.custom && <label className="block text-sm text-left">Your amount (points, at least {customMin})<input type="number" inputMode="numeric" min={customMin} step={1} className="input mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={tooLow} />{tooLow && <span className="text-xs text-bad block mt-1">A custom gift can’t be less than {customMin} points.</span>}</label>}
        <p className="text-ink2 text-sm">{fmtPoints(pts || 0)} · {w && fmtUsd((pts || 0) * (w.usdPerPoint ?? 1))}<br />Your balance: {w ? fmtPoints(w.availablePoints) : '…'}</p>
        <Err>{err}</Err><div className="flex gap-2"><button className="btn-ghost flex-1" onClick={() => setSel(null)}>Back</button><button className="btn-primary flex-1" disabled={busy || tooLow} onClick={send}>{busy ? 'Sending…' : 'Send gift'}</button></div></div>}
  </Modal>;
}
