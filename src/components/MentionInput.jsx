import { useEffect, useRef, useState } from 'react';
import { Avatar } from './ui.jsx';
import { tokenize } from './RichText.jsx';
import { api } from '../lib/api';
// Text box that colours #hashtags and @mentions while you type, and suggests people (after @) and popular hashtags (after #).
export default function MentionInput({ value, onChange, placeholder, maxLength = 5000, disabled, minHeight = 120, label = 'Caption' }) {
  const ref = useRef(); const [sug, setSug] = useState(null); // { kind, q, start, items }
  const find = (text, caret) => { const m = /(^|[\s])([@#])([\p{L}\p{N}_]{0,30})$/u.exec(text.slice(0, caret)); return m ? { kind: m[2], q: m[3], start: caret - m[3].length - 1 } : null; };
  const onInput = (e) => { onChange(e.target.value); const f = find(e.target.value, e.target.selectionStart); setSug(f ? { ...f, items: [] } : null); };
  useEffect(() => {
    if (!sug || (sug.kind === '@' && sug.q.length < 2)) return; let dead = false;
    const t = setTimeout(async () => { try { const items = sug.kind === '@' ? (await api(`/search?q=${encodeURIComponent(sug.q)}`)).people.map((p) => ({ key: p.username, label: `@${p.username}`, user: p })) : (await api(`/hashtags?q=${encodeURIComponent(sug.q)}`)).tags.map((t) => ({ key: t.tag, label: `#${t.tag}`, count: t.count })); !dead && setSug((s) => (s && s.q === sug.q && s.kind === sug.kind ? { ...s, items } : s)); } catch { /* suggestions are optional */ } }, 180);
    return () => { dead = true; clearTimeout(t); };
  }, [sug?.kind, sug?.q]);
  const pick = (it) => { const el = ref.current; const caret = el.selectionStart; const text = `${value.slice(0, sug.start)}${it.label} ${value.slice(caret)}`; onChange(text); setSug(null); requestAnimationFrame(() => { const pos = sug.start + it.label.length + 1; el.focus(); el.setSelectionRange(pos, pos); }); };
  return <div className="relative">
    <div className="relative">
      <div aria-hidden className="input whitespace-pre-wrap break-words pointer-events-none" style={{ minHeight }}>{tokenize(value).map((x, i) => <span key={i} className={x.kind === 'tag' ? 'text-violet-light font-medium' : x.kind === 'mention' ? 'text-pink font-medium' : ''}>{x.t}</span>)}{'\n'}</div>
      <textarea ref={ref} aria-label={label} value={value} onChange={onInput} onKeyUp={(e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { const f = find(e.target.value, e.target.selectionStart); setSug(f ? { ...f, items: [] } : null); } }} onBlur={() => setTimeout(() => setSug(null), 150)} placeholder={placeholder} maxLength={maxLength} disabled={disabled}
        className="input absolute inset-0 w-full h-full resize-none overflow-hidden !bg-transparent !border-transparent !text-transparent caret-white placeholder:text-muted" />
    </div>
    {sug?.items?.length > 0 && <ul className="absolute z-30 left-0 right-0 mt-1 card !p-1 max-h-56 overflow-y-auto animate-fade" role="listbox">{sug.items.map((it) => <li key={it.key}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(it)} className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-card2 text-left text-sm">
      {it.user ? <><Avatar user={it.user} size={26} /><span className="font-medium">@{it.user.username}</span><span className="text-muted text-xs truncate">{it.user.displayName}</span></> : <><span className="text-violet-light font-medium">{it.label}</span><span className="text-muted text-xs ml-auto">{it.count} post{it.count === 1 ? '' : 's'}</span></>}</button></li>)}</ul>}
  </div>;
}
