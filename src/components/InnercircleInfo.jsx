import { Modal } from './ui.jsx';
import { Sparkles, ShieldCheck, Wallet, Clock, Ban, CheckCircle2 } from 'lucide-react';
import { usePlatform } from '../lib/platform.js';

const STEPS = [
  ['Choose a time', 'Pick a date and time that works for you. Each creator sets how much notice they need, how long a session lasts and the area where they meet.'],
  ['Pay the fees', 'You pay the booking fee and the invitation fee in points. Nothing goes to the creator yet: the money is held safely by the platform.'],
  ['The creator responds', 'The creator accepts or declines. If they decline, or do not answer in time (48 hours by default), you get everything back automatically.'],
  ['Confirm the details', 'Once the creator accepts, they confirm the arrangement and you review it and accept. Chat in Messages to settle the small details.'],
  ['Meet', 'Meet at the agreed time and place. After the time has passed, the creator marks the booking as completed.'],
  ['Payment is released', 'You then have 24 hours to raise a problem. If there is none, the booking fee is released to the creator.'],
];

// The full explanation of how Innercircle works. Used in the popup on a creator's profile, the Innercircle page and the Terms.
export function InnercircleGuide({ m }) {
  const { name } = usePlatform();
  return <div className="space-y-5 text-sm">
    <p className="text-ink2">Innercircle is a way to book a private, in-person meet-up with a creator you follow. It is for adults only, it is arranged entirely inside {name}, and your points stay protected until the booking is done.</p>
    {m && <div className="card !p-3 !bg-card2 grid grid-cols-2 gap-2 text-xs"><p><span className="text-muted block">Booking fee</span><b className="text-sm">{m.pricePoints} pts</b></p><p><span className="text-muted block">Invitation fee</span><b className="text-sm">{m.transportPoints || 0} pts</b></p>{m.durationMin && <p><span className="text-muted block">Session length</span><b className="text-sm">{m.durationMin} min</b></p>}{m.area && <p><span className="text-muted block">Meeting area</span><b className="text-sm">{m.area}</b></p>}</div>}
    <section className="space-y-3"><h3 className="font-semibold flex items-center gap-2"><Sparkles size={16} className="text-violet-light" />How it works, step by step</h3>
      <ol className="space-y-3">{STEPS.map(([t, d], i) => <li key={t} className="flex gap-3"><span className="grid place-items-center w-6 h-6 rounded-full bg-violet text-white text-xs font-bold shrink-0">{i + 1}</span><span><b className="block">{t}</b><span className="text-ink2">{d}</span></span></li>)}</ol></section>
    <section className="space-y-2"><h3 className="font-semibold flex items-center gap-2"><Wallet size={16} className="text-violet-light" />What you pay</h3>
      <ul className="space-y-1.5 text-ink2 list-disc pl-5"><li><b className="text-ink">Booking fee:</b> the price for the creator's time. It is released to them only after the meet-up is completed.</li><li><b className="text-ink">Invitation fee:</b> a separate fee that covers the creator's cost of inviting and hosting you (for example getting to the place). It is charged together with the booking fee.</li><li>Both are paid with your points and are held (reserved) from the moment you book.</li></ul></section>
    <section className="space-y-2"><h3 className="font-semibold flex items-center gap-2"><Ban size={16} className="text-violet-light" />Cancellations and refunds</h3>
      <div className="rounded-btn border border-line overflow-hidden"><table className="w-full text-xs"><thead className="bg-card2 text-ink2"><tr><th className="text-left p-2">What happens</th><th className="text-left p-2">Your refund</th></tr></thead><tbody className="divide-y divide-divider">
        <tr><td className="p-2">The creator declines</td><td className="p-2">Everything (both fees)</td></tr><tr><td className="p-2">The creator does not respond in time</td><td className="p-2">Everything (both fees)</td></tr>
        <tr><td className="p-2">You cancel before the meet-up</td><td className="p-2">Booking fee. The invitation fee is not refunded</td></tr><tr><td className="p-2">Something goes wrong, and you report it within 24 hours of completion</td><td className="p-2">Our team reviews it before any money is released</td></tr></tbody></table></div></section>
    <section className="space-y-2"><h3 className="font-semibold flex items-center gap-2"><ShieldCheck size={16} className="text-violet-light" />Safety and rules</h3>
      <ul className="space-y-1.5 text-ink2">{['Only creators who passed identity verification can offer Innercircle. You will not see the option on anyone else.', 'Always book and pay inside the app. Never send money outside it: we can only protect payments made here.', 'Meet in a public or safe place, tell someone you trust where you are going, and trust your instincts.', 'Both of you must be 18 or older. You can report a booking or a person at any time from the app.', 'The platform is not a party to the meeting itself, so you are responsible for your own safety.'].map((x) => <li key={x} className="flex gap-2"><CheckCircle2 size={15} className="text-ok shrink-0 mt-0.5" />{x}</li>)}</ul></section>
    <p className="text-xs text-muted flex gap-2"><Clock size={14} className="shrink-0 mt-0.5" />Response windows and the report period can be adjusted by the platform. The times above are the defaults.</p>
  </div>;
}

export default function InnercircleInfoModal({ m, onContinue, onClose, continueLabel = 'I understand, continue' }) {
  return <Modal open onClose={onClose} title="How Innercircle works" wide><div className="space-y-4"><InnercircleGuide m={m} />
    <div className="flex gap-2 sticky bottom-0 bg-card pt-3"><button className="btn-ghost flex-1" onClick={onClose}>Close</button><button className="btn-primary flex-1" onClick={onContinue}>{continueLabel}</button></div></div></Modal>;
}
