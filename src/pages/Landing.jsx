import InstallApp from '../components/InstallApp.jsx';
import { Link } from 'react-router-dom';
import { PublicPage } from '../components/PublicShell.jsx';
import { Reveal, CountUp } from '../components/ui.jsx';
import { IlloSignup, IlloPoints, IlloUnlock, HeroPhone } from '../components/Illustrations.jsx';

// The landing page speaks to everyday users first: what you get from joining. Creators get their own page (/creators), linked from here.
const steps = [[IlloSignup, '1. Join free', 'Sign up with your email or Google in under a minute. No fee to join.'], [IlloPoints, '2. Get points', 'Points are simple in-app credit: 1 point = $1. Buy only what you need.'], [IlloUnlock, '3. Enjoy & support', 'Watch, chat, unlock what you love and send gifts to the people you follow.']];
const benefits = [
  ['🎬', 'Endless reels', 'Swipe through short videos in Loop, like, comment and share them with a link.'],
  ['🔒', 'Unlock only what you want', 'Pay once for the exclusive photos and videos you care about. No forced subscriptions.'],
  ['💬', 'Chat in real time', 'Message creators and friends with typing indicators, read receipts, voice notes and replies.'],
  ['🎁', 'Send gifts', 'Say thanks with gifts that go straight to your favourite creators.'],
  ['👥', 'Join communities', 'Find people who like what you like, and talk about it together.'],
  ['⭐', 'Status updates', 'Share a photo, video or text status that disappears after a day, and see what others post.'],
  ['🤝', 'Safe Innercircle', 'Meet your favourite creators with verified profiles, held payments and clear booking steps.'],
  ['📱', 'Works like an app', 'Install it on your phone in one tap. Fast, light and always signed in.'],
];
const trust = [['🛡️', 'Your content stays protected', 'Exclusive photos and videos are locked on the server and cannot be downloaded.'], ['💳', 'You stay in control', 'You always see the price first and confirm before any points are spent.'], ['✅', 'Verified reviews only', 'Ratings come from real, completed bookings and requests, never fake ones.']];

export default function Landing() {
  return <PublicPage>
    <section className="max-w-6xl mx-auto px-4 pt-12 pb-16 grid md:grid-cols-2 gap-10 items-center">
      <div>
        <p className="text-violet-light text-sm font-semibold mb-3">Join free today</p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight">Get closer to the creators <span className="bg-gradient-to-r from-violet-light to-pink bg-clip-text text-transparent">you love.</span></h1>
        <p className="text-ink2 mt-4 text-lg">Watch reels, unlock exclusive content, chat in real time, send gifts and join communities, all in one friendly place. Create your free account and start exploring in a minute.</p>
        <div className="flex flex-wrap gap-3 mt-6"><Link to="/signup" className="btn-primary">Get started free</Link><a href="#why" className="btn-ghost">See what you get</a></div>
        <div className="flex gap-8 mt-8 text-sm text-ink2"><div><p className="text-2xl font-bold text-ink"><CountUp to={1} prefix="$" /></p>per point</div><div><p className="text-2xl font-bold text-ink">0</p>fees to join</div><div><p className="text-2xl font-bold text-ink">24/7</p>live chat</div></div>
      </div>
      <div className="grid place-items-center animate-floaty"><HeroPhone /></div>
    </section>

    <section id="why" className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-center">Why you’ll love it here</h2><p className="text-ink2 text-center mt-2">Everything you get as a member</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">{benefits.map(([e, t, d]) => <Reveal key={t} className="card"><div className="text-2xl">{e}</div><h3 className="font-semibold mt-2">{t}</h3><p className="text-ink2 text-sm mt-1">{d}</p></Reveal>)}</div>
    </section>

    <section id="how" className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-center">How it works</h2><p className="text-ink2 text-center mt-2">Three simple steps</p>
      <div className="grid sm:grid-cols-3 gap-4 mt-8">{steps.map(([Art, t, d], i) => <Reveal key={t} className="card"><div style={{ transitionDelay: `${i * 90}ms` }}><Art /><h3 className="font-semibold mt-3">{t}</h3><p className="text-ink2 text-sm mt-1">{d}</p></div></Reveal>)}</div>
    </section>

    <section className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-center">Made to feel safe</h2>
      <div className="grid md:grid-cols-3 gap-4 mt-8">{trust.map(([e, t, d]) => <Reveal key={t} className="card text-center"><div className="text-3xl">{e}</div><h3 className="font-semibold mt-2">{t}</h3><p className="text-ink2 text-sm mt-1">{d}</p></Reveal>)}</div>
    </section>

    <section className="max-w-4xl mx-auto px-4 py-12">
      <div className="card bg-gradient-to-br from-violet/20 to-pink/10 grid sm:grid-cols-[1fr_auto] gap-5 items-center">
        <div><p className="text-violet-light text-sm font-semibold">Have something to share?</p><h2 className="text-2xl font-bold mt-1">Turn your audience into income</h2><p className="text-ink2 mt-2 text-sm">Anyone can become a creator after joining. Sell exclusive posts, receive gifts, welcome subscribers and get paid to your bank account. See exactly how it works, step by step.</p></div>
        <Link to="/creators" className="btn-ghost whitespace-nowrap">How to become a creator →</Link></div>
    </section>

    <section className="max-w-3xl mx-auto px-4 py-6"><InstallApp /></section>
    <section className="max-w-3xl mx-auto px-4 py-12"><div className="card text-center bg-gradient-to-br from-violet/20 to-pink/10">
      <h2 className="text-2xl font-bold">Ready to join?</h2><p className="text-ink2 mt-2">Create your free account in under a minute.</p><Link to="/signup" className="btn-primary mt-5">Sign up</Link></div></section>
  </PublicPage>;
}
