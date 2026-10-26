import { createContext, useCallback, useContext, useState } from 'react';
import { Modal } from './ui.jsx';
const Ctx = createContext(null);
// In-app prompt that replaces the browser's confirm()/alert()/prompt().
//   if (!(await confirm({ title: 'Delete post?', detail: '…', confirmLabel: 'Delete', danger: true }))) return;
//   const caption = await confirm({ title: 'Edit caption', input: { value: p.content, multiline: true } });   // string, or null if cancelled
export const useConfirm = () => useContext(Ctx);

function Dialog({ req, close }) {
  const [v, setV] = useState(req.input?.value ?? '');
  const submit = (e) => { e?.preventDefault(); close(req.input ? v : true); };
  return <Modal open onClose={() => close(req.input ? null : false)} title={req.title || 'Are you sure?'}>
    <form onSubmit={submit} className="space-y-4">
      {req.detail && <p className="text-ink2 text-sm">{req.detail}</p>}
      {req.input && (req.input.multiline ? <textarea autoFocus className="input min-h-[110px]" value={v} onChange={(e) => setV(e.target.value)} placeholder={req.input.placeholder} maxLength={req.input.maxLength} /> : <input autoFocus className="input" type={req.input.type || 'text'} min={req.input.min} value={v} onChange={(e) => setV(e.target.value)} placeholder={req.input.placeholder} />)}
      <div className="flex gap-2"><button type="button" className="btn-ghost flex-1" onClick={() => close(req.input ? null : false)}>{req.cancelLabel || 'Cancel'}</button>
        <button autoFocus={!req.input} className={`flex-1 ${req.danger ? 'btn-primary !bg-bad' : 'btn-primary'}`}>{req.confirmLabel || 'Confirm'}</button></div>
    </form></Modal>;
}
export function ConfirmProvider({ children }) {
  const [req, setReq] = useState(null);
  const ask = useCallback((opts) => new Promise((resolve) => setReq({ ...opts, resolve })), []);
  const close = (v) => { req?.resolve(v); setReq(null); };
  return <Ctx.Provider value={ask}>{children}{req && <Dialog key={req.title + Date.now()} req={req} close={close} />}</Ctx.Provider>;
}
