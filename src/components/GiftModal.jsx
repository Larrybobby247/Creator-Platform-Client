import { useEffect, useState } from 'react';
import { Modal, Err } from './ui.jsx';
import { api, fmtPoints, fmtNaira, uid } from '../lib/api';
import { useLive } from '../context/Live.jsx';
const ICON = { Heart: '❤️', Rose: '🌹', Star: '⭐', Diamond: '💎', Crown: '👑', Trophy: '🏆', 'Premium Gift': '🎁' };

export default function GiftModal({ creator, onClose }) {
  const { toast } = useLive();
  const [gifts, setGifts] = useState([]); const [w, setW] = useState(null); const [sel, setSel] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [key] = useState(uid());
  useEffect(() => { if (!creator) return; api('/gifts/catalogue').then((d) => setGifts(d.gifts)); api('/points/wallet').then(setW); setSel(null); setErr(''); }, [creator]);
  const send = async () => { setBusy(true); setErr('');
    try { await api('/gifts/send', { method: 'POST', body: { giftId: sel._id, creatorId: creator._id || creator.id, idempotencyKey: key } }); toast(`${sel.name} sent to ${creator.displayName || creator.username} 🎉`); window.dispatchEvent(new Event('wallet:changed')); onClose(); }
    catch (e) { setErr(e.code === 'INSUFFICIENT_POINTS' ? 'Not enough points. Top up in your wallet.' : e.message); } finally { setBusy(false); } };
  return <Modal open={!!creator} onClose={onClose} title={sel ? 'Confirm gift' : `Send a gift to ${creator?.displayName || creator?.username || ''}`}>
    {!sel ? <div className="grid grid-cols-3 gap-2">{gifts.map((g) => <button key={g._id} onClick={() => setSel(g)} className="bg-card2 rounded-card p-3 text-center hover:ring-2 ring-violet"><div className="text-3xl">{ICON[g.name] || '🎁'}</div><p className="text-sm mt-1">{g.name}</p><p className="text-xs text-violet-light">{g.pricePoints} pts</p></button>)}</div> :
      <div className="space-y-3 text-center"><div className="text-6xl">{ICON[sel.name] || '🎁'}</div><p className="font-semibold">{sel.name}</p>
        <p className="text-ink2 text-sm">{fmtPoints(sel.pricePoints)} · {w && fmtNaira(sel.pricePoints * w.nairaPerPoint)}<br />Your balance: {w ? fmtPoints(w.availablePoints) : '…'}</p>
        <Err>{err}</Err><div className="flex gap-2"><button className="btn-ghost flex-1" onClick={() => setSel(null)}>Back</button><button className="btn-primary flex-1" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send gift'}</button></div></div>}
  </Modal>;
}
