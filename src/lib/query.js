import { QueryClient } from '@tanstack/react-query';
import { api } from './api';

// Server stays authoritative: money/booking screens use short stale times and are invalidated after every mutation.
export const queryClient = new QueryClient({ defaultOptions: { queries: {
  staleTime: 30_000, gcTime: 5 * 60_000, refetchOnWindowFocus: false,
  retry: (n, err) => !(err?.status >= 400 && err?.status < 500) && n < 2, // retry network/5xx only, never 4xx
} } });

// queryFn helper: wires TanStack's AbortSignal into fetch so superseded requests are cancelled.
export const get = (path) => ({ signal }) => api(path, { signal });
export const keys = { wallet: ['wallet'], counts: ['counts'], notifications: ['notifications'], conversations: (cat) => ['conversations', cat], feed: (tab) => ['feed', tab], explore: (q, cat) => ['explore', q, cat], profile: (u) => ['profile', u] };
