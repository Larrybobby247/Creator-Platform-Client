// Shrinks a photo in the browser before upload: a 5 MB phone photo becomes ~30-150 KB WebP at the size it is actually displayed.
export async function shrinkImage(file, maxSide, quality = 0.85) {
  if (!file.type.startsWith('image/')) return file;
  const bmp = await createImageBitmap(file).catch(() => null); if (!bmp) return file;
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height)); const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(bmp, 0, 0, w, h); bmp.close?.();
  const blob = await new Promise((r) => c.toBlob(r, 'image/webp', quality));
  return blob && blob.size < file.size ? new File([blob], 'image.webp', { type: 'image/webp' }) : file;
}
