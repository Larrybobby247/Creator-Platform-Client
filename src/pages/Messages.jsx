import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { keys } from '../lib/query.js';
import { Paperclip, Mic, Send, Lock, Trash2, MoreVertical, X as XIcon, Play, Ban } from 'lucide-react';
import { Avatar, Empty, Err, Skeleton, Modal } from '../components/ui.jsx';
import Notes from '../components/Notes.jsx';
import { api, ago, uid } from '../lib/api';
import { useAuth } from '../context/Auth.jsx';
import { useConfirmSpend } from '../components/ConfirmSpend.jsx';
import { get } from '../lib/query.js';
import { useLive } from '../context/Live.jsx';
import MediaViewer from '../components/MediaViewer.jsx';
import PricePrompt from '../components/PricePrompt.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';

// Categories depend on the account: "Subscribers" only exists for creators. Everyone can add their own categories on top.
const baseCats = (creator) => [['all', 'All'], ['unread', 'Unread'], ['creators', 'Creators'], ['users', 'People'], ...(creator ? [['subscribers', 'Subscribers']] : []), ['requests', 'Requests'], ['paid', 'Paid'], ['archived', 'Archived']];
const EMOJI = ['❤️', '👍', '😂', '😮', '🔥'];

function MediaBubble({ m }) {
  const [url, setUrl] = useState(null); const [view, setView] = useState(false);
  useEffect(() => { if (m.mediaId && !m.pending && !m.locked) api(`/messages/message/${m._id}/media`).then((d) => setUrl(d.url)).catch(() => {}); }, [m._id, m.locked, m.mediaId]);
  if (m.pending) return <span className="text-xs">Uploading…</span>;
  if (!url) return <div className="w-40 h-24 rounded-btn bg-black/20 animate-pulse" />;
  if (m.type === 'VOICE') return <audio src={url} controls className="max-w-full" />;
  return <>
    <button type="button" onClick={() => setView(true)} className="relative block rounded-btn overflow-hidden" aria-label={m.type === 'VIDEO' ? 'Play video' : 'View photo'}>
      {m.type === 'IMAGE' ? <img src={url} alt="" className="rounded-btn max-h-64 cursor-zoom-in" /> : <><video src={`${url}#t=0.1`} preload="metadata" muted playsInline className="rounded-btn max-h-64 pointer-events-none" /><span className="absolute inset-0 grid place-items-center"><span className="w-11 h-11 rounded-full bg-black/60 grid place-items-center"><Play fill="white" size={18} /></span></span></>}</button>
    {view && <MediaViewer items={[{ url, type: m.type === 'VIDEO' ? 'VIDEO' : 'IMAGE' }]} onClose={() => setView(false)} />}</>;
}

