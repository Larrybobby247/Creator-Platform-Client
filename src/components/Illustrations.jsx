// Hand-drawn SVG illustrations (no image files => tiny and crisp on every screen).
const g = (id, a, b) => <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>;
const Frame = ({ children, label }) => <svg viewBox="0 0 240 180" className="w-full h-auto" role="img" aria-label={label}><defs>{g('v', '#8B5CF6', '#EC4899')}{g('s', '#222230', '#191923')}</defs>{children}</svg>;

export const IlloSignup = () => <Frame label="Create your account">
  <rect x="50" y="20" width="140" height="140" rx="18" fill="url(#s)" stroke="#30303D" />
  <circle cx="120" cy="65" r="20" fill="url(#v)" /><rect x="80" y="98" width="80" height="10" rx="5" fill="#30303D" /><rect x="90" y="116" width="60" height="10" rx="5" fill="#30303D" />
  <rect x="85" y="136" width="70" height="16" rx="8" fill="#8B5CF6" /><path d="M170 28l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#EC4899" className="animate-floaty" /></Frame>;
export const IlloPoints = () => <Frame label="Buy points with naira">
  <rect x="20" y="50" width="100" height="70" rx="12" fill="url(#s)" stroke="#30303D" /><text x="70" y="92" textAnchor="middle" fontSize="22" fontWeight="700" fill="#F5F5FA">₦100</text>
  <path d="M128 85h28m0 0l-8-8m8 8l-8 8" stroke="#A78BFA" strokeWidth="3" fill="none" strokeLinecap="round" />
  <g className="animate-floaty"><circle cx="190" cy="85" r="30" fill="url(#v)" /><text x="190" y="93" textAnchor="middle" fontSize="24" fontWeight="800" fill="#fff">1</text></g>
  <text x="190" y="135" textAnchor="middle" fontSize="11" fill="#A1A1B5">point</text></Frame>;
export const IlloUnlock = () => <Frame label="Unlock content and send gifts">
  <rect x="30" y="25" width="120" height="130" rx="14" fill="url(#s)" stroke="#30303D" /><rect x="40" y="35" width="100" height="62" rx="8" fill="#30303D" /><circle cx="90" cy="66" r="15" fill="#8B5CF6" opacity=".25" />
  <path d="M84 60l16 6-16 6z" fill="#A78BFA" /><rect x="40" y="108" width="60" height="9" rx="4" fill="#30303D" /><rect x="40" y="124" width="40" height="9" rx="4" fill="#30303D" />
  <g transform="translate(160,60)" className="animate-floaty"><rect x="0" y="22" width="48" height="38" rx="8" fill="url(#v)" /><path d="M14 22v-8a10 10 0 0120 0v8" stroke="#F5F5FA" strokeWidth="4" fill="none" /><circle cx="24" cy="41" r="4" fill="#fff" /></g>
  <path d="M184 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#EC4899" /></Frame>;
export const IlloEarn = () => <Frame label="Creators earn and withdraw">
  <rect x="20" y="30" width="130" height="110" rx="14" fill="url(#s)" stroke="#30303D" />
  {[28, 50, 38, 70, 90].map((h, i) => <rect key={i} x={36 + i * 22} y={125 - h} width="14" height={h} rx="4" fill="url(#v)" />)}
  <g className="animate-floaty"><circle cx="190" cy="70" r="26" fill="#22C55E" opacity=".2" /><text x="190" y="78" textAnchor="middle" fontSize="22" fontWeight="800" fill="#22C55E">₦</text></g>
  <path d="M150 90h18" stroke="#A78BFA" strokeWidth="3" strokeDasharray="4 4" /><rect x="160" y="110" width="60" height="26" rx="13" fill="#8B5CF6" /><text x="190" y="127" textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff">Withdraw</text></Frame>;

// Hero: phone mock showing the actual interface style
export const HeroPhone = () => <svg viewBox="0 0 260 440" className="w-full max-w-[300px] h-auto drop-shadow-2xl" role="img" aria-label="App preview">
  <defs>{g('v', '#8B5CF6', '#EC4899')}</defs>
  <rect x="6" y="6" width="248" height="428" rx="36" fill="#101016" stroke="#30303D" strokeWidth="3" />
  <rect x="100" y="16" width="60" height="8" rx="4" fill="#222230" />
  <rect x="22" y="40" width="216" height="30" rx="15" fill="#191923" /><circle cx="226" cy="55" r="9" fill="#8B5CF6" /><text x="40" y="60" fontSize="11" fill="#F5F5FA" fontWeight="600">12 pts</text>
  {[0, 1, 2, 3].map((i) => <circle key={i} cx={42 + i * 46} cy="98" r="16" fill="url(#v)" opacity={1 - i * 0.15} />)}
  <rect x="22" y="128" width="216" height="130" rx="16" fill="#191923" stroke="#30303D" /><circle cx="42" cy="150" r="10" fill="#A78BFA" /><rect x="58" y="144" width="70" height="8" rx="4" fill="#30303D" />
  <rect x="32" y="168" width="196" height="70" rx="10" fill="#222230" /><rect x="120" y="190" width="20" height="26" rx="5" fill="#8B5CF6" /><text x="130" y="248" textAnchor="middle" fontSize="9" fill="#A78BFA">🔒 Unlock · 3 pts</text>
  <rect x="22" y="272" width="216" height="64" rx="16" fill="#191923" stroke="#30303D" /><rect x="34" y="286" width="120" height="8" rx="4" fill="#30303D" /><rect x="34" y="304" width="80" height="8" rx="4" fill="#30303D" /><circle cx="210" cy="304" r="14" fill="#EC4899" opacity=".25" /><text x="210" y="309" textAnchor="middle" fontSize="14">🎁</text>
  <rect x="6" y="372" width="248" height="62" rx="0" fill="#191923" /><rect x="6" y="372" width="248" height="1" fill="#30303D" />
  {[30, 80, 130, 180, 230].map((x, i) => <circle key={x} cx={x} cy="398" r={i === 2 ? 14 : 7} fill={i === 2 ? '#8B5CF6' : '#77778D'} />)}
</svg>;
