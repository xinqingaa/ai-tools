export function visualUnits(text) {
  let units = 0;
  for (const char of Array.from(String(text ?? ''))) {
    if (/[\u4e00-\u9fff]/u.test(char)) units += 1;
    else if (/[A-Z]/.test(char)) units += 0.68;
    else if (/[a-z0-9]/.test(char)) units += 0.56;
    else if (/\s/.test(char)) units += 0.3;
    else units += 0.5;
  }
  return units;
}

export function estimateTextWidth(text, fontPx) {
  return visualUnits(text) * fontPx;
}

export function wrapText(text, widthPx, fontPx, maxLines = 2) {
  const source = String(text ?? '').trim();
  if (!source) return [];
  const maxUnits = Math.max(4, widthPx / fontPx);
  const chunks = [];
  let line = '';
  let units = 0;

  for (const char of Array.from(source)) {
    const charUnits = visualUnits(char);
    if (units + charUnits > maxUnits && line) {
      chunks.push(line.trim());
      line = char;
      units = charUnits;
    } else {
      line += char;
      units += charUnits;
    }
  }
  if (line) chunks.push(line.trim());

  if (chunks.length <= maxLines) return chunks;
  const visible = chunks.slice(0, maxLines);
  const last = visible[maxLines - 1] ?? '';
  visible[maxLines - 1] = trimToWidth(last, widthPx - fontPx, fontPx).replace(/[。；，、,.!?;:：]+$/u, '') + '…';
  return visible;
}

export function fitFontSize(text, widthPx, preferredPx, minPx = 15) {
  let size = preferredPx;
  while (size > minPx && estimateTextWidth(text, size) > widthPx) size -= 1;
  return size;
}

export function trimToWidth(text, widthPx, fontPx) {
  let out = '';
  for (const char of Array.from(String(text ?? ''))) {
    if (estimateTextWidth(out + char, fontPx) > widthPx) break;
    out += char;
  }
  return out.trim();
}

export function slugify(text, fallback = 'diagram') {
  const cleaned = String(text ?? '')
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return cleaned || fallback;
}

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
