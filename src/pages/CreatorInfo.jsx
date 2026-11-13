import { Link } from 'react-router-dom';
import { PublicPage } from '../components/PublicShell.jsx';
import { Reveal, LineChart, Donut } from '../components/ui.jsx';

// Public page for people who want to know how creating works before they sign up (linked from the landing page and the top bar).
const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const steps = [
  ['1', 'Join free', 'Create a normal account first. Everyone starts as a user, and you can switch to a creator whenever you are ready.'],
  ['2', 'Apply to be a creator', 'Open Become a Creator in your profile. Share your legal name, date of birth and phone number, read the guidelines, and choose the things you want to offer.'],
  ['3', 'Add your payout account', 'Add your Nigerian bank account. We check the account name with the bank so your money always goes to the right place.'],
  ['4', 'Post and set your prices', 'Share free posts and reels to grow, and lock your best photos and videos behind a price you choose.'],
  ['5', 'Earn and withdraw', 'Your earnings build up as fans unlock, tip and subscribe. Request a withdrawal and we send it to your bank after a quick review.'],
];
const earn = [['🔒', 'Exclusive content', 'Fans pay once to unlock the photos and videos you lock.'], ['🎁', 'Gifts', 'Fans send gifts to say thanks, and you receive their value.'], ['⭐', 'Your Room', 'Fans join your Room for 30 days to see subscriber-only posts.'], ['📝', 'Special requests', 'Fans send a request with an offer. You choose which ones to deliver.'], ['💬', 'Paid messages', 'Sell photos, videos or voice notes inside a chat.'], ['🤝', 'Innercircle', 'Offer verified, booked meet-ups with clear rules and held payments.']];
const faqs = [
  ['Does it cost anything to become a creator?', 'No. Joining and applying are free. The platform keeps a small fee from each sale, and creators on the Pro plan pay a lower fee.'],
  ['How much is a point worth?', 'One point is $1. Fans buy points and spend them; your earnings are counted in points and paid to your bank in naira at the current rate.'],
  ['When do I get paid?', 'Request a withdrawal any day from Creator Studio. After review the money is sent to your bank, usually within 24 to 48 hours.'],
  ['Is my content protected?', 'Yes. Locked photos and videos stay on the server until a fan unlocks them, and they cannot be downloaded or saved from the app.'],
  ['Who can become a creator?', 'Anyone 18 or older with a Nigerian bank account who follows the community guidelines.'],
];

export default function CreatorInfo() {
  return <PublicPage>
    <section className="max-w-4xl mx-auto px-4 pt-12 pb-10 text-center">
      <p className="text-violet-light text-sm font-semibold mb-3">For creators</p>
      <h1 className="text-4xl sm:text-5xl font-bold leading-tight">Turn your audience into <span className="bg-gradient-to-r from-violet-light to-pink bg-clip-text text-transparent">income.</span></h1>
      <p className="text-ink2 mt-4 text-lg">Here is exactly how becoming a creator works, from signing up to getting paid.</p>
      <div className="flex flex-wrap gap-3 mt-6 justify-center"><Link to={`/signup?next=${encodeURIComponent('/become-creator')}`} className="btn-primary">Join and become a creator</Link><Link to="/" className="btn-ghost">Back to home</Link></div>
    </section>

    <section className="max-w-5xl mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold text-center">How it works</h2>
      <ol className="mt-8 space-y-3 max-w-2xl mx-auto">{steps.map(([n, t, d]) => <Reveal key={n} className="card flex gap-4 items-start"><span className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-violet to-pink text-white font-bold grid place-items-center">{n}</span><div><h3 className="font-semibold">{t}</h3><p className="text-ink2 text-sm mt-1">{d}</p></div></Reveal>)}</ol>
    </section>

    <section className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold text-center">Six ways to earn</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">{earn.map(([e, t, d]) => <Reveal key={t} className="card"><div className="text-2xl">{e}</div><h3 className="font-semibold mt-2">{t}</h3><p className="text-ink2 text-sm mt-1">{d}</p></Reveal>)}</div>
    </section>

    <section className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold text-center">Grow with clear insights</h2><p className="text-ink2 text-center mt-2">Creator Studio shows what is working, live. (Sample figures for illustration.)</p>
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <div className="card md:col-span-2"><p className="text-sm text-ink2 mb-2">Weekly earnings</p><LineChart points={[12, 18, 15, 28, 24, 41, 36].map((v, i) => ({ label: week[i], value: v }))} /></div>
        <div className="card"><p className="text-sm text-ink2 mb-3">Where income comes from</p><Donut parts={[{ label: 'Exclusive', value: 45, color: '#8B5CF6' }, { label: 'Gifts', value: 30, color: '#EC4899' }, { label: 'Subscribers', value: 25, color: '#60A5FA' }]} /></div>
      </div>
    </section>

    <section className="max-w-3xl mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold text-center">Questions</h2>
      <div className="mt-6 space-y-2">{faqs.map(([q, a]) => <details key={q} className="card !p-4 group"><summary className="cursor-pointer font-semibold">{q}</summary><p className="text-ink2 text-sm mt-2">{a}</p></details>)}</div>
    </section>

    <section className="max-w-3xl mx-auto px-4 py-12"><div className="card text-center bg-gradient-to-br from-violet/20 to-pink/10">
      <h2 className="text-2xl font-bold">Ready to start earning?</h2><p className="text-ink2 mt-2">Create your free account, then open Become a Creator.</p><Link to={`/signup?next=${encodeURIComponent('/become-creator')}`} className="btn-primary mt-5">Sign up</Link></div></section>
  </PublicPage>;
}
