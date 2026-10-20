import { createContext, useCallback, useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Modal } from './ui.jsx';
import { fmtNaira, fmtPoints } from '../lib/api';
import { get, keys } from '../lib/query.js';
const Ctx = createContext(null);
// Every action that spends points asks first:  if (!(await ask({ title, points, detail }))) return;
export const useConfirmSpend = () => useContext(Ctx);

function Dialog({ req, close }) {
  const { data: w } = useQuery({ queryKey: keys.wallet, queryFn: get('/points/wallet'), staleTime: 10_000 });
  const bal = w?.availablePoints, enough = bal === undefined ? true : bal >= req.points;
  return <Modal open onClose={() => close(false)} title={req.title || 'Confirm purchase'}>
    <div className="space-y-4 text-center">
      <p className="text-ink2 text-sm">{req.detail}</p>
      <div className="rounded-card bg-card2 p-4 space-y-1"><p className="text-4xl font-bold">{req.points} <span className="text-lg text-ink2">pts</span></p>{w && <p className="text-xs text-muted">≈ {fmtNaira(req.points * w.nairaPerPoint)}</p>}</div>
      {w && <p className="text-sm text-ink2">Your balance: <b className="text-ink">{fmtPoints(bal)}</b>{enough ? <> → <b className="text-ink">{fmtPoints(bal - req.points)}</b> after</> : null}</p>}
      {!enough && <p role="alert" className="text-bad text-sm">You need {req.points - bal} more point{req.points - bal === 1 ? '' : 's'}.</p>}
      <div className="flex gap-2"><button className="btn-ghost flex-1" onClick={() => close(false)}>Cancel</button>
        {enough ? <button autoFocus className="btn-primary flex-1" onClick={() => close(true)}>{req.confirmLabel || 'Confirm'}</button> : <Link to="/wallet" onClick={() => close(false)} className="btn-primary flex-1">Buy points</Link>}</div>
    </div></Modal>;
}
export function ConfirmSpendProvider({ children }) {
  const [req, setReq] = useState(null);
  const ask = useCallback((opts) => new Promise((resolve) => setReq({ ...opts, resolve })), []);
  const close = (v) => { req?.resolve(v); setReq(null); };
  return <Ctx.Provider value={ask}>{children}{req && <Dialog req={req} close={close} />}</Ctx.Provider>;
}
