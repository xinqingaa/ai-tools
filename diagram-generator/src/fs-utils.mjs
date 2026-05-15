import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function pathExists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

export async function readText(file) {
  return readFile(file, 'utf8');
}

export async function writeTextIfChanged(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  if (await pathExists(file)) {
    const current = await readFile(file, 'utf8');
    if (current === content) return false;
  }
  await writeFile(file, content, 'utf8');
  return true;
}

export function resolveFrom(baseDir, value) {
  return path.isAbsolute(value) ? value : path.resolve(baseDir, value);
}

export function toPosix(value) {
  return value.split(path.sep).join('/');
}
