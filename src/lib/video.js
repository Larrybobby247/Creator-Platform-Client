// Reads a video's length in the browser (from its metadata) so the app can offer trimming before anything is uploaded.
export const videoDuration = (url) => new Promise((resolve) => {
  const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true;
  const done = (d) => { v.removeAttribute('src'); v.load(); resolve(Number.isFinite(d) ? d : 0); };
  v.onloadedmetadata = () => { if (v.duration === Infinity) { v.currentTime = 1e101; v.ontimeupdate = () => { v.ontimeupdate = null; done(v.duration); }; } else done(v.duration); };
  v.onerror = () => done(0); v.src = url;
});
export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
