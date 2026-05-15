import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { loadConfig, normalizeGenerationOptions } from './config.mjs';
import { readMarkdownSources } from './markdown.mjs';
import { buildDiagramSpecs } from './spec.mjs';
import { renderSvg } from './render-svg.mjs';
import { checkDiagram } from './qa.mjs';
import { renderPngFiles } from './png.mjs';
import { readCache, writeCache, hashValue } from './cache.mjs';
import { writeTextIfChanged } from './fs-utils.mjs';

export async function runCli(argv) {
  const command = argv[0] ?? 'help';
  const args = argv.slice(1);
  if (command === 'help' || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }
  if (!['generate', 'check', 'plan'].includes(command)) {
    throw new Error(`Unknown command: ${command}`);
  }

  const options = normalizeGenerationOptions(args);
  const config = await loadConfig(options.config);
  const docs = await readMarkdownSources(config.sources);
  const specs = selectSpecs(buildDiagramSpecs(config, docs), options.only);

  if (command === 'plan') {
    console.log(JSON.stringify(specs, null, 2));
    return;
  }

  await mkdir(config.outDir, { recursive: true });
  const cache = await readCache(config.outDir);
  const pngQueue = [];
  const results = [];

  for (const spec of specs) {
    const { svg, layout } = renderSvg(spec);
    const check = checkDiagram(spec, layout);
    const base = path.join(config.outDir, spec.slug);
    const jsonPath = `${base}.json`;
    const svgPath = `${base}.svg`;
    const pngPath = `${base}.png`;
    const inputHash = hashValue({ spec, sourceHashes: docs.map((doc) => hashValue({ path: doc.path, content: doc.content })) });
    const cacheHit = cache[spec.slug]?.hash === inputHash;

    if (config.strict && !check.ok) {
      results.push({ spec, check, skipped: true, reason: 'qa-failed' });
      continue;
    }

    if (command === 'generate' && !options.dryRun) {
      const payload = {
        schemaVersion: 1,
        spec,
        check,
        sourceFiles: spec.sourceFiles,
      };
      const jsonChanged = await writeTextIfChanged(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
      const svgChanged = await writeTextIfChanged(svgPath, svg);
      const shouldRenderPng = !options.svgOnly && (options.force || options.png || !cacheHit || svgChanged);
      if (shouldRenderPng) pngQueue.push({ svg, outPath: pngPath, slug: spec.slug });
      cache[spec.slug] = { hash: inputHash, jsonPath, svgPath, pngPath };
      results.push({ spec, check, jsonChanged, svgChanged, pngQueued: shouldRenderPng, cacheHit });
    } else {
      results.push({ spec, check, dryRun: true, cacheHit });
    }
  }

  if (command === 'generate' && pngQueue.length) {
    await renderPngFiles(pngQueue);
  }
  if (command === 'generate' && !options.dryRun) await writeCache(config.outDir, cache);

  printResults(command, config, results, pngQueue);
  const failed = results.filter((item) => !item.check.ok);
  if (failed.length) process.exitCode = 1;
}

function selectSpecs(specs, only) {
  if (!only) return specs;
  const wanted = new Set(String(only).split(',').map((item) => item.trim()).filter(Boolean));
  return specs.filter((spec, index) => wanted.has(String(index + 1)) || wanted.has(spec.slug) || wanted.has(spec.id));
}

function printResults(command, config, results, pngQueue) {
  console.log(`${command === 'generate' ? 'Generated' : 'Checked'} ${results.length} diagram(s).`);
  console.log(`Output: ${config.outDir}`);
  for (const result of results) {
    const status = result.check.ok ? 'ok' : 'failed';
    const png = command === 'generate'
      ? result.pngQueued ? ', png' : result.cacheHit ? ', cached png' : ''
      : '';
    console.log(`- ${result.spec.slug}: ${status}${result.svgChanged ? ', svg' : ''}${result.jsonChanged ? ', json' : ''}${png}`);
    for (const issue of result.check.issues) console.log(`  - ${issue}`);
  }
  if (pngQueue.length) console.log(`Rendered PNG: ${pngQueue.length}`);
}

function printHelp() {
  console.log(`Usage:
  ai-diagram generate --config ./diagram.config.json
  ai-diagram check --config ./diagram.config.json
  ai-diagram plan --config ./diagram.config.json

Options:
  --config, -c   JSON config file. Required.
  --only         Diagram index, id, or slug. Comma-separated.
  --svg-only     Write JSON/SVG and skip PNG export.
  --png          Force PNG export for selected diagrams.
  --force        Ignore cache and rewrite PNG.
  --dry-run      Plan and check without writing files.
  --verbose      Reserved for more detailed logs.
`);
}
