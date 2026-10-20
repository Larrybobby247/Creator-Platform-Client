import { useQuery } from '@tanstack/react-query';
import { get } from './query.js';
const FALLBACK = { name: 'Creator', tagline: 'Connect, support and earn.', supportEmail: '', logoUrl: '' };
// The ONE place the app reads its name/tagline/support email from. Edited in the admin dashboard (General settings).
export function usePlatform() { const q = useQuery({ queryKey: ['platform'], queryFn: get('/platform'), staleTime: 10 * 60_000, placeholderData: FALLBACK }); return { ...FALLBACK, ...(q.data || {}) }; }
