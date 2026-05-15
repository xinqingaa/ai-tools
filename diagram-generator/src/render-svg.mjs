import { editorialStyle, palette } from './style.mjs';
import { esc, fitFontSize, wrapText } from './text.mjs';

export function renderSvg(spec, options = {}) {
  const style = options.style ?? editorialStyle;
  const layout = layoutDiagram(spec, style);
  const body = [
    frame(spec, style),
    renderLayout(layout, style),
  ].join('\n');

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${style.width}" height="${style.height}" viewBox="0 0 ${style.width} ${style.height}">
  ${defs(style)}
  ${css(style)}
  ${body}
</svg>`,
    layout,
  };
}

export function layoutDiagram(spec, style = editorialStyle) {
  if (spec.layout === 'compare-bands') return layoutCompareBands(spec, style);
  if (spec.layout === 'hub-cluster') return layoutHubCluster(spec, style);
  if (spec.layout === 'artifact-loop') return layoutArtifactLoop(spec, style);
  return layoutFlow(spec, style);
}

function layoutFlow(spec, style) {
  const nodes = capNodes(spec.nodes, 6);
  const cardW = Math.min(220, Math.floor((style.width - 180 - (nodes.length - 1) * 30) / nodes.length));
  const cardH = 160;
  const gap = 30;
  const x0 = (style.width - nodes.length * cardW - (nodes.length - 1) * gap) / 2;
  const y = 345;
  return {
    kind: 'flow',
    spec,
    nodes: nodes.map((node, index) => ({
      ...nodeBox(node, x0 + index * (cardW + gap), y, cardW, cardH, colorAt(index, style)),
      step: index + 1,
    })),
    notes: spec.note ? [noteBox(spec.note, 330, 675, 940, style.colors.green)] : [],
    connectors: [],
  };
}

function layoutArtifactLoop(spec, style) {
  const nodes = capNodes(spec.nodes, 6);
  const cardW = 210;
  const cardH = 178;
  const gap = 36;
  const x0 = (style.width - nodes.length * cardW - (nodes.length - 1) * gap) / 2;
  const y = 285;
  return {
    kind: 'artifact-loop',
    spec,
    nodes: nodes.map((node, index) => ({
      ...nodeBox(node, x0 + index * (cardW + gap), y, cardW, cardH, colorAt(index, style)),
      step: index + 1,
      tag: node.tag,
    })),
    notes: spec.note ? [noteBox(spec.note, 345, 695, 910, style.colors.green)] : [],
    connectors: [],
  };
}

function layoutCompareBands(spec, style) {
  const bands = spec.bands?.length ? spec.bands.slice(0, 3) : [{ title: '内容', note: '', items: spec.nodes }];
  const bandH = bands.length === 1 ? 260 : bands.length === 2 ? 210 : 178;
  const gap = bands.length === 1 ? 0 : 54;
  const totalH = bands.length * bandH + (bands.length - 1) * gap;
  const y0 = 265 + Math.max(0, (430 - totalH) / 2);
  const renderedBands = bands.map((band, index) => {
    const color = resolveColor(band.accent, style) ?? colorAt(index, style);
    const items = capNodes(band.items ?? [], 4);
    return {
      title: band.title,
      note: band.note ?? '',
      x: 110,
      y: y0 + index * (bandH + gap),
      w: 1380,
      h: bandH,
      color,
      items,
    };
  });
  return {
    kind: 'compare-bands',
    spec,
    bands: renderedBands,
    nodes: [],
    notes: spec.note ? [noteBox(spec.note, 385, 805, 830, style.colors.green)] : [],
    connectors: [],
  };
}

function layoutHubCluster(spec, style) {
  const groups = spec.groups?.length ? spec.groups.slice(0, 4) : [{ title: '内容', nodes: spec.nodes }];
  const top = groups[0] ?? { title: '输入', nodes: [] };
  const middle = groups[1] ?? { title: '处理', nodes: [] };
  const bottom = groups[2] ?? { title: '输出', nodes: [] };

  const topNodes = capNodes(top.nodes ?? [], 4);
  const topCardW = 275;
  const topGap = 65;
  const topX0 = (style.width - topNodes.length * topCardW - Math.max(0, topNodes.length - 1) * topGap) / 2;
  const nodes = topNodes.map((node, index) => nodeBox(node, topX0 + index * (topCardW + topGap), 265, topCardW, 112, colorAt(index, style)));

  const clusterNodes = capNodes(middle.nodes ?? [], 6);
  const cluster = { title: middle.title, x: 160, y: 520, w: 1280, h: 222, color: style.colors.teal, nodes: clusterNodes };
  const outcomeNodes = capNodes(bottom.nodes ?? [], 3);
  const outcomeW = 320;
  const outcomeGap = 40;
  const outcomeX0 = (style.width - outcomeNodes.length * outcomeW - Math.max(0, outcomeNodes.length - 1) * outcomeGap) / 2;
  const outcomes = outcomeNodes.map((node, index) => nodeBox(node, outcomeX0 + index * (outcomeW + outcomeGap), 800, outcomeW, 76, colorAt(index + 3, style)));

  return {
    kind: 'hub-cluster',
    spec,
    groups: [
      { title: top.title, x: 124, y: 214, w: 180, h: 42, color: style.colors.blue },
      { title: middle.title, x: 124, y: 468, w: 180, h: 42, color: style.colors.teal },
    ],
    nodes: [...nodes, ...outcomes],
    cluster,
    notes: [],
    connectors: [],
  };
}

function renderLayout(layout, style) {
  if (layout.kind === 'compare-bands') return [
    ...layout.bands.map((band) => renderBand(band, style)),
    ...layout.notes.map((note) => renderNote(note, style)),
  ].join('\n');

  if (layout.kind === 'hub-cluster') return [
    ...layout.groups.map((group) => renderSoftLabel(group, style)),
    ...layout.nodes.slice(0, -3).map((node) => renderPortal(node, style)),
    mergeBus(layout.nodes.slice(0, -3), 800, 420, 800, 465, style.colors.violet),
    renderHub(380, 438, 840, 72, '统一调用', '重建页面上下文', style.colors.violet),
    arrow(800, 510, 800, 552, style.colors.violet, { width: 3, opacity: 0.62 }),
    renderCluster(layout.cluster, style),
    arrow(800, 742, 800, 784, style.colors.teal, { width: 3, opacity: 0.62 }),
    ...layout.nodes.slice(-3).map((node) => renderOutcomeNode(node, style)),
  ].join('\n');

  return [
    ...layout.nodes.map((node) => renderStepCard(node, style)),
    ...layout.nodes.slice(0, -1).map((node, index) => arrow(node.x + node.w + 8, node.y + 82, layout.nodes[index + 1].x - 8, layout.nodes[index + 1].y + 82, node.color)),
    ...layout.notes.map((note) => renderNote(note, style)),
    layout.kind === 'artifact-loop'
      ? returnLane(layout.nodes.at(-1).x + layout.nodes.at(-1).w / 2, 463, 1431, 620, 700, 620, 700, 482, style.colors.teal)
      : '',
  ].join('\n');
}

function frame(spec, style) {
  const titleLines = wrapText(spec.title, 1330, style.fonts.title, 2);
  const titleSize = titleLines.length > 1 ? 40 : fitFontSize(spec.title, 1330, style.fonts.title, 36);
  const subtitleY = titleLines.length > 1 ? 176 : 166;
  return `
    <rect width="${style.width}" height="${style.height}" fill="url(#pageBg)"/>
    <rect width="${style.width}" height="${style.height}" fill="url(#washBlue)"/>
    <rect width="${style.width}" height="${style.height}" fill="url(#washWarm)"/>
    <circle cx="1330" cy="170" r="150" fill="#dbeafe" opacity="0.30" filter="url(#lightBlur)"/>
    <circle cx="180" cy="800" r="170" fill="#dcfce7" opacity="0.20" filter="url(#lightBlur)"/>
    <rect x="54" y="46" width="1492" height="868" rx="38" fill="rgba(255,255,255,0.72)" stroke="rgba(114,132,154,0.24)"/>
    ${titleLines.map((line, index) => `<text x="96" y="${124 + index * 48}" class="title" style="font-size:${titleSize}px">${esc(line)}</text>`).join('')}
    <text x="100" y="${subtitleY}" class="subtitle">${esc(trimSubtitle(spec.subtitle))}</text>
    <rect x="100" y="194" width="290" height="6" rx="3" fill="${style.colors.blue}" opacity="0.92"/>
    <rect x="260" y="194" width="170" height="6" rx="3" fill="${style.colors.teal}" opacity="0.92"/>
  `;
}

function renderBand(band, style) {
  const cardW = Math.min(245, Math.floor((band.w - 330 - Math.max(0, band.items.length - 1) * 35) / Math.max(1, band.items.length)));
  const gap = band.items.length > 1 ? Math.floor((band.w - 330 - cardW * band.items.length) / (band.items.length - 1)) : 0;
  const startX = band.x + 288;
  const cardY = band.y + Math.max(42, (band.h - 104) / 2);
  return `
    <g>
      <rect x="${band.x}" y="${band.y}" width="${band.w}" height="${band.h}" rx="30" fill="${tint(band.color, 0.08)}" stroke="${tint(band.color, 0.42)}"/>
      <rect x="${band.x}" y="${band.y}" width="12" height="${band.h}" rx="6" fill="${band.color}" opacity="0.92"/>
      <text x="${band.x + 34}" y="${band.y + 62}" class="label">${esc(band.title)}</text>
      ${textLines(band.note, band.x + 34, band.y + 98, 210, 24, 'body', style.fonts.body, 2)}
      ${band.items.map((item, index) => renderMiniCard({
        ...nodeBox(item, startX + index * (cardW + gap), cardY, cardW, 104, band.color),
        step: index + 1,
      }, style)).join('')}
      ${band.items.slice(0, -1).map((_, index) => arrow(startX + index * (cardW + gap) + cardW + 14, cardY + 52, startX + (index + 1) * (cardW + gap) - 14, cardY + 52, band.color)).join('')}
    </g>
  `;
}

function renderStepCard(node, style) {
  const titleSize = fitFontSize(node.title, node.w - 40, 22, 17);
  const tag = node.tag ? `<text x="${node.x + 20}" y="${node.y + node.h - 22}" class="mono">${esc(node.tag)}</text>` : '';
  return `
    <g filter="url(#softShadow)">
      <rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="24" fill="rgba(255,255,255,0.92)" stroke="${tint(node.color, 0.42)}"/>
      <rect x="${node.x + 16}" y="${node.y + 16}" width="38" height="38" rx="19" fill="${node.color}" opacity="0.94"/>
      <text x="${node.x + 35}" y="${node.y + 42}" text-anchor="middle" class="eyebrow">${node.step}</text>
      <text x="${node.x + 20}" y="${node.y + 86}" class="label" style="font-size:${titleSize}px">${esc(node.title)}</text>
      ${textLines(node.subtitle, node.x + 20, node.y + 116, node.w - 40, 22, 'body', style.fonts.body, 2)}
      ${tag}
    </g>
  `;
}

function renderMiniCard(node, style) {
  const titleSize = fitFontSize(node.title, node.w - 64, 22, 16);
  return `
    <g filter="url(#softShadow)">
      <rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="22" fill="rgba(255,255,255,0.88)" stroke="${tint(node.color, 0.52)}"/>
      <circle cx="${node.x + 31}" cy="${node.y + 31}" r="17" fill="${node.color}" opacity="0.96"/>
      <text x="${node.x + 31}" y="${node.y + 38}" text-anchor="middle" class="eyebrow">${node.step}</text>
      <text x="${node.x + 60}" y="${node.y + 36}" class="label" style="font-size:${titleSize}px">${esc(node.title)}</text>
      ${textLines(node.subtitle, node.x + 26, node.y + 74, node.w - 52, 24, 'body', style.fonts.body, 2)}
    </g>
  `;
}

function renderPortal(node, style) {
  return `
    <g filter="url(#softShadow)">
      <rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="24" fill="rgba(255,255,255,0.9)" stroke="${tint(node.color, 0.46)}"/>
      <rect x="${node.x}" y="${node.y}" width="${node.w}" height="8" rx="4" fill="${node.color}" opacity="0.82"/>
      <text x="${node.x + 28}" y="${node.y + 55}" class="label">${esc(node.title)}</text>
      ${textLines(node.subtitle, node.x + 28, node.y + 88, node.w - 56, 24, 'body', style.fonts.body, 2)}
    </g>
  `;
}

function renderOutcomeNode(node, style) {
  return `
    <g filter="url(#softShadow)">
      <rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="28" fill="${tint(node.color, 0.1)}" stroke="${tint(node.color, 0.5)}"/>
      <text x="${node.x + 24}" y="${node.y + 33}" class="label" style="font-size:21px">${esc(node.title)}</text>
      <text x="${node.x + 24}" y="${node.y + 58}" class="small">${esc(node.subtitle)}</text>
    </g>
  `;
}

function renderCluster(cluster, style) {
  const cols = 3;
  const cardW = 358;
  const cardH = 62;
  const gapX = 54;
  const gapY = 22;
  const startX = cluster.x + 74;
  const startY = cluster.y + 70;
  return `
    <g filter="url(#softShadow)">
      <rect x="${cluster.x}" y="${cluster.y}" width="${cluster.w}" height="${cluster.h}" rx="32" fill="rgba(255,255,255,0.76)" stroke="rgba(95,114,137,0.3)"/>
      <text x="${cluster.x + 34}" y="${cluster.y + 46}" class="label">${esc(cluster.title)}</text>
      ${cluster.nodes.map((item, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const color = colorAt(index, style);
        const x = startX + col * (cardW + gapX);
        const y = startY + row * (cardH + gapY);
        return `
          <g>
            <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="18" fill="${tint(color, 0.1)}" stroke="${tint(color, 0.5)}"/>
            <circle cx="${x + 30}" cy="${y + cardH / 2}" r="10" fill="${color}" opacity="0.9"/>
            <text x="${x + 52}" y="${y + 27}" class="label" style="font-size:20px">${esc(item.title)}</text>
            <text x="${x + 52}" y="${y + 51}" class="small">${esc(item.subtitle)}</text>
          </g>
        `;
      }).join('')}
    </g>
  `;
}

function renderHub(x, y, w, h, title, detail, color) {
  return `
    <g filter="url(#softShadow)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="30" fill="${tint(color, 0.1)}" stroke="${tint(color, 0.58)}"/>
      <text x="${x + 300}" y="${y + 45}" text-anchor="middle" class="label">${esc(title)}</text>
      <text x="${x + 450}" y="${y + 45}" class="body">${esc(detail)}</text>
    </g>
  `;
}

function renderSoftLabel(group) {
  return `
    <rect x="${group.x}" y="${group.y}" width="${group.w}" height="${group.h}" rx="21" fill="${tint(group.color, 0.1)}" stroke="${tint(group.color, 0.42)}"/>
    <text x="${group.x + group.w / 2}" y="${group.y + 28}" text-anchor="middle" class="small" style="font-weight:740; fill:${group.color}">${esc(group.title)}</text>
  `;
}

function renderNote(note, style) {
  return `
    <g filter="url(#softShadow)">
      <rect x="${note.x}" y="${note.y}" width="${note.w}" height="58" rx="29" fill="${tint(note.color, 0.08)}" stroke="${tint(note.color, 0.32)}"/>
      <circle cx="${note.x + 34}" cy="${note.y + 29}" r="10" fill="${note.color}" opacity="0.86"/>
      ${textLines(note.text, note.x + 58, note.y + 37, note.w - 90, 22, 'label', 22, 1)}
    </g>
  `;
}

function textLines(text, x, y, width, lineHeight, className, fontPx, maxLines) {
  return wrapText(text, width, fontPx, maxLines).map((line, index) =>
    `<text x="${x}" y="${y + index * lineHeight}" class="${className}">${esc(line)}</text>`,
  ).join('');
}

function nodeBox(node, x, y, w, h, color) {
  return {
    title: node.title ?? 'Untitled',
    subtitle: node.subtitle ?? '',
    tag: node.tag ?? '',
    x,
    y,
    w,
    h,
    color,
  };
}

function noteBox(text, x, y, w, color) {
  return { text, x, y, w, h: 58, color };
}

function capNodes(nodes, max) {
  return (nodes ?? []).slice(0, max).filter((node) => node && (node.title || node.subtitle));
}

function trimSubtitle(value) {
  return wrapText(value, 1300, editorialStyle.fonts.subtitle, 1)[0] ?? '';
}

function colorAt(index, style) {
  return palette(style)[index % palette(style).length];
}

function resolveColor(name, style) {
  return style.colors[name] ?? undefined;
}

function arrow(x1, y1, x2, y2, color, options = {}) {
  const id = `arrow-${hashColor(color)}`;
  const width = options.width ?? 4;
  const opacity = options.opacity ?? 0.72;
  return `
    <defs>
      <marker id="${id}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="8" markerHeight="8" orient="auto">
        <path d="M2,2 L10,6 L2,10 Z" fill="${color}"/>
      </marker>
    </defs>
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-opacity="${opacity}" marker-end="url(#${id})"/>
  `;
}

function mergeBus(nodes, busCenterX, busY, outX, outY, color) {
  if (!nodes.length) return '';
  const id = `arrow-${hashColor(color)}`;
  const sources = nodes.map((node) => [node.x + node.w / 2, node.y + node.h, node.color]);
  const minX = Math.min(...sources.map(([x]) => x));
  const maxX = Math.max(...sources.map(([x]) => x));
  return `
    <defs>
      <marker id="${id}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M2,2 L10,6 L2,10 Z" fill="${color}"/>
      </marker>
    </defs>
    <g>
      ${sources.map(([x, y, sourceColor]) => `<path d="M ${x} ${y} L ${x} ${busY}" fill="none" stroke="${sourceColor}" stroke-width="3" stroke-linecap="round" stroke-opacity="0.58"/>`).join('')}
      <path d="M ${minX} ${busY} L ${maxX} ${busY}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-opacity="0.46"/>
      <path d="M ${busCenterX} ${busY} L ${outX} ${outY}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-opacity="0.64" marker-end="url(#${id})"/>
    </g>
  `;
}

function returnLane(x1, y1, x2, y2, x3, y3, x4, y4, color) {
  const id = `arrow-${hashColor(color)}`;
  return `
    <defs>
      <marker id="${id}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="8" markerHeight="8" orient="auto">
        <path d="M2,2 L10,6 L2,10 Z" fill="${color}"/>
      </marker>
    </defs>
    <path d="M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="14 14" stroke-opacity="0.5" marker-end="url(#${id})"/>
  `;
}

function defs(style) {
  return `
  <defs>
    <linearGradient id="pageBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fbff"/>
      <stop offset="55%" stop-color="#eef6fb"/>
      <stop offset="100%" stop-color="#f7f1ea"/>
    </linearGradient>
    <radialGradient id="washBlue" cx="16%" cy="12%" r="75%">
      <stop offset="0%" stop-color="#cfe7ff" stop-opacity="0.86"/>
      <stop offset="62%" stop-color="#eaf5ff" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="washWarm" cx="85%" cy="88%" r="70%">
      <stop offset="0%" stop-color="#ffe5c2" stop-opacity="0.72"/>
      <stop offset="66%" stop-color="#fff2df" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="softShadow" x="-16%" y="-20%" width="132%" height="150%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#3c5873" flood-opacity="0.14"/>
    </filter>
    <filter id="lightBlur" x="-8%" y="-8%" width="116%" height="116%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>`;
}

function css(style) {
  return `
  <style>
    .title { font: 760 ${style.fonts.title}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${style.colors.title}; letter-spacing: 0; }
    .subtitle { font: 400 ${style.fonts.subtitle}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${style.colors.body}; letter-spacing: 0; }
    .label { font: 720 ${style.fonts.label}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${style.colors.ink}; letter-spacing: 0; }
    .body { font: 400 ${style.fonts.body}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${style.colors.body}; letter-spacing: 0; }
    .small { font: 400 ${style.fonts.small}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${style.colors.faint}; letter-spacing: 0; }
    .mono { font: 600 ${style.fonts.mono}px "SFMono-Regular", Consolas, monospace; fill: ${style.colors.faint}; letter-spacing: 0; }
    .eyebrow { font: 700 18px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${style.colors.white}; letter-spacing: 0; }
  </style>`;
}

function tint(hex, opacity) {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function hashColor(value) {
  return value.replace(/[^a-zA-Z0-9]/g, '');
}
