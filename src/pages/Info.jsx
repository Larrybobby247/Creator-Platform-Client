import { useState } from 'react';
import { PublicPage } from '../components/PublicShell.jsx';
import { Err } from '../components/ui.jsx';
import { api } from '../lib/api';
import { usePlatform } from '../lib/platform.js';

const Doc = ({ title, children, draft }) => <PublicPage><article className="max-w-3xl mx-auto px-4 py-10 space-y-4 text-ink2 [&_h2]:text-ink [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6">
  <h1 className="text-3xl font-bold text-ink">{title}</h1>
  {draft && <p className="card !p-3 text-warn text-sm">Draft template. Have a qualified Nigerian lawyer review and adapt it (including NDPR requirements) before launch.</p>}{children}</article></PublicPage>;

export const About = () => { const p = usePlatform(); return <Doc title="About us">
  <p>{p.name} is a social platform for Nigerian creators and their supporters. Fans follow, chat, unlock exclusive content and send gifts. Creators build an audience and earn from it.</p>
  <h2>How points work</h2><p>Points are in-app credit. You buy them with naira (1 point = ₦100) and spend them inside the platform. Points are not cash and cannot be withdrawn. Creators earn from sales and can request a withdrawal of their earnings, after the platform fee.</p>
  <h2>Our principles</h2><p>Clear pricing, protected paid content, verified reviews and real-time communication. We keep creator earnings separate from user points so everything stays auditable.</p>
</Doc>; };

export function Contact() {
  const [f, setF] = useState({}); const [done, setDone] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await api('/contact', { method: 'POST', body: f }); setDone(true); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return <PublicPage><div className="max-w-xl mx-auto px-4 py-10"><h1 className="text-3xl font-bold">Contact us</h1><p className="text-ink2 mt-2">Questions, feedback or support? Send us a message.</p>
    {done ? <div className="card mt-6 text-ok">Thanks! We received your message and will reply by email.</div> :
      <form onSubmit={submit} className="card mt-6 space-y-3">
        <label className="block text-sm">Name<input className="input mt-1" required minLength={2} onChange={set('name')} /></label>
        <label className="block text-sm">Email<input type="email" className="input mt-1" required onChange={set('email')} /></label>
        <label className="block text-sm">Message<textarea className="input mt-1 min-h-[120px]" required minLength={10} onChange={set('message')} /></label>
        <Err>{err}</Err><button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button></form>}</div></PublicPage>;
}

export const Terms = () => <Doc title="Terms & Conditions" draft>
  <p>Last updated: October 2026. By creating an account you agree to these terms.</p>
  <h2>1. Eligibility</h2><p>You must be at least 18 years old. You are responsible for keeping your login secure.</p>
  <h2>2. Points</h2><p>Points are in-app credit purchased with naira at the published rate. They are for use on the platform only, are not cash, and cannot be transferred or withdrawn. Refunds follow the rules shown at purchase and applicable law.</p>
  <h2>3. Creators and earnings</h2><p>Creators earn from sales after the platform fee shown in their dashboard. Withdrawals are processed after review and may require identity verification.</p>
  <h2>4. Content</h2><p>You own your content and grant us the licence needed to host and show it. You must not post unlawful, abusive, infringing or non-consensual content. We may remove content and suspend accounts that break these rules.</p>
  <h2>5. Innercircle</h2><p>Innercircle bookings are arranged between adults who choose to meet. The platform is not a party to any meeting, and you are responsible for your own safety and compliance with the law.</p>
  <h2>6. Disputes and termination</h2><p>You can report content or bookings. We may suspend or end accounts for breaches. Nigerian law governs these terms.</p>
  <h2>7. Contact</h2><p>Use the Contact page for any questions.</p>
</Doc>;

export const Privacy = () => <Doc title="Privacy Policy" draft>
  <p>Last updated: October 2026. This explains what we collect and why.</p>
  <h2>What we collect</h2><p>Account details (username, email, optional Google profile basics), content you post, messages, transactions, and technical data such as device and log information.</p>
  <h2>Identity verification</h2><p>Creators who enable Innercircle complete identity verification with a third-party provider. We store only the verification status and provider reference, never your BVN.</p>
  <h2>How we use data</h2><p>To run the service, process payments and payouts, prevent fraud and abuse, send notifications you opted into, and improve the product.</p>
  <h2>Sharing</h2><p>We share data with payment, verification and hosting providers who process it for us, and when the law requires. We do not sell personal data.</p>
  <h2>Your rights</h2><p>You can access, correct or delete your data, and withdraw consent, by contacting us. We keep records we are legally required to retain, such as financial transactions.</p>
  <h2>Security</h2><p>Private notes and messages are only visible to participants. Paid media is protected server-side. No system is perfectly secure, so please use a strong password.</p>
</Doc>;
