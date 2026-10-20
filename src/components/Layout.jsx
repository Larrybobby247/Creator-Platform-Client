import { NavLink, Link, useLocation } from 'react-router-dom';
import { usePlatform } from '../lib/platform.js';
import { Home, Compass, PlusSquare, MessageCircle, User, Wallet as WalletIcon, Plus, Bell, Users, Gift, BarChart3, TrendingUp, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fmtPoints } from '../lib/api';
import { get, keys } from '../lib/query.js';
import { useAuth } from '../context/Auth.jsx';
import { useLive } from '../context/Live.jsx';

const cls = ({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-btn text-sm font-medium ${isActive ? 'bg-card2 text-violet-light' : 'text-ink2 hover:bg-card'}`;
const Dot = ({ n }) => n > 0 ? <span className="ml-auto bg-pink text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] grid place-items-center px-1">{n > 99 ? '99+' : n}</span> : null;

export function PointChip() {
  const { data: w } = useQuery({ queryKey: keys.wallet, queryFn: get('/points/wallet'), staleTime: 30_000 }); // shared with the Wallet page; refreshed by events, not by polling
  return <div className="flex items-center gap-1 bg-card border border-line rounded-full pl-3 pr-1 py-1 text-sm min-w-[96px] justify-between">
    <Link to="/wallet" className="font-semibold">{w ? fmtPoints(w.availablePoints) : <span className="inline-block w-12 h-4 rounded bg-card2 animate-pulse" />}</Link>
    <Link to="/wallet" aria-label="Buy points" className="grid place-items-center w-7 h-7 rounded-full bg-violet"><Plus size={14} /></Link></div>;
}

export default function Layout({ children }) {
  const { user } = useAuth(); const { msgUnread, notifUnread } = useLive(); const platform = usePlatform(); const loc = useLocation();
  const side = [['/home', 'Home', Home], ['/explore', 'Explore', Compass], ['/messages', 'Messages', MessageCircle, msgUnread], ['/communities', 'Communities', Users], ['/wallet', 'Wallet', WalletIcon], ['/insights', 'Insights', TrendingUp], ['/referrals', 'Referrals', Gift], [`/u/${user.username}`, 'Profile', User], ['/settings', 'Settings', Settings]];
  if (user.accountMode === 'CREATOR') side.push(['/studio', 'Creator Studio', BarChart3]);
  const bottom = [['/home', 'Home', Home], ['/explore', 'Explore', Compass], ['/create', 'Create', PlusSquare], ['/messages', 'Messages', MessageCircle, msgUnread], [`/u/${user.username}`, 'Profile', User]];
  return <div className="min-h-screen">
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col gap-1 p-4 border-r border-divider bg-bg overflow-y-auto">
      <Link to="/home" className="flex items-center gap-2 text-xl font-bold px-3 py-4 truncate">{platform.logoUrl && <img src={platform.logoUrl} alt="" width="28" height="28" className="rounded-md" />}<span className="truncate">{platform.name}<span className="text-pink">.</span></span></Link>
      {side.map(([to, label, Icon, n]) => <NavLink key={to} to={to} className={cls}><Icon size={20} />{label}<Dot n={n} /></NavLink>)}
      <Link to="/create" className="btn-primary mt-4">Create</Link>
    </aside>
    <header className="sticky top-0 z-20 flex items-center gap-2 p-3 bg-bg/90 backdrop-blur border-b border-divider lg:ml-60">
      <Link to="/home" className="lg:hidden flex items-center gap-2 font-bold text-lg truncate mr-auto min-w-0">{platform.logoUrl && <img src={platform.logoUrl} alt="" width="24" height="24" className="rounded-md" />}<span className="truncate">{platform.name}<span className="text-pink">.</span></span></Link><span className="hidden lg:block mr-auto" />
      <Link to="/notifications" aria-label="Notifications" className="relative grid place-items-center w-10 h-10 rounded-full bg-card border border-line"><Bell size={18} />{notifUnread > 0 && <span className="absolute -top-1 -right-1 bg-pink text-[10px] font-bold rounded-full min-w-[18px] h-[18px] grid place-items-center">{notifUnread}</span>}</Link>
      <PointChip /></header>
    <main key={loc.pathname} className="lg:ml-60 mx-auto max-w-3xl p-4 pb-28 lg:pb-8 animate-page">{children}</main>
    <nav aria-label="Primary" className="lg:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-5 bg-card border-t border-line" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {bottom.map(([to, label, Icon, n]) => <NavLink key={to} to={to} aria-label={label} className={({ isActive }) => `relative flex flex-col items-center gap-1 py-2 text-[11px] ${isActive ? 'text-violet-light' : 'text-ink2'}`}>
        {label === 'Create' ? <span className="grid place-items-center w-10 h-10 -mt-1 rounded-full bg-violet text-white"><Icon size={22} /></span> : <Icon size={22} />}
        {label !== 'Create' && label}{n > 0 && <span className="absolute top-1 right-[28%] bg-pink text-[10px] font-bold rounded-full min-w-[16px] h-4 grid place-items-center px-1">{n}</span>}</NavLink>)}
    </nav></div>;
}
