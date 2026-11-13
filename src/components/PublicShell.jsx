import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo.jsx';
import { useAuth } from '../context/Auth.jsx';
import { usePlatform } from '../lib/platform.js';
const links = [['/creators', 'For creators'], ['/about', 'About'], ['/contact', 'Contact']];
export function Header() {
  const { user } = useAuth(); const p = usePlatform();
  return <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur border-b border-divider">
    <div className="max-w-6xl mx-auto flex items-center gap-4 px-4 h-14">
      <Link to="/" aria-label={p.name} className="flex items-center"><Logo size={36} /></Link>
      <nav className="hidden sm:flex gap-4 ml-4 text-sm text-ink2">{links.map(([to, l]) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'text-ink' : 'hover:text-ink'}>{l}</NavLink>)}</nav>
      <div className="ml-auto flex gap-2">{user ? <Link to="/home" className="btn-primary !py-2">Open app</Link> : <><Link to="/login" className="btn-ghost !py-2">Log in</Link><Link to="/signup" className="btn-primary !py-2">Sign up</Link></>}</div>
    </div></header>;
}
export function Footer() {
  const p = usePlatform();
  return <footer className="border-t border-divider mt-16 py-8 text-sm text-ink2"><div className="max-w-6xl mx-auto px-4 flex flex-wrap gap-x-6 gap-y-2 items-center">
    <span>© {new Date().getFullYear()} {p.name}</span>{p.supportEmail && <a href={`mailto:${p.supportEmail}`} className="hover:text-ink">{p.supportEmail}</a>}{[['/about', 'About'], ['/contact', 'Contact'], ['/terms', 'Terms & Conditions'], ['/privacy', 'Privacy Policy']].map(([to, l]) => <Link key={to} to={to} className="hover:text-ink">{l}</Link>)}
  </div></footer>;
}
export const PublicPage = ({ children }) => <div className="min-h-screen flex flex-col"><Header /><main className="flex-1">{children}</main><Footer /></div>;
