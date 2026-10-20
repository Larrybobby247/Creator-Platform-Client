import { useEffect, useState } from 'react';
import { api } from '../lib/api';
// Private to the author. Never sent to the other participant.
export default function Notes({ conversationId }) {
  const [notes, setNotes] = useState([]); const [text, setText] = useState(''); const [editing, setEditing] = useState(null); const [err, setErr] = useState('');
  const load = () => api(`/conversations/${conversationId}/notes`).then((d) => setNotes(d.notes)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [conversationId]);
  const save = async () => { if (!text.trim()) return; setErr('');
    try { editing ? await api(`/notes/${editing}`, { method: 'PATCH', body: { text } }) : await api(`/conversations/${conversationId}/notes`, { method: 'POST', body: { text } });
      setText(''); setEditing(null); load(); } catch (e) { setErr(e.message); } };
  const del = async (id) => { if (confirm('Delete this note?')) { await api(`/notes/${id}`, { method: 'DELETE' }); load(); } };
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">🔒 Only you can see these notes.</p>
      <textarea className="input min-h-[96px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a private note…" aria-label="Private note" />
      {err && <p role="alert" className="text-bad text-sm">{err}</p>}
      <div className="flex gap-2"><button className="btn-primary" onClick={save}>{editing ? 'Update note' : 'Save note'}</button>
        {editing && <button className="btn-ghost" onClick={() => { setEditing(null); setText(''); }}>Cancel</button>}</div>
      {notes.length === 0 && <p className="text-ink2 text-sm">No notes yet.</p>}
      {notes.map((n) => (<div key={n._id} className="bg-card2 rounded-btn p-3 text-sm"><p className="whitespace-pre-wrap break-words">{n.text}</p>
        <div className="flex gap-3 mt-2 text-xs"><button className="text-violet-light" onClick={() => { setEditing(n._id); setText(n.text); }}>Edit</button><button className="text-bad" onClick={() => del(n._id)}>Delete</button></div></div>))}
    </div>
  );
}
