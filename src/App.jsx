import { lazy, Suspense, useEffect } from 'react';
import { usePlatform } from './lib/platform.js';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { safeNext } from './lib/next.js';
import { useAuth } from './context/Auth.jsx';
import Layout from './components/Layout.jsx';
import { Skeleton } from './components/ui.jsx';

// Route-level code splitting: a visitor only downloads the code for the page they open.
const Landing = lazy(() => import('./pages/Landing.jsx'));
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const About = lazy(() => import('./pages/Info.jsx').then((m) => ({ default: m.About })));
const Contact = lazy(() => import('./pages/Info.jsx').then((m) => ({ default: m.Contact })));
const Terms = lazy(() => import('./pages/Info.jsx').then((m) => ({ default: m.Terms })));
const Privacy = lazy(() => import('./pages/Info.jsx').then((m) => ({ default: m.Privacy })));
const Forgot = lazy(() => import('./pages/Reset.jsx').then((m) => ({ default: m.Forgot })));
const Reset = lazy(() => import('./pages/Reset.jsx').then((m) => ({ default: m.Reset })));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail.jsx'));
const Home = lazy(() => import('./pages/Home.jsx'));
const Explore = lazy(() => import('./pages/Explore.jsx'));
const Create = lazy(() => import('./pages/Create.jsx'));
const Messages = lazy(() => import('./pages/Messages.jsx'));
const Wallet = lazy(() => import('./pages/Wallet.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const PublicProfile = lazy(() => import('./pages/PublicProfile.jsx'));
const PublicCommunity = lazy(() => import('./pages/PublicCommunity.jsx'));
const Studio = lazy(() => import('./pages/Studio.jsx'));
const Topic = lazy(() => import('./pages/Topic.jsx'));
const Insights = lazy(() => import('./pages/Insights.jsx'));
const BecomeCreator = lazy(() => import('./pages/BecomeCreator.jsx'));
const Report = lazy(() => import('./pages/Report.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const CommunityPage = lazy(() => import('./pages/CommunityPage.jsx'));
const L = (n) => lazy(() => import('./pages/Lists.jsx').then((m) => ({ default: m[n] })));
const Notifications = L('Notifications'), Communities = L('Communities'), Referrals = L('Referrals'), Requests = L('Requests'), Meetups = L('Meetups'), Subscriptions = L('Subscriptions');

const Fallback = () => <div className="max-w-3xl mx-auto p-4 space-y-3" aria-busy="true"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;

export default function App() {
  const { user, loading } = useAuth(); const platform = usePlatform(); const [sp] = useSearchParams(); const after = safeNext(sp.get('next'));
  useEffect(() => { document.title = platform.name; }, [platform.name]);
  if (loading) return <Fallback />;
  const app = (el) => user ? <Layout><Suspense fallback={<Fallback />}>{el}</Suspense></Layout> : <Navigate to="/login" />;
  return <Suspense fallback={<Fallback />}><Routes>
    <Route path="/" element={user ? <Navigate to="/home" /> : <Landing />} />
    <Route path="/about" element={<About />} /><Route path="/contact" element={<Contact />} /><Route path="/terms" element={<Terms />} /><Route path="/privacy" element={<Privacy />} />
    <Route path="/login" element={user ? <Navigate to={after} replace /> : <AuthPage mode="login" />} /><Route path="/signup" element={user ? <Navigate to={after} replace /> : <AuthPage mode="signup" />} />
    <Route path="/verify-email" element={<VerifyEmail />} /><Route path="/forgot" element={<Forgot />} /><Route path="/reset" element={<Reset />} />
    <Route path="/home" element={app(<Home />)} /><Route path="/explore" element={app(<Explore />)} /><Route path="/create" element={app(<Create />)} />
    <Route path="/messages" element={app(<Messages />)} /><Route path="/wallet" element={app(<Wallet />)} /><Route path="/u/:username" element={user ? app(<Profile />) : <PublicProfile />} />
    <Route path="/studio" element={app(<Studio />)} /><Route path="/topic/:tag" element={app(<Topic />)} /><Route path="/insights" element={app(<Insights />)} /><Route path="/notifications" element={app(<Notifications />)} />
    <Route path="/settings" element={app(<Settings />)} /><Route path="/communities" element={app(<Communities />)} /><Route path="/communities/:id" element={user ? app(<CommunityPage />) : <PublicCommunity />} />
    <Route path="/become-creator" element={app(<BecomeCreator />)} /><Route path="/report" element={app(<Report />)} /><Route path="/innercircle" element={app(<Meetups />)} />
    <Route path="/referrals" element={app(<Referrals />)} /><Route path="/requests" element={app(<Requests />)} /><Route path="/meetups" element={app(<Meetups />)} /><Route path="/subscriptions" element={app(<Subscriptions />)} />
    <Route path="*" element={<Navigate to="/" />} />
  </Routes></Suspense>;
}
