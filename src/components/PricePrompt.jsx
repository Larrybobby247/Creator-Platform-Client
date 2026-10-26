import { useState } from 'react';
import { Modal } from './ui.jsx';
// Asked whenever a creator adds media or audio: is it free, or paid? (and the price). Resolves through onDone({ access, price }).
export default function PricePrompt({ title = 'Free or paid?', noun = 'this', defaultPrice = 5, allowSubscribers = false, onClose, onDone }) {
  const [mode, setMode] = useState('FREE'); const [price, setPrice] = useState(defaultPrice); const bad = mode === 'PAID' && !(Number(price) >= 1);
  const Opt = ({ k, l, sub }) => <button type="button" onClick={() => setMode(k)} className={`card !p-3 text-left ${mode === k ? '!border-violet' : ''}`} aria-pressed={mode === k}><b className="block text-sm">{l}</b><span className="text-xs text-ink2">{sub}</span></button>;
  return <Modal open onClose={onClose} title={title}><div className="space-y-4">
    <div className={`grid gap-2 ${allowSubscribers ? 'grid-cols-3' : 'grid-cols-2'}`}><Opt k="FREE" l="Free" sub="Everyone can view" /><Opt k="PAID" l="Paid" sub="Pay to unlock" />{allowSubscribers && <Opt k="SUBS" l="Subscribers" sub="Subscribers only" />}</div>
    {mode === 'PAID' && <label className="block text-sm animate-rise">Price for {noun} (points)<input autoFocus type="number" min={1} className="input mt-1" value={price} onChange={(e) => setPrice(e.target.value)} /><span className="text-xs text-muted">You choose the price. 1 point = ₦100.</span></label>}
    <div className="flex gap-2"><button className="btn-ghost flex-1" onClick={onClose}>Cancel</button><button className="btn-primary flex-1" disabled={bad} onClick={() => onDone({ access: mode === 'PAID' ? 'EXCLUSIVE' : mode === 'SUBS' ? 'SUBSCRIBERS' : 'PUBLIC', price: mode === 'PAID' ? Number(price) : 0 })}>Continue</button></div>
  </div></Modal>;
}
