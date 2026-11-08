import { useState } from 'react';
import { Modal, Err } from './ui.jsx';
import { api } from '../lib/api';
import { useLive } from '../context/Live.jsx';

// "Rate this creator": shown once a special request is delivered and confirmed (and later from the request, until it has been rated).
export default function RateModal({ creator, qualifyingId, onClose, onDone }) {
  const { toast } = useLive(); const [stars, setStars] = useState(5); const [hover, setHover] = useState(0); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const labels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  const send = async () => { setBusy(true); setErr(''); try { await api(`/creators/${creator._id}/ratings`, { method: 'POST', body: { qualifyingId, stars, text: text.trim() || undefined } }); toast('Thanks for your review'); onDone?.(); onClose(); } catch (e) { setErr(e.code === undefined && /Already rated/i.test(e.message) ? 'You already rated this.' : e.message); } finally { setBusy(false); } };
  return <Modal open onClose={onClose} title={`Rate ${creator.displayName || creator.username}`}><div className="space-y-3 text-center">
    <p className="text-sm text-ink2">How was your special request?</p>
    <div className="flex justify-center gap-1" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setStars(n)} className={`text-4xl leading-none p-1 transition active:scale-90 ${n <= (hover || stars) ? 'text-warn' : 'text-line'}`}>★</button>)}</div>
    <p className="text-sm font-semibold h-5">{labels[hover || stars]}</p>
    <textarea className="input min-h-[90px] text-left" maxLength={1000} placeholder="Add a comment (optional)" value={text} onChange={(e) => setText(e.target.value)} />
    <Err>{err}</Err><div className="flex gap-2"><button className="btn-ghost flex-1" onClick={onClose}>Not now</button><button className="btn-primary flex-1" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Submit rating'}</button></div></div></Modal>;
}
