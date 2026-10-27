// Where to go after logging in. Only same-site paths are allowed (stops "?next=https://evil.com").
export const safeNext = (s) => (typeof s === 'string' && s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/login') && !s.startsWith('/signup') ? s : '/home');
export const loginUrl = (path = window.location.pathname) => `/login?next=${encodeURIComponent(path)}`;
