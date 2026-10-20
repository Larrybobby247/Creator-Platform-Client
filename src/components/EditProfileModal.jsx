import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera } from 'lucide-react';
import { Modal, Avatar, Err, Skeleton } from './ui.jsx';
import { api } from '../lib/api';
import { get } from '../lib/query.js';
import { shrinkImage } from '../lib/image.js';
import { useAuth } from '../context/Auth.jsx';
import { useLive } from '../context/Live.jsx';

export default function EditProfileModal({ open, onClose }) {
  const { refresh } = useAuth(); const { toast } = useLive(); const qc = useQueryClient();
  const q = useQuery({ queryKey: ['me'], queryFn: get('/me'), enabled: open, staleTime: 0 }); const me = q.data?.me;
  const [f, setF] = useState({}); const [username, setUsername] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { if (me) { setF({ displayName: me.displayName || '', bio: me.bio || '', location: me.location || '', gender: me.gender || '', age: me.age || '' }); setUsername(me.username); } }, [me?.id, open]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const upload = async (kind, file) => { if (!file) return; const fd = new FormData(); fd.append('file', await shrinkImage(file, kind === 'avatar' ? 320 : 1400)); try { await api(`/me/${kind}`, { method: 'POST', form: fd }); await refresh(); qc.invalidateQueries({ queryKey: ['me'] }); qc.invalidateQueries({ queryKey: ['profile'] }); toast(kind === 'avatar' ? 'Photo updated' : 'Cover updated'); } catch (e) { setErr(e.message); } };
  const save = async () => { setBusy(true); setErr('');
    try {
      const body = { displayName: f.displayName, bio: f.bio, location: f.location }; if (f.gender) body.gender = f.gender; if (f.age) body.age = Number(f.age);
      await api('/me', { method: 'PATCH', body });
      if (username.toLowerCase() !== me.username) await api('/me/username', { method: 'PATCH', body: { username } });
      await refresh(); qc.invalidateQueries({ queryKey: ['me'] }); qc.invalidateQueries({ queryKey: ['profile'] }); toast('Profile saved'); onClose();
    } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return <Modal open={open} onClose={onClose} title="Edit profile">
    {!me ? <Skeleton className="h-60" /> : <div className="space-y-3">
      {me.coverUrl ? <img src={me.coverUrl} alt="" className="h-24 w-full object-cover rounded-card" /> : <div className="h-24 rounded-card bg-gradient-to-r from-violet/50 to-pink/40" />}
      <div className="flex items-center gap-3"><Avatar user={me} size={64} /><label className="btn-ghost !py-2 cursor-pointer"><Camera size={16} />Photo<input type="file" accept="image/*" hidden onChange={(e) => upload('avatar', e.target.files[0])} /></label><label className="btn-ghost !py-2 cursor-pointer"><Camera size={16} />Cover<input type="file" accept="image/*" hidden onChange={(e) => upload('cover', e.target.files[0])} /></label></div>
      <label className="block text-sm">Display name<input className="input mt-1" value={f.displayName} onChange={set('displayName')} maxLength={50} /></label>
      <label className="block text-sm">Username<input className="input mt-1" value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} minLength={3} maxLength={24} /><span className="text-xs text-muted">Letters, numbers and underscores. You can change it once every 7 days.</span></label>
      <label className="block text-sm">Bio<textarea className="input mt-1" value={f.bio} onChange={set('bio')} maxLength={500} /></label>
      <label className="block text-sm">Location<input className="input mt-1" value={f.location} onChange={set('location')} maxLength={60} /></label>
      <div className="grid grid-cols-2 gap-2"><label className="block text-sm">Gender<select className="input mt-1" value={f.gender} onChange={set('gender')}><option value="">Prefer not to say</option><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option></select></label>
        <label className="block text-sm">Age<input type="number" min={18} max={120} className="input mt-1" value={f.age} onChange={set('age')} placeholder="18+" /></label></div>
      <Err>{err}</Err><button className="btn-primary w-full" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save profile'}</button></div>}</Modal>;
}
