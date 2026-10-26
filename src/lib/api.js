export const API_BASE_URL = import.meta.env.PROD
  ? "https://creator-server-hdsk.onrender.com"
  : "";

// Public frontend API utility
export async function api(
  path,
  { method = "GET", body, form, signal } = {}
) {
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const url = `${API_BASE_URL}/api${normalizedPath}`;

  const r = await fetch(url, {
    method,
    credentials: "include",
    signal,
    headers: body
      ? { "Content-Type": "application/json" }
      : {},
    body: form || (body ? JSON.stringify(body) : undefined),
  });

  const data = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw Object.assign(
      new Error(
        data.error ||
        data.details?.[0]?.message ||
        "Request failed"
      ),
      {
        status: r.status,
        code: data.code,
        attemptsLeft: data.attemptsLeft,
        data,
      }
    );
  }

  return data;
}

// Format points
export const fmtPoints = (n) =>
  `${Number(n || 0).toLocaleString()} pts`;

// Format Nigerian naira
export const fmtNaira = (n) =>
  `₦${Number(n || 0).toLocaleString("en-NG")}`;

// Format relative time
export const ago = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;

  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;

  return `${Math.floor(s / 86400)}d`;
};

// Generate a unique ID
export const uid = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}${Math.random()}`.replace(".", "");
