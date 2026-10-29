import { useState } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, Check } from 'lucide-react';
import { useInstall } from '../lib/install.js';
import { usePlatform } from '../lib/platform.js';

const DISMISS = 'install-banner-dismissed';
const steps = (i, name) => i.ios ? [<>Open {name} in <b>Safari</b>.</>, <>Tap the <b>Share</b> button <Share size={14} className="inline -mt-1" />.</>, <>Choose <b>Add to Home Screen</b> <PlusSquare size={14} className="inline -mt-1" />, then tap <b>Add</b>.</>]
  : [<>Open the browser menu (the three dots).</>, <>Tap <b>Install app</b> or <b>Add to Home screen</b>.</>, <>Confirm. {name} now opens like any other app.</>];

// "Install the app" section. variant "card" = full section (Settings, landing page); "banner" = slim, dismissible strip for the home feed.
export default function InstallApp({ variant = 'card' }) {
  const i = useInstall(); const { name } = usePlatform(); const [hidden, setHidden] = useState(() => { try { return Date.now() - Number(localStorage.getItem(DISMISS) || 0) < 14 * 864e5; } catch { return false; } });
  const [busy, setBusy] = useState(false); const [help, setHelp] = useState(false);
  const install = async () => { if (i.canPrompt) { setBusy(true); await i.prompt(); setBusy(false); } else setHelp(true); };
  if (variant === 'banner') {
    if (i.installed || hidden) return null;
    return <div className="card !p-3 flex items-center gap-3 animate-rise" role="region" aria-label={`Install ${name}`}><span className="grid place-items-center w-10 h-10 rounded-full bg-violet/20 text-violet-light shrink-0"><Smartphone size={20} /></span>
      <div className="flex-1 min-w-0"><p className="font-semibold text-sm">Install {name} on your phone</p><p className="text-xs text-ink2 truncate">Faster, full screen, and instant alerts.</p></div>
      <button className="btn-primary !py-2 !px-3 text-sm" onClick={install} disabled={busy}>{i.canPrompt ? 'Install' : 'How'}</button>
      <button aria-label="Dismiss" className="text-ink2 p-1" onClick={() => { try { localStorage.setItem(DISMISS, String(Date.now())); } catch { /* private mode */ } setHidden(true); }}><X size={18} /></button>
      {help && !i.canPrompt && <HelpModal i={i} name={name} onClose={() => setHelp(false)} />}</div>;
  }
  return <section className="card space-y-3" aria-labelledby="install-h"><div className="flex items-start gap-3"><span className="grid place-items-center w-11 h-11 rounded-full bg-gradient-to-br from-violet to-pink text-white shrink-0"><Smartphone size={22} /></span>
    <div className="flex-1"><h2 id="install-h" className="font-semibold text-lg">Install the {name} app</h2><p className="text-sm text-ink2">Add {name} to your home screen for one-tap access, a full-screen experience and instant notifications. No app store needed.</p></div></div>
    {i.installed ? <p className="text-ok text-sm flex items-center gap-2"><Check size={16} />{name} is installed on this device.</p> : <>
      {i.canPrompt && <button className="btn-primary w-full" onClick={install} disabled={busy}><Download size={16} />{busy ? 'Opening…' : `Install ${name}`}</button>}
      {(!i.canPrompt || help) && <ol className="space-y-2 text-sm text-ink2 list-decimal pl-5">{steps(i, name).map((s, k) => <li key={k}>{s}</li>)}</ol>}
      {i.canPrompt && !help && <button className="text-xs text-violet-light underline" onClick={() => setHelp(true)}>Show manual steps</button>}</>}</section>;
}
function HelpModal({ i, name, onClose }) {
  return <div className="fixed inset-0 z-[60] bg-black/60 grid place-items-end sm:place-items-center p-4" onClick={onClose}><div className="card w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}><div className="flex justify-between"><b>Install {name}</b><button onClick={onClose} aria-label="Close"><X size={18} /></button></div><ol className="space-y-2 text-sm text-ink2 list-decimal pl-5">{steps(i, name).map((s, k) => <li key={k}>{s}</li>)}</ol></div></div>;
}
