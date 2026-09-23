// Builds both halves of the plugin with rolldown:
//   host   src/index.ts         -> lib/index.js   (Node ESM; lazy deps external)
//   client src/client/index.js  -> lib/client.js  (one loader module; react external)
//
// Rolldown performs every transform, including TypeScript and the automatic JSX
// runtime — the latter is aliased to src/client/jsx-runtime.ts because the dsh
// platform seed table exposes `react` but no `react/jsx-runtime`.
//
// Usage: node scripts/build.mjs
// Rebuilt bytes are served from host memory until restart — rebuild, then restart dsh.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rolldown } from 'rolldown'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT = join(ROOT, 'lib')
const ENTRY_ID = 'dsh-aemeath'

function fail(message) {
  console.error(`build failed: ${message}`)
  process.exit(1)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

mkdirSync(OUT, { recursive: true })

// ---------------------------------------------------------------- host half
const host = await rolldown({
  input: join(ROOT, 'src', 'index.ts'),
  platform: 'node',
  // Resolved from the plugin package at runtime (it is a dependency): the host
  // bundle must keep it a bare import rather than inlining a second copy, so the
  // schema it hands the Loader comes from the same package the harness uses.
  external: [/^node:/, '@deepseek-ai/schemastery'],
})
const hostOutput = await host.generate({ format: 'esm', entryFileNames: 'index.js', sourcemap: true })
const hostChunk = hostOutput.output[0]
assert(hostChunk !== undefined, 'host build emitted no chunk')
assert(
  /(?:import|from)\s*[^\n]*["']@deepseek-ai\/schemastery["']/.test(hostChunk.code),
  'host bundle no longer imports @deepseek-ai/schemastery by name',
)
assert(
  !/z\.object\s*=|function object\(/.test(hostChunk.code),
  'host bundle inlined schemastery — it must stay an external import',
)
assert(!/["']react["']/.test(hostChunk.code), 'host bundle references react — client code leaked into the host build')

// -------------------------------------------------------------- client half
const client = await rolldown({
  input: join(ROOT, 'src', 'client', 'index.ts'),
  platform: 'browser',
  transform: { jsx: 'react-jsx' },
  resolve: { alias: { 'react/jsx-runtime': join(ROOT, 'src', 'client', 'jsx-runtime.ts') } },
  // Only platform seed words are answered by the loader's require.
  external: ['react'],
})
const clientOutput = await client.generate({
  format: 'cjs',
  // Plain `exports.x = ...` assignments (no __esModule marker, no wholesale
  // module.exports rewrite): the factory intro below provides the module/exports
  // locals the emitted code writes to, and the factory returns module.exports —
  // the official bundle contract.
  exports: 'named',
  esModule: false,
  entryFileNames: 'client.js',
  sourcemap: true,
  banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ENTRY_ID)}, factory: (require) => {\n`,
  intro: 'var module = { exports: {} }\nvar exports = module.exports\nObject.defineProperty(exports, Symbol.toStringTag, { value: \'Module\' })\n',
  footer: '\nreturn module.exports\n} })\n',
})
const clientChunk = clientOutput.output[0]
assert(clientChunk !== undefined, 'client build emitted no chunk')
// The alias inlines the shim, so any surviving `require('react/jsx-runtime')`
// means JSX fell through to the (unseeded) runtime module.
assert(
  !/require\(\s*["'][^"']*jsx-runtime[^"']*["']/.test(clientChunk.code),
  'client bundle requires react/jsx-runtime — the JSX alias did not apply',
)
assert(
  !/require\(\s*["']@deepseek-ai\//.test(clientChunk.code),
  'client bundle imports an @deepseek-ai package by value — the platform module table cannot answer it',
)
assert(
  (clientChunk.code.match(/__ModuleLoader__\.load/g) ?? []).length === 1,
  'client bundle must register exactly one loader module',
)

function write(name, chunk) {
  writeFileSync(join(OUT, name), chunk.code)
  if (chunk.map !== undefined && chunk.map !== null) {
    const text = typeof chunk.map.toString === 'function' ? chunk.map.toString() : JSON.stringify(chunk.map)
    writeFileSync(join(OUT, `${name}.map`), text)
  }
  // Byte length, not code-unit length: the bundles carry CJK copy, so the two
  // differ and only this one matches the file on disk.
  console.log(`  lib/${name}  ${Buffer.byteLength(chunk.code)} bytes`)
}

console.log('built:')
write('index.js', hostChunk)
write('client.js', clientChunk)
