import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { keys } from '../lib/query.js';
import { Paperclip, Mic, Send, Lock, Trash2, MoreVertical, X as XIcon, Play, Ban, Pin, Archive, Check, CornerUpLeft, UserX, ArrowDown, Pencil } from 'lucide-react';
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
import { StoryViewer } from '../components/Stories.jsx';
import { useUnwrap, UnwrapOverlay } from '../components/Unwrap.jsx';

// Categories depend on the account: "Subscribers" only exists for creators. Everyone can add their own categories on top.
const baseCats = (creator) => [['all', 'All'], ['unread', 'Unread'], ['creators', 'Creators'], ['users', 'People'], ...(creator ? [['subscribers', 'Subscribers']] : []), ['requests', 'Requests'], ['paid', 'Paid'], ['archived', 'Archived']];
const EMOJI = ['❤️', '👍', '😂', '😮', '🔥'];

import { statusBg } from '../lib/statusBg.js';
// A small picture of the status while it is still live (a photo, or a frame about a second into a video). Once the status has expired or been
// deleted the server refuses the media, so it falls back to the camera / film icon automatically.
function StoryThumb({ r }) {
  const live = !r.expiresAt || new Date(r.expiresAt) > new Date();
  const q = useQuery({ queryKey: ['story-media', r.storyId], queryFn: get(`/stories/${r.storyId}/media`), enabled: r.kind !== 'TEXT' && !!r.hasMedia && live, staleTime: 4 * 60_000, retry: false });
  const url = live && !q.isError ? q.data?.url : null;
  if (r.kind === 'TEXT') return <span className="text-[9px] font-bold text-white px-1 line-clamp-3 break-words text-center leading-tight">{(r.text || '').slice(0, 24)}</span>;
  if (url) return r.kind === 'VIDEO'
    ? <><video src={`${url}#t=1`} preload="metadata" muted playsInline className="absolute inset-0 w-full h-full object-cover pointer-events-none" /><span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 grid place-items-center"><Play size={8} fill="white" /></span></>
    : <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />;
  return <span className="text-lg">{r.kind === 'VIDEO' ? '🎬' : '📷'}</span>;
}
// The status a message replies to, quoted above the message (like WhatsApp). Tap it to open that status.
function StoryRef({ r, mine, meId, onOpen }) {
  const theirs = String(r.authorId) !== String(meId); // the status belongs to the other person
  return <button type="button" onClick={(e) => { e.stopPropagation(); onOpen?.(r); }} className="rounded-btn overflow-hidden bg-black/25 flex border-l-4 border-pink max-w-full w-full text-left active:bg-black/40" aria-label="Open this status">
    <div className="min-w-0 flex-1 px-2.5 py-1.5"><p className="text-[11px] font-semibold text-pink">{mine && theirs ? 'You replied to their status' : !mine && !theirs ? 'Replied to your status' : 'Status'}</p>
      <p className="text-xs opacity-80 truncate">{r.kind === 'TEXT' ? (r.text || 'Status') : r.kind === 'VIDEO' ? '🎬 Video status' : '📷 Photo status'}{r.kind !== 'TEXT' && r.text ? ` · ${r.text}` : ''}</p></div>
    <div className={`relative w-14 min-h-[3rem] shrink-0 grid place-items-center overflow-hidden ${r.kind === 'TEXT' ? statusBg(r.bg).className : 'bg-black/40'}`} style={r.kind === 'TEXT' ? statusBg(r.bg).style : undefined}><StoryThumb r={r} /></div></button>;
}
// Drag a message to the right to reply to it (touch / pen; on a mouse use the ⋮ menu). Vertical scrolling is untouched.
function SwipeRow({ onReply, disabled, className = '', children }) {
  const st = useRef(null); const dxRef = useRef(0); const [dx, setDx] = useState(0);
  const down = (e) => { if (disabled || e.pointerType === 'mouse' || e.target.closest?.('audio,video,input,textarea')) return; st.current = { x: e.clientX, y: e.clientY, lock: null, buzzed: false }; };
  const move = (e) => { const x = st.current; if (!x) return; const mx = e.clientX - x.x, my = e.clientY - x.y;
    if (!x.lock && (Math.abs(mx) > 10 || Math.abs(my) > 10)) x.lock = mx > 0 && Math.abs(mx) > Math.abs(my) * 1.4 ? 'x' : 'y';
    if (x.lock === 'x') { const d = Math.min(mx, 110); const eased = d > 60 ? 60 + (d - 60) * 0.3 : d; dxRef.current = eased; setDx(eased); if (eased >= 56 && !x.buzzed) { x.buzzed = true; navigator.vibrate?.(12); } } };
  const end = () => { const x = st.current; st.current = null; const fire = x?.lock === 'x' && dxRef.current >= 56; dxRef.current = 0; setDx(0); if (fire) onReply(); };
  return <div className="relative touch-pan-y" onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
    <span aria-hidden className="absolute left-1 top-1/2 w-8 h-8 rounded-full bg-card2 grid place-items-center text-violet-light pointer-events-none" style={{ opacity: Math.min(1, dx / 36), transform: `translateY(-50%) scale(${0.6 + (Math.min(dx, 56) / 56) * 0.5})` }}><CornerUpLeft size={16} /></span>
    <div className={className} style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dx ? 'none' : 'transform .2s ease' }}>{children}</div></div>;
}
// Emoji bottom sheet for reactions: a bigger grid, plus a box that takes whatever emoji you pick on your phone's own emoji keyboard.
const MORE_EMOJI = '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😜 🤪 🤗 🤭 🤔 😐 😏 😒 🙄 😬 😌 😔 😴 😷 🥵 🥶 😎 🤓 😕 😟 😮 😲 😳 🥺 😢 😭 😱 😤 😡 🤬 💀 👻 🙈 🙊 💋 💯 🔥 ✨ 🎉 🎁 💎 👑 🌹 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 💕 💞 👍 👎 👏 🙌 🙏 💪 🤝 👀 🫶 🤞 ✌️ 👌 🤌 🐉 🍑 🍆 💦 😈'.split(' ');
const pickEmoji = (t) => { const parts = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(t)].map((x) => x.segment) : Array.from(t); return parts.find((g) => /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u.test(g)) || null; };
function EmojiSheet({ onPick, onClose }) {
  const [v, setV] = useState('');
  return <div className="fixed inset-0 z-[60] bg-black/50 animate-fade" onClick={onClose}>
    <div className="absolute inset-x-0 bottom-0 mx-auto max-w-3xl bg-card border-t border-line rounded-t-modal p-3 space-y-2 animate-sheet" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2"><input value={v} onChange={(e) => { const e1 = pickEmoji(e.target.value); if (e1) onPick(e1); else setV(e.target.value.slice(0, 2)); }} className="input" placeholder="Tap here, then use your keyboard’s 😊 emoji" aria-label="Type an emoji with your keyboard" autoComplete="off" /><button className="btn-ghost !px-3" onClick={onClose} aria-label="Close"><XIcon size={18} /></button></div>
      <div className="grid grid-cols-8 gap-1 max-h-52 overflow-y-auto">{MORE_EMOJI.map((e) => <button key={e} onClick={() => onPick(e)} className="text-2xl p-1 rounded hover:bg-card2 active:scale-75 transition" aria-label={`React ${e}`}>{e}</button>)}</div></div></div>;
}
// A paid message. Locked photo/video: a very blurry teaser (a tiny thumbnail the server made, never the real file) with the unlock button on top.
// When it is unlocked the gift-wrap animation plays. For the creator who sent it, the label turns green with a ✓ as soon as someone has paid.
function PaidBody({ m, mine, onUnlock }) {
  const wrap = useUnwrap(!!m.locked); const media = ['IMAGE', 'VIDEO', 'VOICE'].includes(m.type);
  if (m.locked && media) return <div className="space-y-1"><div className="relative w-52 max-w-full h-44 rounded-btn overflow-hidden bg-gradient-to-br from-violet/60 to-pink/50">
      {m.blurPreview && <img src={m.blurPreview} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-125 blur-xl" />}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 grid place-items-center p-2">{mine ? <span className="flex items-center gap-1 text-xs font-semibold bg-black/50 rounded-full px-3 py-1.5"><Lock size={12} />{m.price} pts</span> : <button className="btn-primary unlock-glow !py-2 !px-4 shadow-lg" onClick={onUnlock}><Lock size={14} />Unlock · {m.price} pts</button>}</div></div>{m.text && <p>{m.text}</p>}</div>;
  if (m.locked) return <div className="space-y-2"><p className="flex items-center gap-1"><Lock size={14} /> {m.text || 'Paid message'}</p>{!mine && <button className="btn-primary unlock-glow !py-2 w-full" onClick={onUnlock}>Unlock · {m.price} pts</button>}</div>;
  return <div className={`relative space-y-1 ${wrap ? 'overflow-hidden rounded-btn min-h-[140px]' : ''}`}>
    <div className={`space-y-1 ${wrap ? 'unwrap-reveal' : ''}`}>{m.mediaId && <MediaBubble m={m} />}{m.paidText && <p className="bg-black/20 rounded p-2">{m.paidText}</p>}{m.text && !m.paidText && <p>{m.text}</p>}</div>
    {wrap && <UnwrapOverlay />}
    {m.price > 0 && mine && <p className="text-[10px]"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${m.paidCount > 0 ? 'bg-black/40 text-ok' : 'bg-black/25 text-white/80'}`}>{m.paidCount > 0 && <Check size={11} strokeWidth={3} />}Paid</span> <span className="opacity-70">· {m.price} pts</span></p>}</div>;
}
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
  const [editing, setEditing] = useState(null); const [flash, setFlash] = useState(null); const [showDown, setShowDown] = useState(false); const listRef = useRef(null); const atBottom = useRef(true); const knownRef = useRef(null); const newestRef = useRef(0);
  const [more, setMore] = useState(null); const [burst, setBurst] = useState(null); const [storyView, setStoryView] = useState(null); const [sheet, setSheet] = useState(null); const [topMenu, setTopMenu] = useState(false); const lp = useRef({ t: null, fired: false});
  const [rec, setRec] = useState(null); const [recSec, setRecSec] = useState(0); const [pricing, setPricing] = useState(null); const [msgMenu, setMsgMenu] = useState(null); const [paid, setPaid] = useState(false); const [pf, setPf] = useState({ teaser: '', paidText: '', price: 3 }); const [up, setUp] = useState(false); const cancelRec = useRef(false);
  const bottom = useRef(); const typingTimer = useRef(); const lastTyping = useRef(0); const fileRef = useRef(); const recRef = useRef();
  const openRef = useRef(null); openRef.current = open;
  const other = (c) => c.participants.find((p) => p._id !== user.id) || c.participants[0];

  const loadList = useCallback(() => qc.invalidateQueries({ queryKey: ['conversations'] }), [qc]);
  useEffect(() => { const to = sp.get('to'); if (!to) return;
    api('/messages/conversations?category=all').then(async (d) => { const c = d.items.find((x) => x.participants.some((p) => p._id === to));
      if (c) return setOpen(c); const u = await api(`/creators/${to}`).catch(() => null); if (u) setOpen({ draft: true, policy: u.creator.dmPolicy && u.creator.accountMode === 'CREATOR' ? u.creator.dmPolicy : null, participants: [{ _id: user.id }, { _id: to, username: u.creator.username, displayName: u.creator.displayName, avatarUrl: u.creator.avatarUrl }] }); }); }, [sp]);
  const openConv = useCallback(async (c) => { knownRef.current = null; atBottom.current = true; if (c.draft) { setMsgs([]); return; } const d = await api(`/messages/${c._id}`); knownRef.current = null; setMsgs(d.messages); setHasMore(!!d.hasMore); setSeen(false); refreshCounts(); loadList(); }, []);
  useEffect(() => { if (open) { setTab('chat'); setReply(null); setEditing(null); setShowDown(false); openConv(open); } }, [open?._id]);
  // Remember which messages were already on screen: only a message that arrives AFTER that gets the pop-in animation (not the history, not older pages).
  useEffect(() => { const k = new Set(); let newest = 0; for (const m of msgs) { k.add(m._id); if (m.clientId) k.add(m.clientId); const t = new Date(m.createdAt).getTime(); if (t > newest) newest = t; } if (knownRef.current === null || msgs.length) { knownRef.current = k; newestRef.current = newest; } }, [msgs]);
  // Only the message list scrolls: the page behind is locked while a chat is open and we scroll the list itself (scrollIntoView used to scroll the whole page and push the header away).
  useEffect(() => { const el = listRef.current; if (!el) return; const last = msgs[msgs.length - 1]; if (atBottom.current || last?.senderId === user.id) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }, [msgs.length, typing]);
  const onListScroll = (e) => { const el = e.currentTarget; const away = el.scrollHeight - el.scrollTop - el.clientHeight; atBottom.current = away < 120; setShowDown(away > 320); };
  const toBottom = () => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  // Tap a quoted reply: scroll to the original message and flash it for a moment (like WhatsApp). Loads older messages first if it is further up.
  const hasMoreRef = useRef(false); const loadEarlierRef = useRef(async () => {});
  const jumpTo = async (id) => { const find = () => listRef.current?.querySelector(`[data-mid="${id}"]`);
    let el = find(); for (let i = 0; !el && hasMoreRef.current && i < 8; i++) { await loadEarlierRef.current(); await new Promise((r) => setTimeout(r, 60)); el = find(); }
    if (!el) return toast('That message is no longer available.');
    const L = listRef.current; const top = el.getBoundingClientRect().top - L.getBoundingClientRect().top + L.scrollTop - L.clientHeight / 2 + el.offsetHeight / 2; L.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    setFlash(null); setTimeout(() => { setFlash(id); setTimeout(() => setFlash((f) => (f === id ? null : f)), 2200); }, 30); };
  useEffect(() => { if (!open) return; const prev = document.body.style.overflow; window.scrollTo(0, 0); document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, [!!open]);
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

  const loadEarlier = async () => { const first = msgs.find((m) => !m.pending); if (!first) return; const d = await api(`/messages/${open._id}?before=${encodeURIComponent(first.createdAt)}`); setMsgs((m) => [...d.messages, ...m]); setHasMore(!!d.hasMore); hasMoreRef.current = !!d.hasMore; };
  loadEarlierRef.current = loadEarlier; hasMoreRef.current = hasMore;
  const optimistic = (extra) => { const clientId = uid(); setMsgs((m) => [...m, { _id: clientId, clientId, pending: true, senderId: user.id, createdAt: new Date().toISOString(), ...extra }]); return clientId; };
  const settle = (clientId, m) => setMsgs((ms) => ms.map((x) => x.clientId === clientId ? { ...m, clientId } : x).filter((x, i, a) => a.findIndex((y) => y._id === x._id) === i));
  const fail = (clientId, e) => { setErr(e.message); setMsgs((ms) => ms.map((y) => y.clientId === clientId ? { ...y, failed: true, pending: false } : y)); };
  const afterDraft = async (o) => { if (open.draft) { const d = await api('/messages/conversations?category=all'); const c = d.items.find((x) => x.participants.some((p) => p._id === o._id)); c && setOpen(c); } loadList(); };

  // Creator messaging rules: pay-to-message (confirm, pay, retry) or subscribers-only (show how to subscribe).
  const dmGate = async (x, o) => {
    if (x.code === 'DM_PAYMENT_REQUIRED') { const price = x.data?.extra?.price; if (!(await ask({ title: `Pay to message ${o.displayName || o.username}?`, detail: 'A one-time fee opens the conversation. Subscribers message for free.', points: price, confirmLabel: 'Pay and send' }))) return false;
      try { await api('/messages/dm-access', { method: 'POST', body: { toUserId: o._id } }); window.dispatchEvent(new Event('wallet:changed')); return true; } catch (e) { setErr(e.code === 'INSUFFICIENT_POINTS' ? 'Not enough points. Top up in your wallet.' : e.message); return false; } }
    if (x.code === 'DM_SUBSCRIBERS_ONLY') { setSubsOnly(o); return false; } return null; };
  // Edit a sent text message: 15 minutes for everyone, 30 minutes for Pro creators (the server enforces it too).
  const editMins = creator && user.creatorPlan === 'PRO' ? 30 : 15;
  const canEdit = (m) => m.senderId === user.id && m.type === 'TEXT' && !m.price && !m.mediaId && !m.deletedForAll && !m.pending && !m.failed && Date.now() - new Date(m.createdAt).getTime() < editMins * 60_000;
  const startEdit = (m) => { setMsgMenu(null); setReply(null); setEditing({ id: m._id }); setText(m.text || ''); };
  const saveEdit = async (t) => { const id = editing.id; const prev = msgs.find((x) => x._id === id); if (prev && t === prev.text) { setEditing(null); setText(''); return; }
    try { const d = await api(`/messages/message/${id}/edit`, { method: 'POST', body: { text: t } }); setMsgs((ms) => ms.map((x) => (x._id === id ? { ...x, text: d.message.text, editedAt: d.message.editedAt } : x))); setEditing(null); setText(''); loadList(); } catch (x) { toast(x.message); if (x.code === 'EDIT_WINDOW') { setEditing(null); setText(''); } } };
  const send = async (e) => { e.preventDefault(); const t = text.trim(); if (!t) return; if (editing) return saveEdit(t); setText(''); setErr(''); const o = other(open); const replyTo = reply?._id; setReply(null);
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
  const reactTo = async (m, emoji) => { setReact(null); setMore(null); const had = m.reactions?.find((r) => r.userId === user.id)?.emoji === emoji;
    const apply = (rs) => setMsgs((ms) => ms.map((x) => x._id === m._id ? { ...x, reactions: rs } : x));
    apply([...(m.reactions || []).filter((r) => r.userId !== user.id), ...(had ? [] : [{ userId: user.id, emoji }])]); // instant, then confirmed by the server
    if (!had) { const k = Date.now(); setBurst({ id: m._id, emoji, k }); setTimeout(() => setBurst((b) => (b?.k === k ? null : b)), 1000); navigator.vibrate?.(10); }
    try { const d = await api(`/messages/message/${m._id}/react`, { method: 'POST', body: { emoji, remove: had } }); apply(d.reactions); } catch (x) { apply(m.reactions || []); toast(x.message); } };
  // Tap the status quoted in a message: open it in the status viewer, if it is still live.
  const openStory = async (r) => { try { const d = await api(`/stories/user/${r.authorId}`); const g = d.group; if (!g || !g.stories.some((x) => String(x._id) === String(r.storyId))) return toast('This status is no longer available.'); setStoryView({ group: { ...g, source: String(r.authorId) === user.id ? 'me' : g.source }, storyId: r.storyId }); } catch { toast('This status is no longer available.'); } };
  // Chat list actions (long-press a chat): pin, archive, block, delete one chat; delete all chats from the top menu.
  const pinLimit = creator && user.creatorPlan === 'PRO' ? 5 : 3;
  const pressStart = (c) => () => { lp.current.fired = false; clearTimeout(lp.current.t); lp.current.t = setTimeout(() => { lp.current.fired = true; navigator.vibrate?.(15); setSheet(c); }, 450); };
  const pressEnd = () => clearTimeout(lp.current.t);
  const sheetAct = async (kind) => { const c = sheet; if (!c) return; const o = other(c); setSheet(null);
    try {
      if (kind === 'pin') { const d = await api(`/messages/${c._id}/pin`, { method: 'POST' }); toast(d.pinned ? 'Chat pinned' : 'Chat unpinned'); }
      else if (kind === 'archive') { await api(`/messages/${c._id}/${cat === 'archived' ? 'unarchive' : 'archive'}`, { method: 'POST' }); toast(cat === 'archived' ? 'Moved back to your inbox' : 'Archived'); }
      else if (kind === 'block') { if (!(await confirm({ title: `Block @${o.username}?`, detail: 'You will no longer see each other’s posts or be able to message. You can unblock them in Settings.', confirmLabel: 'Block', danger: true }))) return; await api(`/block/${o._id}`, { method: 'POST' }); await api(`/messages/${c._id}/archive`, { method: 'POST' }).catch(() => {}); toast(`Blocked @${o.username}`); }
      else if (kind === 'delete') { if (!(await confirm({ title: 'Delete this chat?', detail: 'The conversation is removed from your list and your copy of its messages is cleared. The other person keeps theirs.', confirmLabel: 'Delete chat', danger: true }))) return; await api(`/messages/${c._id}/delete`, { method: 'POST' }); toast('Chat deleted'); }
      loadList(); refreshCounts();
    } catch (x) { toast(x.message); } };
  const deleteAll = async () => { setTopMenu(false); if (!(await confirm({ title: 'Delete all chats?', detail: 'Every conversation is removed from your list and your copy of all messages is cleared. Other people keep theirs. This cannot be undone.', confirmLabel: 'Delete all', danger: true }))) return; try { const d = await api('/messages/delete-all', { method: 'POST' }); toast(d.count ? 'All chats deleted' : 'Nothing to delete'); loadList(); refreshCounts(); } catch (x) { toast(x.message); } };
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
    // The open chat is its own full-screen panel (rendered into <body>, outside the scrolling page): the top bar with the name, Notes etc. is fixed, only the messages scroll.
    return createPortal(<div className="fixed inset-0 lg:left-60 z-40 bg-bg"><div className="mx-auto w-full max-w-3xl h-full flex flex-col px-4" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center gap-3 py-3 border-b border-divider shrink-0 bg-bg">
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
        <div className="relative flex-1 min-h-0"><div ref={listRef} onScroll={onListScroll} className="h-full overflow-y-auto overflow-x-hidden py-4 space-y-2">
          {hasMore && <button className="btn-ghost !py-1.5 mx-auto block" onClick={loadEarlier}>Load earlier messages</button>}
          {msgs.length === 0 && <Empty>Say hi 👋</Empty>}
          {msgs.map((m, i) => { const mine = m.senderId === user.id; const nx = msgs[i + 1]; const tail = !nx || nx.senderId !== m.senderId || nx.deletedForAll; const isNew = knownRef.current && !knownRef.current.has(m._id) && !(m.clientId && knownRef.current.has(m.clientId)) && new Date(m.createdAt).getTime() >= newestRef.current; const rp = m.replyTo && byId[m.replyTo]; const grouped = {}; (m.reactions || []).forEach((r) => { grouped[r.emoji] = (grouped[r.emoji] || 0) + 1; });
            if (m.deletedForAll) return <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><p className="text-xs italic text-muted border border-line rounded-card px-3 py-2 flex items-center gap-1"><Ban size={12} />{mine ? 'You deleted this message' : 'This message was deleted'}</p></div>;
            return <SwipeRow key={m._id} disabled={m.pending || m.failed} onReply={() => setReply(m)} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <div data-mid={m._id} className={`relative max-w-[82%] min-w-0 px-3 py-2 rounded-card text-sm break-words space-y-1 ${mine ? 'bg-violet text-white' : 'bg-card2'} ${tail ? (mine ? 'bub-tail-me' : 'bub-tail-them') : ''} ${isNew ? (mine ? 'bubble-pop-me' : 'bubble-pop-them') : ''} ${flash === m._id ? 'msg-flash' : ''} ${m.pending ? 'opacity-60' : ''} ${m.failed ? 'ring-1 ring-bad' : ''}`} onDoubleClick={() => setReact(react === m._id ? null : m._id)}>
                {m.storyRef && <StoryRef r={m.storyRef} mine={mine} meId={user.id} onOpen={openStory} />}
                {m.replyTo && <button type="button" onClick={(e) => { e.stopPropagation(); jumpTo(m.replyTo); }} className="block w-full text-left text-xs opacity-80 hover:opacity-100 border-l-2 border-white/50 bg-black/15 rounded-r pl-2 pr-1 py-1 truncate" aria-label="Go to the message you replied to">{!rp ? 'Original message' : rp.deletedForAll ? 'Deleted message' : rp.locked ? 'Paid message' : rp.text || 'Attachment'}</button>}
                {(m.locked || m.mediaId || m.paidText || m.price > 0) ? <PaidBody m={m} mine={mine} onUnlock={() => unlock(m)} /> : m.text && <p>{m.text}</p>}
                {burst?.id === m._id && <span key={burst.k} className="react-float" aria-hidden>{burst.emoji}</span>}
                {react === m._id && <div className={`absolute -top-10 ${mine ? 'right-0' : 'left-0'} max-w-[88vw] bg-card border border-line rounded-full px-2 py-1 flex gap-1 z-20 shadow-lg animate-pop`}>{EMOJI.map((e) => <button key={e} className="active:scale-75 transition" onClick={() => reactTo(m, e)}>{e}</button>)}<button className="w-6 h-6 rounded-full bg-card2 grid place-items-center text-sm leading-none" aria-label="More emoji" onClick={() => { setMore(m); setReact(null); }}>+</button></div>}</div>
              {Object.keys(grouped).length > 0 && <div className="flex gap-1 -mt-1 text-xs bg-card border border-line rounded-full px-2 py-0.5">{Object.entries(grouped).map(([e, n]) => <span key={e} className={burst?.id === m._id && burst.emoji === e ? 'react-chip-pop inline-block' : ''}>{e}{n > 1 && n}</span>)}</div>}
              <span className="relative text-[10px] text-muted mt-0.5 flex items-center gap-1">{m.failed ? 'Failed to send' : m.pending ? 'Sending…' : <>{m.editedAt && <span className="italic">edited · </span>}{ago(m.createdAt)}</>}{mine && m === lastMine && seen && !m.pending ? ' · Seen' : ''}
                {!m.pending && !m.failed && <button aria-label="Message options" aria-expanded={msgMenu === m._id} className="p-1 text-ink2" onClick={() => setMsgMenu(msgMenu === m._id ? null : m._id)}><MoreVertical size={14} /></button>}
                {msgMenu === m._id && <div className={`absolute z-20 bottom-full mb-1 ${mine ? 'right-0' : 'left-0'} w-48 bg-card2 border border-line rounded-btn text-sm text-ink overflow-hidden animate-fade`}>
                  <button className="block w-full text-left px-3 py-2 hover:bg-line" onClick={() => { setReply(m); setMsgMenu(null); }}>Reply</button>
                  <button className="block w-full text-left px-3 py-2 hover:bg-line" onClick={() => { setReact(m._id); setMsgMenu(null); }}>React</button>
                  {canEdit(m) && <button className="block w-full text-left px-3 py-2 hover:bg-line flex items-center gap-2" onClick={() => startEdit(m)}><Pencil size={14} />Edit</button>}
                  <button className="block w-full text-left px-3 py-2 hover:bg-line flex items-center gap-2" onClick={() => delMsg(m, 'me')}><Trash2 size={14} />Delete for me</button>
                  {mine && <button className="block w-full text-left px-3 py-2 hover:bg-line text-bad flex items-center gap-2" onClick={() => delMsg(m, 'everyone')}><Trash2 size={14} />Delete for everyone</button>}</div>}</span></SwipeRow>; })}
          {typing && <div className="bg-card2 w-14 px-3 py-2 rounded-card text-muted tracking-widest animate-pulse">•••</div>}<div ref={bottom} /></div>
          {showDown && <button onClick={toBottom} aria-label="Scroll to the latest message" className="absolute bottom-3 right-2 w-10 h-10 rounded-full bg-card2 border border-line shadow-lg grid place-items-center text-ink hover:bg-line animate-pop"><ArrowDown size={18} /></button>}</div>
        <Err>{err}</Err>
        {editing && <div className="text-xs bg-card2 rounded-t-btn px-3 py-2 flex justify-between items-center"><span className="flex items-center gap-1.5 text-violet-light font-semibold"><Pencil size={12} />Editing message</span><button onClick={() => { setEditing(null); setText(''); }} aria-label="Cancel edit">×</button></div>}
        {reply && <div className="text-xs bg-card2 rounded-t-btn px-3 py-2 flex justify-between"><span className="truncate">Replying to: {reply.locked ? 'Paid message' : reply.text || 'Attachment'}</span><button onClick={() => setReply(null)} aria-label="Cancel reply">×</button></div>}
        {rec ? <div className="flex items-center gap-3 pt-2 animate-fade"><button className="btn-ghost !px-3 text-bad" onClick={discardRec} aria-label="Cancel recording"><Trash2 size={18} /></button><span className="flex-1 text-bad animate-pulse">● Recording… {Math.floor(recSec / 60)}:{String(recSec % 60).padStart(2, '0')}</span><button className="btn-primary" onClick={stopRec} aria-label="Finish and send"><Send size={16} /></button></div> :
        <form onSubmit={send} className="flex gap-2 pt-2 items-center"><input ref={fileRef} type="file" hidden accept="image/*,video/*" onChange={(e) => { stage(e.target.files[0]); e.target.value = ''; }} />
          <button type="button" className="btn-ghost !px-3" aria-label="Attach photo or video" disabled={up} onClick={() => fileRef.current.click()}><Paperclip size={18} /></button>
          <input className="input" value={text} onChange={(e) => onType(e.target.value)} placeholder="Message…" aria-label="Message" autoComplete="off" />
          {text.trim() ? <button className="btn-primary">{editing ? 'Save' : 'Send'}</button> : <button type="button" className="btn-ghost !px-3" aria-label="Record voice message" onClick={startRec}><Mic size={18} /></button>}
          {user.accountMode === 'CREATOR' && <button type="button" className="btn-ghost !px-3" aria-label="Send paid message" onClick={() => setPaid(true)}>💰</button>}</form>}</>}
      <Modal open={paid} onClose={() => setPaid(false)} title="Paid message"><div className="space-y-3"><input className="input" placeholder="Teaser the buyer sees first" value={pf.teaser} onChange={(e) => setPf({ ...pf, teaser: e.target.value })} /><textarea className="input min-h-[90px]" placeholder="Hidden message (revealed after payment)" value={pf.paidText} onChange={(e) => setPf({ ...pf, paidText: e.target.value })} /><label className="block text-sm">Price (points)<input type="number" min={1} className="input mt-1" value={pf.price} onChange={(e) => setPf({ ...pf, price: e.target.value })} /></label><button className="btn-primary w-full" disabled={!pf.paidText} onClick={sendPaid}>Send · {pf.price} pts</button><p className="text-xs text-muted">To sell a photo, video or voice note, just attach it: you will be asked whether it is free or paid.</p></div></Modal>
    {more && <EmojiSheet onPick={(e) => reactTo(more, e)} onClose={() => setMore(null)} />}
    {storyView && <StoryViewer groups={[storyView.group]} start={0} startStoryId={storyView.storyId} onClose={() => setStoryView(null)} />}
    {(react || msgMenu) && <div className="fixed inset-0 z-[15]" aria-hidden onClick={() => { setReact(null); setMsgMenu(null); }} onTouchStart={() => { setReact(null); setMsgMenu(null); }} />}
    {pricing && <PricePrompt title={pricing.file.type.startsWith('audio') ? 'Voice message: free or paid?' : 'Free or paid?'} noun={pricing.file.type.startsWith('audio') ? 'this voice message' : 'this file'} defaultPrice={user.services?.paidVoice?.pricePoints || 3} onClose={() => setPricing(null)} onDone={({ price }) => { const f = pricing.file; setPricing(null); sendFile(f, price > 0 ? { price } : {}); }} />}
    </div></div>, document.body); }

  return <div className="space-y-4"><div className="flex justify-between items-center relative"><h1 className="text-3xl font-bold">Messages</h1><button className="btn-ghost !px-3" onClick={() => setTopMenu(!topMenu)} aria-label="Message options" aria-expanded={topMenu}><MoreVertical size={18} /></button>{topMenu && <><div className="fixed inset-0 z-10" onClick={() => setTopMenu(false)} /><div className="absolute right-0 top-full mt-1 z-20 w-52 bg-card2 border border-line rounded-btn text-sm overflow-hidden animate-fade"><button className="block w-full text-left px-3 py-2.5 hover:bg-line text-bad flex items-center gap-2" onClick={deleteAll}><Trash2 size={14} />Delete all chats</button></div></>}</div>
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist">{baseCats(creator).map(([k, l]) => <button key={k} role="tab" aria-selected={cat === k} onClick={() => setCat(k)} className={`chip ${cat === k ? 'bg-violet border-violet' : 'border-line text-ink2'}`}>{l}</button>)}
      {labels.map((l) => <span key={l._id} className={`chip flex items-center gap-1 ${cat === `label:${l._id}` ? 'bg-pink/80 border-pink' : 'border-line text-ink2'}`}><button role="tab" aria-selected={cat === `label:${l._id}`} onClick={() => setCat(`label:${l._id}`)}>{l.name}</button><button aria-label={`Delete category ${l.name}`} className="text-muted hover:text-bad leading-none" onClick={() => delLabel(l)}>×</button></span>)}
      <span className="chip border-dashed border-line flex items-center gap-1"><input className="bg-transparent w-24 text-sm outline-none placeholder:text-muted" placeholder="+ New category" value={newLabel} maxLength={24} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addLabel()} aria-label="New category name" /></span></div><Err>{err}</Err>
    {convQ.isError ? <Err>{convQ.error.message}</Err> : !list ? <Skeleton className="h-40" /> : list.length === 0 ? <Empty>No conversations here yet.</Empty> :
      <><p className="text-xs text-muted -mt-2">Hold a chat to pin, archive, block or delete it.</p><ul className="space-y-2">{list.map((c) => { const o = other(c); return <li key={c._id}><button onClick={() => { if (lp.current.fired) { lp.current.fired = false; return; } setOpen(c); }} onPointerDown={pressStart(c)} onPointerUp={pressEnd} onPointerLeave={pressEnd} onPointerCancel={pressEnd} onContextMenu={(e) => { e.preventDefault(); setSheet(c); }} style={{ WebkitTouchCallout: 'none' }} className="card !p-3 w-full text-left flex items-center gap-3 select-none">
        <span className="relative"><Avatar user={o} />{(presence?.[o._id] ?? c.online) && <i className="absolute bottom-0 right-0 w-3 h-3 bg-ok rounded-full ring-2 ring-card" />}</span>
        <span className="min-w-0 flex-1"><span className="flex justify-between"><b className="truncate">{o.displayName || o.username}</b><span className="text-xs text-muted flex items-center gap-1">{c.pinned && <Pin size={12} className="text-violet-light" aria-label="Pinned" />}{c.lastMessageAt && ago(c.lastMessageAt)}</span></span><span className={`block truncate text-sm ${c.unreadCount ? 'text-ink font-medium' : 'text-ink2'}`}>{c.lastMessageText}</span></span>
        {cat === 'archived' && <span role="button" tabIndex={0} className="chip border-line text-xs" onClick={async (e) => { e.stopPropagation(); await api(`/messages/${c._id}/unarchive`, { method: 'POST' }); toast('Moved back to your inbox'); loadList(); }}>Unarchive</span>}{c.unreadCount > 0 && <span className="bg-pink text-[11px] font-bold rounded-full min-w-[20px] h-5 grid place-items-center px-1">{c.unreadCount}</span>}</button></li>; })}</ul></>}
    {sheet && (() => { const o = other(sheet); const pinned = list?.filter((c) => c.pinned).length || 0; const Row = ({ icon: I, label, sub, danger, onClick }) => <button className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-card2 ${danger ? 'text-bad' : ''}`} onClick={onClick}><I size={18} /><span className="flex-1">{label}{sub && <span className="block text-xs text-muted">{sub}</span>}</span></button>;
      return <div className="fixed inset-0 z-[60] bg-black/50 animate-fade" onClick={() => setSheet(null)}><div className="absolute inset-x-0 bottom-0 mx-auto max-w-md bg-card border-t border-line rounded-t-modal overflow-hidden animate-sheet" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Chat options">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-divider"><Avatar user={o} size={36} /><b className="truncate">{o.displayName || o.username}</b></div>
        <Row icon={Pin} label={sheet.pinned ? 'Unpin chat' : 'Pin chat'} sub={sheet.pinned ? '' : `${pinned} of ${pinLimit} pinned${pinLimit === 3 ? ' · Pro creators can pin 5' : ''}`} onClick={() => sheetAct('pin')} />
        <Row icon={Archive} label={cat === 'archived' ? 'Unarchive' : 'Archive'} onClick={() => sheetAct('archive')} />
        <Row icon={UserX} label={`Block @${o.username}`} danger onClick={() => sheetAct('block')} />
        <Row icon={Trash2} label="Delete chat" danger onClick={() => sheetAct('delete')} /></div></div>; })()}</div>;
}
