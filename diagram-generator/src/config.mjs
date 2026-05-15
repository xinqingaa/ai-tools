import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathExists, resolveFrom } from './fs-utils.mjs';

export async function loadConfig(configPath) {
  if (!configPath) throw new Error('Missing --config <file>.');
  const absolutePath = path.resolve(process.cwd(), configPath);
  if (!(await pathExists(absolutePath))) throw new Error(`Config file not found: ${absolutePath}`);

  const raw = await readFile(absolutePath, 'utf8');
  const config = JSON.parse(raw);
  const baseDir = path.dirname(absolutePath);
  const workspace = resolveFrom(baseDir, config.workspace ?? '.');
  const outDir = resolveFrom(baseDir, config.outDir ?? 'diagrams');

  return {
    ...config,
    configPath: absolutePath,
    baseDir,
    workspace,
    outDir,
    sources: (config.sources ?? []).map((item) => resolveFrom(baseDir, item)),
    diagrams: config.diagrams ?? [],
    diagramCount: Number(config.diagramCount ?? config.diagrams?.length ?? 1),
    style: config.style ?? 'editorial',
    strict: config.strict !== false,
  };
}

export function normalizeGenerationOptions(args) {
  return {
    config: readOption(args, '--config') ?? readOption(args, '-c'),
    only: readOption(args, '--only'),
    svgOnly: args.includes('--svg-only'),
    png: args.includes('--png'),
    force: args.includes('--force'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

function readOption(args, name) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1];
  return undefined;
}
