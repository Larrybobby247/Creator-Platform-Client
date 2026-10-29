import InstallApp from '../components/InstallApp.jsx';
import { Link } from 'react-router-dom';
import { PublicPage } from '../components/PublicShell.jsx';
import { Reveal, LineChart, BarChart, Donut, CountUp } from '../components/ui.jsx';
import { IlloSignup, IlloPoints, IlloUnlock, IlloEarn, HeroPhone } from '../components/Illustrations.jsx';

const steps = [[IlloSignup, '1. Join free', 'Sign up with email or Google. Everyone starts as a user; become a creator any time.'], [IlloPoints, '2. Buy points', 'Pay in naira. 1 point = ₦100. Points are in-app credit used across the platform.'], [IlloUnlock, '3. Unlock & support', 'Unlock exclusive posts, subscribe, send gifts, message creators.'], [IlloEarn, '4. Creators earn', 'Creators earn from every sale after the platform fee and withdraw to their bank.']];
const features = [['💬', 'Real-time messaging', 'Live chat with typing indicators, read receipts, private notes and smart inboxes.'], ['🔒', 'Exclusive content', 'Locked posts stay protected on the server until you unlock them.'], ['🎁', 'Virtual gifts', 'Show love with gifts that go straight to your favourite creators.'], ['⭐', 'Verified reviews', 'Ratings only come from real, completed services.'], ['📣', 'Promotions', 'Creators can boost public posts, profiles and communities.'], ['🤝', 'Safe Innercircle', 'Verified creators only, with held payments and clear booking steps.']];
const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Landing() {
  return <PublicPage>
    <section className="max-w-6xl mx-auto px-4 pt-12 pb-16 grid md:grid-cols-2 gap-10 items-center">
      <div>
        <p className="text-violet-light text-sm font-semibold mb-3">Built for Nigerian creators</p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight">Where creators and fans <span className="bg-gradient-to-r from-violet-light to-pink bg-clip-text text-transparent">connect, support and earn.</span></h1>
        <p className="text-ink2 mt-4 text-lg">Follow creators, unlock exclusive content, chat in real time and send gifts. Creators turn their audience into income, with points you buy in naira.</p>
        <div className="flex flex-wrap gap-3 mt-6"><Link to="/signup" className="btn-primary">Get started free</Link><a href="#how" className="btn-ghost">See how it works</a></div>
        <div className="flex gap-8 mt-8 text-sm text-ink2"><div><p className="text-2xl font-bold text-ink"><CountUp to={100} prefix="₦" /></p>per point</div><div><p className="text-2xl font-bold text-ink">0</p>fees to join</div><div><p className="text-2xl font-bold text-ink">24/7</p>live chat</div></div>
      </div>
      <div className="grid place-items-center animate-floaty"><HeroPhone /></div>
    </section>

    <section id="how" className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-center">How it works</h2><p className="text-ink2 text-center mt-2">Four simple steps</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">{steps.map(([Art, t, d], i) => <Reveal key={t} className="card"><div style={{ transitionDelay: `${i * 90}ms` }}><Art /><h3 className="font-semibold mt-3">{t}</h3><p className="text-ink2 text-sm mt-1">{d}</p></div></Reveal>)}</div>
    </section>

    <section className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-center">Grow with clear insights</h2><p className="text-ink2 text-center mt-2">Creator Studio shows what is working, live. (Sample figures for illustration.)</p>
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <div className="card md:col-span-2"><p className="text-sm text-ink2 mb-2">Weekly earnings</p><LineChart points={[12, 18, 15, 28, 24, 41, 36].map((v, i) => ({ label: week[i], value: v }))} /></div>
        <div className="card"><p className="text-sm text-ink2 mb-3">Where income comes from</p><Donut parts={[{ label: 'Exclusive', value: 45, color: '#8B5CF6' }, { label: 'Gifts', value: 30, color: '#EC4899' }, { label: 'Subscribers', value: 25, color: '#60A5FA' }]} /></div>
        <div className="card md:col-span-3"><p className="text-sm text-ink2 mb-2">New followers this week</p><BarChart points={[8, 14, 11, 22, 19, 30, 26].map((v, i) => ({ label: week[i], value: v }))} /></div>
      </div>
    </section>

    <section className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-center">Everything in one place</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">{features.map(([e, t, d]) => <Reveal key={t} className="card"><div className="text-2xl">{e}</div><h3 className="font-semibold mt-2">{t}</h3><p className="text-ink2 text-sm mt-1">{d}</p></Reveal>)}</div>
    </section>

    <section className="max-w-3xl mx-auto px-4 py-6"><InstallApp /></section>
    <section className="max-w-3xl mx-auto px-4 py-12"><div className="card text-center bg-gradient-to-br from-violet/20 to-pink/10">
      <h2 className="text-2xl font-bold">Ready to join?</h2><p className="text-ink2 mt-2">Create your free account in under a minute.</p><Link to="/signup" className="btn-primary mt-5">Sign up</Link></div></section>
  </PublicPage>;
}
