// Bundles src/client (ESM) into the loader-compatible lib/client.js artifact:
// a single window.__ModuleLoader__.load({ id, factory }) module like the
// official dsh client bundles. `react` stays external (runtime platform seed).
//
// Usage: node scripts/build-client.mjs [--out <dir>]   # default out: lib
// Rebuilt bytes are served from host memory until restart — rebuild then restart dsh.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rolldown } from 'rolldown'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

let outDir = 'lib'
const args = process.argv.slice(2)
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out' && args[i + 1]) outDir = args[i + 1]
}

const ENTRY_ID = 'dsh-aemeath'

const bundle = await rolldown({
  input: join(ROOT, 'src', 'client', 'index.js'),
  platform: 'browser',
  // Only platform seed words are answered by the runtime loader's require;
  // everything else (this plugin's own modules) must be inlined.
  external: ['react'],
})

const { output } = await bundle.generate({
  format: 'cjs',
  // Plain `exports.x = ...` assignments (no __esModule marker, no wholesale
  // module.exports rewrite): the factory intro below provides the
  // module/exports locals the emitted code writes to, and the factory
  // returns module.exports — exactly the official bundle contract.
  exports: 'named',
  esModule: false,
  entryFileNames: 'client.js',
  sourcemap: true,
  banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ENTRY_ID)}, factory: (require) => {\n`,
  intro: 'var module = { exports: {} }\nvar exports = module.exports\nObject.defineProperty(exports, Symbol.toStringTag, { value: \'Module\' })\n',
  footer: '\nreturn module.exports\n} })\n',
})

const chunk = output[0]
const out = join(ROOT, outDir)
mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'client.js'), chunk.code)
if (chunk.map) {
  const mapText = typeof chunk.map.toString === 'function'
    ? chunk.map.toString()
    : JSON.stringify(chunk.map)
  writeFileSync(join(out, 'client.js.map'), mapText)
}

console.log(`wrote ${join(outDir, 'client.js')} (${chunk.code.length} bytes)` +
  (chunk.map ? ` + client.js.map` : ''))
