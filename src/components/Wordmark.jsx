import { useId } from 'react';

// The "Privy" brand mark: a thick, brush-style script wordmark. The big round P and the y whose tail loops back underneath the whole word are
// one hand-drawn line. The gradient is the theme's own two accent colours (pink → violet by default), so it follows the colour theme the
// person chose in Settings and stays visible on every one of them (dark themes get a soft glow, the light theme none).
export default function Wordmark({ height = 30, className = '' }) {
  const id = `wm${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return <svg viewBox="8 -4 312 130" height={height} style={{ width: (height * 312) / 130, overflow: 'visible' }} role="img" aria-label="Privy" className={`wordmark shrink-0 ${className}`}>
    <defs><linearGradient id={id} gradientUnits="userSpaceOnUse" x1="14" y1="0" x2="304" y2="0">
      <stop offset="0" style={{ stopColor: 'var(--color-pink)' }} /><stop offset="1" style={{ stopColor: 'var(--color-violet)' }} /></linearGradient></defs>
    <g fill="none" stroke={`url(#${id})`} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round">
      <path d="M26 92 C36 66 46 40 54 22" />
      <path d="M54 22 C112 -10 152 40 102 60 C84 68 64 64 48 54" />
      <path d="M134 48 C132 60 130 70 128 80" />
      <path d="M136 64 C142 48 158 44 168 52" />
      <path d="M188 50 C186 62 186 70 190 78 C194 82 200 78 204 70" />
      <path d="M216 50 C220 66 226 80 232 80 C242 74 248 58 252 48" />
      <path d="M262 50 C266 66 272 78 278 78 C288 70 294 56 298 46" />
      <path d="M298 46 C298 82 284 106 262 108 C238 110 232 90 250 90 C270 90 262 116 210 116 C150 116 80 118 20 106" />
    </g>
    <circle cx="194" cy="32" r="6.5" fill={`url(#${id})`} />
  </svg>;
}
// Shows the script wordmark when the platform is called Privy; if an admin renamed the platform, the plain name is shown instead.
export function Brand({ name, height = 30 }) { return /^privy$/i.test(name || '') ? <Wordmark height={height} /> : <span className="truncate">{name}<span className="text-pink">.</span></span>; }
