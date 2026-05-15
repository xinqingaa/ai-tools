import { editorialStyle } from './style.mjs';
import { estimateTextWidth, wrapText } from './text.mjs';

export function checkDiagram(spec, layout, style = editorialStyle) {
  const issues = [];
  const frame = style.frame;
  const boxes = collectBoxes(layout);

  for (const box of boxes) {
    if (box.x < frame.x + 18 || box.y < frame.contentTop - 20 || box.x + box.w > frame.x + frame.w - 18 || box.y + box.h > frame.y + frame.h - 18) {
      issues.push(`${box.kind} out of frame: ${box.label}`);
    }
  }

  for (const box of boxes.filter((item) => item.kind === 'node')) {
    const titleWidth = box.step ? box.w - 40 : box.w - 56;
    const titleLines = wrapText(box.title, titleWidth, style.fonts.label, 1);
    if (!titleLines.length || estimateTextWidth(titleLines[0], style.fonts.label) > titleWidth + 1) {
      issues.push(`title may overflow: ${box.label}`);
    }
    const subtitleLines = wrapText(box.subtitle, box.w - 40, style.fonts.body, 2);
    for (const line of subtitleLines) {
      if (estimateTextWidth(line, style.fonts.body) > box.w - 36) {
        issues.push(`subtitle may overflow: ${box.label}`);
      }
    }
  }

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.group === b.group) continue;
      if (overlaps(a, b, 8)) issues.push(`boxes overlap: ${a.label} / ${b.label}`);
    }
  }

  if (!spec.title) issues.push('missing title');
  if (!['flow', 'compare-bands', 'hub-cluster', 'artifact-loop'].includes(spec.layout)) {
    issues.push(`unsupported layout: ${spec.layout}`);
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

function collectBoxes(layout) {
  const boxes = [];
  for (const node of layout.nodes ?? []) {
    boxes.push({ ...node, kind: 'node', label: node.title, group: 'node' });
  }
  for (const band of layout.bands ?? []) {
    boxes.push({ ...band, kind: 'band', label: band.title, group: `band-${band.title}` });
    const cardW = Math.min(245, Math.floor((band.w - 330 - Math.max(0, band.items.length - 1) * 35) / Math.max(1, band.items.length)));
    const gap = band.items.length > 1 ? Math.floor((band.w - 330 - cardW * band.items.length) / (band.items.length - 1)) : 0;
    const startX = band.x + 288;
    const cardY = band.y + Math.max(42, (band.h - 104) / 2);
    band.items.forEach((item, index) => {
      boxes.push({
        title: item.title,
        subtitle: item.subtitle,
        x: startX + index * (cardW + gap),
        y: cardY,
        w: cardW,
        h: 104,
        kind: 'node',
        label: item.title,
        group: `band-${band.title}`,
      });
    });
  }
  for (const note of layout.notes ?? []) {
    boxes.push({ ...note, kind: 'note', label: note.text, group: 'note' });
  }
  if (layout.cluster) {
    boxes.push({ ...layout.cluster, kind: 'cluster', label: layout.cluster.title, group: 'cluster' });
  }
  return boxes;
}

function overlaps(a, b, padding = 0) {
  return a.x < b.x + b.w + padding
    && a.x + a.w + padding > b.x
    && a.y < b.y + b.h + padding
    && a.y + a.h + padding > b.y;
}