export default function Messages() {
  const { user } = useAuth(); const { socket, presence, refreshCounts, toast } = useLive(); const confirm = useConfirm(); const [sp] = useSearchParams(); const ask = useConfirmSpend(); const creator = user.accountMode === 'CREATOR';
  const qc = useQueryClient(); const [cat, setCat] = useState('all'); const [open, setOpen] = useState(null); const [hasMore, setHasMore] = useState(false);
  const convQ = useQuery({ queryKey: keys.conversations(cat), queryFn: ({ signal }) => api(`/messages/conversations?category=${cat}`, { signal }), staleTime: 15_000 }); const list = convQ.data?.items;
  const labelsQ = useQuery({ queryKey: ['labels'], queryFn: get('/messages/labels'), staleTime: 60_000 }); const labels = labelsQ.data?.items || []; const [labelMenu, setLabelMenu] = useState(false); const [newLabel, setNewLabel] = useState(''); const [subsOnly, setSubsOnly] = useState(null);
  const [msgs, setMsgs] = useState([]); const [text, setText] = useState(''); const [tab, setTab] = useState('chat'); const [err, setErr] = useState('');
  const [typing, setTyping] = useState(false); const [seen, setSeen] = useState(false); const [reply, setReply] = useState(null); const [react, setReact] = useState(null);
  const [rec, setRec] = useState(null); const [recSec, setRecSec] = useState(0); const [pricing, setPricing] = useState(null); const [msgMenu, setMsgMenu] = useState(null); const [paid, setPaid] = useState(false); const [pf, setPf] = useState({ teaser: '', paidText: '', price: 3 }); const [up, setUp] = useState(false); const cancelRec = useRef(false);
  const bottom = useRef(); const typingTimer = useRef(); const lastTyping = useRef(0); const fileRef = useRef(); const recRef = useRef();
  const openRef = useRef(null); openRef.current = open;
  const other = (c) => c.participants.find((p) => p._id !== user.id) || c.participants[0];

  const loadList = useCallback(() => qc.invalidateQueries({ queryKey: ['conversations'] }), [qc]);
  useEffect(() => { const to = sp.get('to'); if (!to) return;
    api('/messages/conversations?category=all').then(async (d) => { const c = d.items.find((x) => x.participants.some((p) => p._id === to));
      if (c) return setOpen(c); const u = await api(`/creators/${to}`).catch(() => null); if (u) setOpen({ draft: true, policy: u.creator.dmPolicy && u.creator.accountMode === 'CREATOR' ? u.creator.dmPolicy : null, participants: [{ _id: user.id }, { _id: to, username: u.creator.username, displayName: u.creator.displayName, avatarUrl: u.creator.avatarUrl }] }); }); }, [sp]);
  const openConv = useCallback(async (c) => { if (c.draft) { setMsgs([]); return; } const d = await api(`/messages/${c._id}`); setMsgs(d.messages); setHasMore(!!d.hasMore); setSeen(false); refreshCounts(); loadList(); }, []);
  useEffect(() => { if (open) { setTab('chat'); setReply(null); openConv(open); } }, [open?._id]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length, typing]);
  // Safety net: if the live connection drops, new messages still arrive within a few seconds without leaving the chat.
  useEffect(() => { if (!open || open.draft) return; const t = setInterval(async () => { if (document.hidden) return; try { const d = await api(`/messages/${open._id}`); setMsgs((cur) => { const pend = cur.filter((x) => x.pending || x.failed); const known = new Set(d.messages.map((x) => x._id)); const first = d.messages[0] ? new Date(d.messages[0].createdAt) : new Date(0); const older = cur.filter((x) => !x.pending && !x.failed && !known.has(x._id) && new Date(x.createdAt) < first); return [...older, ...d.messages, ...pend.filter((x) => !known.has(x._id))]; }); refreshCounts(); } catch { /* retry next tick */ } }, 6000); return () => clearInterval(t); }, [open?._id]);
  const [opOnline, setOpOnline] = useState(null);
  useEffect(() => { setOpOnline(null); if (!open) return; const o = other(open); api(`/messages/presence/${o._id}`).then((d) => setOpOnline(d.online)).catch(() => {}); }, [open?._id]);

  useEffect(() => {
    if (!socket) return;
    const onMsg = ({ message, conversationId }) => {
      if (openRef.current?._id === conversationId) {
        setMsgs((m) => m.some((x) => x._id === message._id) ? m : [...m.filter((x) => !(x.pending && x.clientId === message.clientId)), message]);
        if (message.senderId !== user.id) { api(`/messages/${conversationId}/read`, { method: 'POST' }).then(refreshCounts); setTyping(false); } // tiny call, not a full history reload
      }
      loadList();
    };
    const onUpd = ({ message, conversationId }) => { if (openRef.current?._id === conversationId) setMsgs((ms) => ms.map((x) => x._id === message._id ? { ...x, ...message } : x)); };
    const onTyping = ({ conversationId }) => { if (openRef.current?._id === conversationId) { setTyping(true); clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setTyping(false), 2500); } };
    const onRead = ({ conversationId }) => { if (openRef.current?._id === conversationId) setSeen(true); };
    const onDel = ({ messageId, conversationId, scope }) => { if (openRef.current?._id === conversationId) setMsgs((ms) => scope === 'me' ? ms.filter((x) => x._id !== messageId) : ms.map((x) => x._id === messageId ? { _id: x._id, senderId: x.senderId, createdAt: x.createdAt, deletedForAll: true, reactions: [] } : x)); loadList(); };
    socket.on('message:new', onMsg); socket.on('message:update', onUpd); socket.on('typing', onTyping); socket.on('conversation:read', onRead); socket.on('message:deleted', onDel);
    return () => { socket.off('message:deleted', onDel); socket.off('message:new', onMsg); socket.off('message:update', onUpd); socket.off('typing', onTyping); socket.off('conversation:read', onRead); };
  }, [socket, loadList]);

  const loadEarlier = async () => { const first = msgs.find((m) => !m.pending); if (!first) return; const d = await api(`/messages/${open._id}?before=${encodeURIComponent(first.createdAt)}`); setMsgs((m) => [...d.messages, ...m]); setHasMore(!!d.hasMore); };
  const optimistic = (extra) => { const clientId = uid(); setMsgs((m) => [...m, { _id: clientId, clientId, pending: true, senderId: user.id, createdAt: new Date().toISOString(), ...extra }]); return clientId; };
  const settle = (clientId, m) => setMsgs((ms) => ms.map((x) => x.clientId === clientId ? { ...m, clientId } : x).filter((x, i, a) => a.findIndex((y) => y._id === x._id) === i));
  const fail = (clientId, e) => { setErr(e.message); setMsgs((ms) => ms.map((y) => y.clientId === clientId ? { ...y, failed: true, pending: false } : y)); };
  const afterDraft = async (o) => { if (open.draft) { const d = await api('/messages/conversations?category=all'); const c = d.items.find((x) => x.participants.some((p) => p._id === o._id)); c && setOpen(c); } loadList(); };

  // Creator messaging rules: pay-to-message (confirm, pay, retry) or subscribers-only (show how to subscribe).
  const dmGate = async (x, o) => {
    if (x.code === 'DM_PAYMENT_REQUIRED') { const price = x.data?.extra?.price; if (!(await ask({ title: `Pay to message ${o.displayName || o.username}?`, detail: 'A one-time fee opens the conversation. Subscribers message for free.', points: price, confirmLabel: 'Pay and send' }))) return false;
      try { await api('/messages/dm-access', { method: 'POST', body: { toUserId: o._id } }); window.dispatchEvent(new Event('wallet:changed')); return true; } catch (e) { setErr(e.code === 'INSUFFICIENT_POINTS' ? 'Not enough points. Top up in your wallet.' : e.message); return false; } }
    if (x.code === 'DM_SUBSCRIBERS_ONLY') { setSubsOnly(o); return false; } return null; };
  const send = async (e) => { e.preventDefault(); const t = text.trim(); if (!t) return; setText(''); setErr(''); const o = other(open); const replyTo = reply?._id; setReply(null);
    const cid = optimistic({ text: t, replyTo }); const post = () => api('/messages', { method: 'POST', body: { toUserId: o._id, text: t, clientId: cid, replyTo } });
    try { settle(cid, await post()); afterDraft(o); } catch (x) { const g = await dmGate(x, o); if (g === true) { try { settle(cid, await post()); afterDraft(o); return; } catch (y) { return fail(cid, y); } } if (g === false) { setMsgs((ms) => ms.filter((m) => m.clientId !== cid)); setText(t); return; } fail(cid, x); } };
  const sendFile = async (file, extra = {}) => { if (!file) return; setErr(''); setUp(true); const o = other(open); const cid = optimistic({ type: file.type.startsWith('image') ? 'IMAGE' : file.type.startsWith('audio') ? 'VOICE' : 'VIDEO', mediaId: 'x' });
    const fd = new FormData(); fd.append('file', file); fd.append('toUserId', o._id); fd.append('clientId', cid); if (reply) fd.append('replyTo', reply._id); Object.entries(extra).forEach(([k, v]) => fd.append(k, v)); setReply(null);
    try { settle(cid, await api('/messages/attachment', { method: 'POST', form: fd })); afterDraft(o); } catch (x) { const g = await dmGate(x, o); if (g === true) { try { settle(cid, await api('/messages/attachment', { method: 'POST', form: fd })); afterDraft(o); } catch (y) { fail(cid, y); } } else if (g === false) setMsgs((ms) => ms.filter((m) => m.clientId !== cid)); else fail(cid, x); } finally { setUp(false); } };
  // Attachments: creators are asked "free or paid?" (with the price) before anything is uploaded; everyone else sends straight away.
  const stage = (file) => { if (!file) return; creator ? setPricing({ file }) : sendFile(file); };
  const startRec = async () => { try { const st = await navigator.mediaDevices.getUserMedia({ audio: true }); const mr = new MediaRecorder(st); const chunks = []; cancelRec.current = false; mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => { st.getTracks().forEach((t) => t.stop()); if (cancelRec.current || !chunks.length) return; const type = (mr.mimeType || 'audio/webm').split(';')[0]; stage(new File(chunks, `voice.${type.split('/')[1]}`, { type })); }; mr.start(); recRef.current = mr; setRec(Date.now()); setRecSec(0); } catch { setErr('Microphone permission is needed for voice messages'); } };
  const stopRec = () => { cancelRec.current = false; recRef.current?.stop(); setRec(null); };
  const discardRec = () => { cancelRec.current = true; recRef.current?.stop(); setRec(null); }; // nothing is sent
  useEffect(() => { if (!rec) return; const t = setInterval(() => setRecSec(Math.round((Date.now() - rec) / 1000)), 500); return () => clearInterval(t); }, [rec]);
  const sendPaid = async () => { try { const o = other(open); const m = await api('/messages/paid', { method: 'POST', body: { toUserId: o._id, teaser: pf.teaser || 'Paid message', paidText: pf.paidText, price: Number(pf.price) } }); setMsgs((x) => [...x, m]); setPaid(false); setPf({ teaser: '', paidText: '', price: 3 }); afterDraft(o); } catch (x) { setErr(x.message); } };
  const unlock = async (m) => { if (!(await ask({ title: 'Unlock this message?', detail: 'Pay to reveal the paid message.', points: m.price, confirmLabel: 'Unlock' }))) return; try { const d = await api(`/messages/message/${m._id}/unlock`, { method: 'POST' }); setMsgs((ms) => ms.map((x) => x._id === m._id ? d : x)); window.dispatchEvent(new Event('wallet:changed')); } catch (x) { toast(x.code === 'INSUFFICIENT_POINTS' ? 'Not enough points. Top up in your wallet.' : x.message); } };
  const reactTo = async (m, emoji) => { setReact(null); const mine = m.reactions?.find((r) => r.userId === user.id)?.emoji === emoji; const d = await api(`/messages/message/${m._id}/react`, { method: 'POST', body: { emoji, remove: mine } }); setMsgs((ms) => ms.map((x) => x._id === m._id ? { ...x, reactions: d.reactions } : x)); };
  const onType = (v) => { setText(v); if (open && !open.draft && Date.now() - lastTyping.current > 1500) { lastTyping.current = Date.now(); socket?.emit('typing', { conversationId: open._id }); } };
  const addLabel = async () => { const name = newLabel.trim(); if (!name) return; try { await api('/messages/labels', { method: 'POST', body: { name } }); setNewLabel(''); labelsQ.refetch(); } catch (x) { toast(x.message); } };
  const delLabel = async (l) => { if (!(await confirm({ title: `Delete the category “${l.name}”?`, detail: 'Conversations stay; only the category is removed.', confirmLabel: 'Delete', danger: true }))) return; await api(`/messages/labels/${l._id}`, { method: 'DELETE' }); if (cat === `label:${l._id}`) setCat('all'); labelsQ.refetch(); loadList(); };
  const toggleLabel = async (l) => { const on = !(open.myLabelIds || []).includes(l._id); try { await api(`/messages/${open._id}/label`, { method: 'POST', body: { labelId: l._id, on } }); setOpen({ ...open, myLabelIds: on ? [...(open.myLabelIds || []), l._id] : open.myLabelIds.filter((x) => x !== l._id) }); loadList(); } catch (x) { toast(x.message); } };
  const delMsg = async (m, scope) => { setMsgMenu(null);
    if (scope === 'everyone' && !(await confirm({ title: 'Delete for everyone?', detail: 'This message will be removed for you and for them. This cannot be undone.', confirmLabel: 'Delete for everyone', danger: true }))) return;
    try { await api(`/messages/message/${m._id}/delete`, { method: 'POST', body: { scope } }); setMsgs((ms) => scope === 'me' ? ms.filter((x) => x._id !== m._id) : ms.map((x) => x._id === m._id ? { _id: x._id, senderId: x.senderId, createdAt: x.createdAt, deletedForAll: true, reactions: [] } : x)); loadList(); } catch (x) { toast(x.message); } };
  const setCategory = async (labelId) => { try { await api(`/messages/${open._id}/category`, { method: 'POST', body: { labelId } }); setOpen({ ...open, myLabelIds: labelId ? [labelId] : [] }); setLabelMenu(false); loadList(); toast(labelId ? 'Category changed' : 'Category removed'); } catch (x) { toast(x.message); } };
  const act = async (a) => { await api(`/messages/${open._id}/${a}`, { method: 'POST' }); if (a === 'archive' || a === 'unarchive') { setOpen(null); toast(a === 'archive' ? 'Archived' : 'Moved back to your inbox'); } loadList(); };

  if (open) { const o = other(open); const isOn = presence?.[o._id] ?? opOnline ?? open.online; const archived = cat === 'archived' || (open.archivedBy || []).includes(user.id); const lastMine = [...msgs].reverse().find((m) => m.senderId === user.id); const byId = Object.fromEntries(msgs.map((m) => [m._id, m]));
    return <div className="flex flex-col h-[calc(100dvh-9.5rem)] lg:h-[calc(100dvh-6.5rem)]">
      <div className="flex items-center gap-3 pb-3 border-b border-divider">
        <button className="btn-ghost !px-3" onClick={() => { setOpen(null); loadList(); }} aria-label="Back">←</button>
        <span className="relative shrink-0"><Avatar user={o} size={36} />{isOn && <i className="absolute bottom-0 right-0 w-3 h-3 bg-ok rounded-full ring-2 ring-bg" />}</span><div className="flex-1 min-w-0"><Link to={`/u/${o.username}`} className="font-semibold truncate block">{o.displayName || o.username}</Link><p className={`text-xs ${typing || isOn ? 'text-ok' : 'text-muted'}`}>{typing ? 'typing…' : isOn ? 'online' : ''}</p></div>
        {!open.draft && <><div className="relative"><button className="btn-ghost !px-3" onClick={() => setLabelMenu(!labelMenu)} aria-label="Categories" aria-expanded={labelMenu}>🏷️</button>{labelMenu && <div className="absolute right-0 top-full mt-1 z-20 w-60 card !p-2 space-y-1 animate-fade"><p className="text-xs text-muted px-2 pt-1">Category for {o.displayName || o.username}</p>
          <button className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-card2 ${!(open.myLabelIds || []).length ? 'text-violet-light font-semibold' : ''}`} onClick={() => setCategory(null)}>{!(open.myLabelIds || []).length ? '● ' : '○ '}No category</button>
          {labels.map((l) => { const on = (open.myLabelIds || []).includes(l._id); return <button key={l._id} className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-card2 ${on ? 'text-violet-light font-semibold' : ''}`} onClick={() => setCategory(l._id)}>{on ? '● ' : '○ '}{l.name}</button>; })}
          <div className="flex gap-1 pt-1"><input className="input !py-1.5 text-sm" placeholder="New category" value={newLabel} maxLength={24} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addLabel()} /><button className="btn-ghost !py-1.5" onClick={addLabel}>Add</button></div></div>}</div><button className={`btn-ghost !px-3 ${tab === 'notes' ? '!bg-violet' : ''}`} onClick={() => setTab(tab === 'notes' ? 'chat' : 'notes')}>Notes</button><button className="btn-ghost !px-3 text-sm" onClick={() => act(archived ? 'unarchive' : 'archive')} aria-label={archived ? 'Unarchive' : 'Archive'}>{archived ? 'Unarchive' : '📥'}</button></>}
      </div>
      {tab === 'notes' ? <div className="py-4 overflow-y-auto"><Notes conversationId={open._id} /></div> : <>
        {subsOnly && <div className="card !p-3 my-2 text-sm flex items-center justify-between gap-2 animate-rise">Only subscribers can message {subsOnly.displayName || subsOnly.username}.<Link to={`/u/${subsOnly.username}`} className="btn-primary !py-2">Subscribe</Link></div>}
        {open.draft && open.policy?.mode === 'PAID' && <p className="text-xs text-muted my-2">This creator charges {open.policy.pricePoints} pts to start a conversation (free for subscribers). You'll be asked to confirm when you send.</p>}
        {open.draft && open.policy?.mode === 'SUBSCRIBERS' && <p className="text-xs text-muted my-2">Only subscribers can message this creator.</p>}
        {open.accepted === false && open.requestedBy !== user.id && <div className="card !p-3 my-2 text-sm flex items-center justify-between gap-2">Message request <button className="btn-primary !py-2" onClick={() => act('accept')}>Accept</button></div>}
        <div className="flex-1 overflow-y-auto py-4 space-y-2">
          {hasMore && <button className="btn-ghost !py-1.5 mx-auto block" onClick={loadEarlier}>Load earlier messages</button>}
          {msgs.length === 0 && <Empty>Say hi 👋</Empty>}
          {msgs.map((m) => { const mine = m.senderId === user.id; const rp = m.replyTo && byId[m.replyTo]; const grouped = {}; (m.reactions || []).forEach((r) => { grouped[r.emoji] = (grouped[r.emoji] || 0) + 1; });
            if (m.deletedForAll) return <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><p className="text-xs italic text-muted border border-line rounded-card px-3 py-2 flex items-center gap-1"><Ban size={12} />{mine ? 'You deleted this message' : 'This message was deleted'}</p></div>;
            return <div key={m._id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <div className={`relative max-w-[82%] px-3 py-2 rounded-card text-sm break-words space-y-1 ${mine ? 'bg-violet text-white' : 'bg-card2'} ${m.pending ? 'opacity-60' : ''} ${m.failed ? 'ring-1 ring-bad' : ''}`} onDoubleClick={() => setReact(react === m._id ? null : m._id)}>
                {rp && <p className="text-xs opacity-70 border-l-2 border-white/40 pl-2 truncate">{rp.deletedForAll ? 'Deleted message' : rp.locked ? 'Paid message' : rp.text || 'Attachment'}</p>}
                {m.locked ? <div className="space-y-2"><p className="flex items-center gap-1"><Lock size={14} /> {m.text || 'Paid message'}</p>{!mine && <button className="btn-primary !py-2 w-full" onClick={() => unlock(m)}>Unlock · {m.price} pts</button>}</div>
                  : <>{m.mediaId && <MediaBubble m={m} />}{m.paidText && <p className="bg-black/20 rounded p-2">{m.paidText}</p>}{m.text && !m.paidText && <p>{m.text}</p>}{m.price > 0 && mine && <p className="text-[10px] opacity-70">Paid · {m.price} pts</p>}</>}
                {react === m._id && <div className="absolute -top-9 bg-card border border-line rounded-full px-2 py-1 flex gap-1 z-10">{EMOJI.map((e) => <button key={e} onClick={() => reactTo(m, e)}>{e}</button>)}</div>}</div>
              {Object.keys(grouped).length > 0 && <div className="flex gap-1 -mt-1 text-xs bg-card border border-line rounded-full px-2 py-0.5">{Object.entries(grouped).map(([e, n]) => <span key={e}>{e}{n > 1 && n}</span>)}</div>}
              <span className="relative text-[10px] text-muted mt-0.5 flex items-center gap-1">{m.failed ? 'Failed to send' : m.pending ? 'Sending…' : ago(m.createdAt)}{mine && m === lastMine && seen && !m.pending ? ' · Seen' : ''}
                {!m.pending && !m.failed && <button aria-label="Message options" aria-expanded={msgMenu === m._id} className="p-1 text-ink2" onClick={() => setMsgMenu(msgMenu === m._id ? null : m._id)}><MoreVertical size={14} /></button>}
                {msgMenu === m._id && <div className={`absolute z-20 bottom-full mb-1 ${mine ? 'right-0' : 'left-0'} w-48 bg-card2 border border-line rounded-btn text-sm text-ink overflow-hidden animate-fade`}>
                  <button className="block w-full text-left px-3 py-2 hover:bg-line" onClick={() => { setReply(m); setMsgMenu(null); }}>Reply</button>
                  <button className="block w-full text-left px-3 py-2 hover:bg-line" onClick={() => { setReact(m._id); setMsgMenu(null); }}>React</button>
                  <button className="block w-full text-left px-3 py-2 hover:bg-line flex items-center gap-2" onClick={() => delMsg(m, 'me')}><Trash2 size={14} />Delete for me</button>
                  {mine && <button className="block w-full text-left px-3 py-2 hover:bg-line text-bad flex items-center gap-2" onClick={() => delMsg(m, 'everyone')}><Trash2 size={14} />Delete for everyone</button>}</div>}</span></div>; })}
          {typing && <div className="bg-card2 w-14 px-3 py-2 rounded-card text-muted tracking-widest animate-pulse">•••</div>}<div ref={bottom} /></div>
        <Err>{err}</Err>
        {reply && <div className="text-xs bg-card2 rounded-t-btn px-3 py-2 flex justify-between"><span className="truncate">Replying to: {reply.locked ? 'Paid message' : reply.text || 'Attachment'}</span><button onClick={() => setReply(null)} aria-label="Cancel reply">×</button></div>}
        {rec ? <div className="flex items-center gap-3 pt-2 animate-fade"><button className="btn-ghost !px-3 text-bad" onClick={discardRec} aria-label="Cancel recording"><Trash2 size={18} /></button><span className="flex-1 text-bad animate-pulse">● Recording… {Math.floor(recSec / 60)}:{String(recSec % 60).padStart(2, '0')}</span><button className="btn-primary" onClick={stopRec} aria-label="Finish and send"><Send size={16} /></button></div> :
        <form onSubmit={send} className="flex gap-2 pt-2 items-center"><input ref={fileRef} type="file" hidden accept="image/*,video/*" onChange={(e) => { stage(e.target.files[0]); e.target.value = ''; }} />
          <button type="button" className="btn-ghost !px-3" aria-label="Attach photo or video" disabled={up} onClick={() => fileRef.current.click()}><Paperclip size={18} /></button>
          <input className="input" value={text} onChange={(e) => onType(e.target.value)} placeholder="Message…" aria-label="Message" autoComplete="off" />
          {text.trim() ? <button className="btn-primary">Send</button> : <button type="button" className="btn-ghost !px-3" aria-label="Record voice message" onClick={startRec}><Mic size={18} /></button>}
          {user.accountMode === 'CREATOR' && <button type="button" className="btn-ghost !px-3" aria-label="Send paid message" onClick={() => setPaid(true)}>💰</button>}</form>}</>}
      <Modal open={paid} onClose={() => setPaid(false)} title="Paid message"><div className="space-y-3"><input className="input" placeholder="Teaser the buyer sees first" value={pf.teaser} onChange={(e) => setPf({ ...pf, teaser: e.target.value })} /><textarea className="input min-h-[90px]" placeholder="Hidden message (revealed after payment)" value={pf.paidText} onChange={(e) => setPf({ ...pf, paidText: e.target.value })} /><label className="block text-sm">Price (points)<input type="number" min={1} className="input mt-1" value={pf.price} onChange={(e) => setPf({ ...pf, price: e.target.value })} /></label><button className="btn-primary w-full" disabled={!pf.paidText} onClick={sendPaid}>Send · {pf.price} pts</button><p className="text-xs text-muted">To sell a photo, video or voice note, just attach it: you will be asked whether it is free or paid.</p></div></Modal>
    {pricing && <PricePrompt title={pricing.file.type.startsWith('audio') ? 'Voice message: free or paid?' : 'Free or paid?'} noun={pricing.file.type.startsWith('audio') ? 'this voice message' : 'this file'} defaultPrice={user.services?.paidVoice?.pricePoints || 3} onClose={() => setPricing(null)} onDone={({ price }) => { const f = pricing.file; setPricing(null); sendFile(f, price > 0 ? { price } : {}); }} />}
    </div>; }

  return <div className="space-y-4"><h1 className="text-3xl font-bold">Messages</h1>
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist">{baseCats(creator).map(([k, l]) => <button key={k} role="tab" aria-selected={cat === k} onClick={() => setCat(k)} className={`chip ${cat === k ? 'bg-violet border-violet' : 'border-line text-ink2'}`}>{l}</button>)}
      {labels.map((l) => <span key={l._id} className={`chip flex items-center gap-1 ${cat === `label:${l._id}` ? 'bg-pink/80 border-pink' : 'border-line text-ink2'}`}><button role="tab" aria-selected={cat === `label:${l._id}`} onClick={() => setCat(`label:${l._id}`)}>{l.name}</button><button aria-label={`Delete category ${l.name}`} className="text-muted hover:text-bad leading-none" onClick={() => delLabel(l)}>×</button></span>)}
      <span className="chip border-dashed border-line flex items-center gap-1"><input className="bg-transparent w-24 text-sm outline-none placeholder:text-muted" placeholder="+ New category" value={newLabel} maxLength={24} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addLabel()} aria-label="New category name" /></span></div><Err>{err}</Err>
    {convQ.isError ? <Err>{convQ.error.message}</Err> : !list ? <Skeleton className="h-40" /> : list.length === 0 ? <Empty>No conversations here yet.</Empty> :
      <ul className="space-y-2">{list.map((c) => { const o = other(c); return <li key={c._id}><button onClick={() => setOpen(c)} className="card !p-3 w-full text-left flex items-center gap-3">
        <span className="relative"><Avatar user={o} />{(presence?.[o._id] ?? c.online) && <i className="absolute bottom-0 right-0 w-3 h-3 bg-ok rounded-full ring-2 ring-card" />}</span>
        <span className="min-w-0 flex-1"><span className="flex justify-between"><b className="truncate">{o.displayName || o.username}</b><span className="text-xs text-muted">{c.lastMessageAt && ago(c.lastMessageAt)}</span></span><span className={`block truncate text-sm ${c.unreadCount ? 'text-ink font-medium' : 'text-ink2'}`}>{c.lastMessageText}</span></span>
        {cat === 'archived' && <span role="button" tabIndex={0} className="chip border-line text-xs" onClick={async (e) => { e.stopPropagation(); await api(`/messages/${c._id}/unarchive`, { method: 'POST' }); toast('Moved back to your inbox'); loadList(); }}>Unarchive</span>}{c.unreadCount > 0 && <span className="bg-pink text-[11px] font-bold rounded-full min-w-[20px] h-5 grid place-items-center px-1">{c.unreadCount}</span>}</button></li>; })}</ul>}</div>;
}
