#!/usr/bin/env node

import { runCli } from '../src/cli.mjs';

runCli(process.argv.slice(2)).catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
