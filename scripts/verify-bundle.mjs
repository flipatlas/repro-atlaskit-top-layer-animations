#!/usr/bin/env node
/**
 * Post-build check.
 *
 * Webpack silently accepts imports of symbols that don't exist in a valid ESM
 * module (unlike Vite/rolldown, which errors out). So a build against a broken
 * @atlaskit/top-layer@1.6.1 succeeds, but the resulting bundle throws at
 * runtime in the browser with
 *
 *   Uncaught TypeError: (0 , sv.slideAndFade) is not a function
 *
 * This script asserts on the compiled bundle instead:
 *   - The empty barrel `entry-points/animations.js` MUST be resolvable AND
 *     export the symbols consumers import from it.
 *   - If it doesn't, we exit non-zero with a diagnosis.
 */
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const tlDir = dirname(require.resolve('@atlaskit/top-layer/package.json'));
const tlVersion = JSON.parse(readFileSync(resolve(tlDir, 'package.json'), 'utf8')).version;
const barrelEsm = resolve(tlDir, 'dist/esm/entry-points/animations.js');
const barrelSize = statSync(barrelEsm).size;

console.log(`@atlaskit/top-layer:      ${tlVersion}`);
console.log(`entry-points/animations:  ${barrelSize} bytes  (${barrelEsm.slice(root.length + 1)})`);

const REQUIRED = ['fade', 'slideAndFade', 'popupMotion', 'dialogMotion'];
const animations = require('@atlaskit/top-layer/animations');
const missing = REQUIRED.filter((sym) => typeof animations[sym] === 'undefined');

if (missing.length === 0) {
  console.log(`\n\u2705 Bundle is safe. All symbols consumed by @atlaskit consumers are present.`);
  process.exit(0);
}

console.log(`\n\u274c Bundle will crash at runtime. Missing symbols in @atlaskit/top-layer/animations:`);
for (const sym of missing) console.log(`   \u2022 ${sym}`);
console.log(`\nExpected browser error: Uncaught TypeError: (0 , sv.slideAndFade) is not a function`);
console.log(`\nFix: pin @atlaskit/top-layer to 1.6.0 via Yarn resolutions in package.json:`);
console.log(`\n  "resolutions": {`);
console.log(`    "@atlaskit/top-layer": "1.6.0"`);
console.log(`  }\n`);
process.exit(1);
