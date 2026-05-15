import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathExists } from './fs-utils.mjs';

export function hashValue(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

export async function readCache(outDir) {
  const file = cachePath(outDir);
  if (!(await pathExists(file))) return {};
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function writeCache(outDir, cache) {
  const file = cachePath(outDir);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

function cachePath(outDir) {
  return path.join(outDir, '.ai-diagram-cache.json');
}
