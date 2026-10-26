import { API_BASE_URL } from './api.js';
// fetch() cannot report upload progress, so uploads use XMLHttpRequest. Same error shape as api(). Uses the same API host as api() (the old relative path broke on the deployed site).
export function uploadWithProgress(path, form, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest(); x.open('POST', `${API_BASE_URL}/api${path}`); x.withCredentials = true;
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    x.onload = () => { let d = {}; try { d = JSON.parse(x.responseText); } catch {} if (x.status >= 200 && x.status < 300) resolve(d); else reject(Object.assign(new Error(d.error || d.details?.[0]?.message || 'Upload failed'), { status: x.status, code: d.code, data: d })); };
    x.onerror = () => reject(new Error('Network problem. Check your connection and try again.')); x.onabort = () => reject(new Error('Upload cancelled'));
    x.send(form);
  });
}
