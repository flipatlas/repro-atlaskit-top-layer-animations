#!/usr/bin/env node
/**
 * Prints, for each affected @atlaskit consumer, exactly what it imports from
 * @atlaskit/top-layer/animations and what top-layer currently exports at that
 * subpath. Then attempts a runtime import so the failure surfaces with a stack.
 */
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const CONSUMERS = [
  { pkg: '@atlaskit/tooltip',      needs: ['fade', 'slideAndFade'] },
  { pkg: '@atlaskit/select',       needs: ['slideAndFade'] },
  { pkg: '@atlaskit/popup',        needs: ['popupMotion'] },
  { pkg: '@atlaskit/modal-dialog', needs: ['dialogMotion'] },
];

const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);

console.log('\n=== @atlaskit/top-layer installed metadata ===');
const tlPkgPath = require.resolve('@atlaskit/top-layer/package.json');
const tlPkg = JSON.parse(readFileSync(tlPkgPath, 'utf8'));
console.log(`  version:              ${tlPkg.version}`);

const tlDir = dirname(tlPkgPath);
const barrelPaths = {
  esm:   resolve(tlDir, 'dist/esm/entry-points/animations.js'),
  cjs:   resolve(tlDir, 'dist/cjs/entry-points/animations.js'),
  types: resolve(tlDir, 'dist/types/entry-points/animations.d.ts'),
};
for (const [k, p] of Object.entries(barrelPaths)) {
  try {
    const sz = statSync(p).size;
    console.log(`  ${pad(k + ':', 22)}${sz} bytes  (${p.slice(root.length + 1)})`);
  } catch {
    console.log(`  ${pad(k + ':', 22)}MISSING  (${p.slice(root.length + 1)})`);
  }
}

console.log('\n=== Consumers that import from top-layer/animations ===');
for (const c of CONSUMERS) {
  const consumerPkg = JSON.parse(readFileSync(require.resolve(`${c.pkg}/package.json`), 'utf8'));
  console.log(`  ${pad(c.pkg, 26)}v${consumerPkg.version}   imports: ${c.needs.join(', ')}`);
}

console.log('\n=== Runtime import attempt of @atlaskit/top-layer/animations ===');
// Load via CJS to match the bundler's behaviour (Rspack/Webpack use CJS resolution).
// Node's ESM loader refuses subpath imports for packages without a strict `exports`
// field, but bundlers happily follow the `package.json` "module"/"main" entries.
let animations;
try {
  animations = require('@atlaskit/top-layer/animations');
  const keys = Object.keys(animations).filter((k) => k !== 'default' && k !== '__esModule');
  console.log(`  loaded module, exported symbols: [${keys.join(', ') || '(none)'}]`);
} catch (err) {
  console.log(`  \u274c require threw: ${err.message}`);
  process.exit(2);
}

let anyMissing = false;
for (const c of CONSUMERS) {
  for (const symbol of c.needs) {
    const val = animations[symbol];
    const ok = typeof val !== 'undefined';
    if (!ok) anyMissing = true;
    console.log(`  ${ok ? '\u2705' : '\u274c'} ${pad(c.pkg + ' \u2192 ' + symbol, 44)}${ok ? typeof val : 'undefined'}`);
  }
}

console.log('\n=== Simulated runtime call (what actually crashes in the browser) ===');
// This mirrors the exact TypeError users see:
//   Uncaught TypeError: (0 , sv.slideAndFade) is not a function
try {
  const styles = animations.slideAndFade({ placement: 'bottom' });
  console.log(`  animations.slideAndFade({placement:'bottom'}) =`, styles);
  console.log('  \u2705 succeeded');
} catch (err) {
  console.log(`  \u274c ${err.constructor.name}: ${err.message}`);
  anyMissing = true;
}

console.log('');
if (anyMissing) {
  console.log('RESULT: broken \u2014 pin @atlaskit/top-layer to a version whose animations barrel is populated (1.6.0 works).');
  process.exit(1);
} else {
  console.log('RESULT: barrel is populated. All consumer symbols are defined and callable.');
}
