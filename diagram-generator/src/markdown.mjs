import path from 'node:path';
import { readText } from './fs-utils.mjs';

export async function readMarkdownSources(files) {
  const docs = [];
  for (const file of files) {
    const content = await readText(file);
    docs.push(parseMarkdownDocument(file, content));
  }
  return docs;
}

export function parseMarkdownDocument(file, content) {
  const lines = content.split(/\r?\n/);
  const headings = [];
  const bullets = [];
  const tables = [];
  const codeBlocks = [];
  let currentCode = null;
  let currentTable = null;

  lines.forEach((line, index) => {
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      if (currentCode) {
        codeBlocks.push({ ...currentCode, endLine: index + 1 });
        currentCode = null;
      } else {
        currentCode = { lang: fence[1]?.trim() ?? '', startLine: index + 1, lines: [] };
      }
      return;
    }
    if (currentCode) {
      currentCode.lines.push(line);
      return;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      currentTable = null;
      headings.push({ level: heading[1].length, text: cleanInline(heading[2]), line: index + 1 });
      return;
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      currentTable = null;
      bullets.push({ text: cleanInline(bullet[1]), line: index + 1, section: nearestHeading(headings)?.text ?? '' });
      return;
    }

    if (/^\s*\|.+\|\s*$/.test(line)) {
      if (!currentTable) {
        currentTable = { startLine: index + 1, rows: [] };
        tables.push(currentTable);
      }
      currentTable.rows.push(line);
      return;
    }

    if (line.trim()) currentTable = null;
  });

  return {
    path: file,
    name: path.basename(file),
    content,
    headings,
    bullets,
    tables,
    codeBlocks,
    summary: {
      headings: headings.length,
      bullets: bullets.length,
      tables: tables.length,
      codeBlocks: codeBlocks.length,
    },
  };
}

export function cleanInline(value) {
  return String(value ?? '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~]/g, '')
    .trim();
}

function nearestHeading(headings) {
  return headings.at(-1);
}
