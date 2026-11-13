import { usePlatform } from '../lib/platform.js';
// The brand logo in the navbar: the logo file from the public folder (or the logo an admin uploaded in Platform Settings).
export const DEFAULT_LOGO = '/icons/icon-192.png';
export default function Logo({ size = 36, className = '' }) {
  const p = usePlatform();
  return <img src={p.logoUrl || DEFAULT_LOGO} alt={p.name || 'Home'} width={size} height={size} className={`rounded-xl object-cover shrink-0 ${className}`} style={{ width: size, height: size }} />;
}
