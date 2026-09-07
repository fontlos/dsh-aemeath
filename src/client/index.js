// dsh-aemeath client entry (browser half) — ESM source.
//
// scripts/build-client.mjs (rolldown) bundles this module into lib/client.js
// as a single loader-compatible artifact:
//   window.__ModuleLoader__.load({ id: 'dsh-aemeath', factory: (require) => {...} })
// whose factory returns this module's exports — the Cordis plugin object the
// web boot mounts. Feature modules are plain ESM; only `react` stays external
// (resolved at runtime by the loader's platform seed table).

import { mount as mountSkin } from './skin.js'
import { mount as mountPet } from './pet.js'
import { mount as mountSettings } from './settings.js'

const name = 'dsh-aemeath'

// Hard dependency on the slot registry: the loader only activates this fiber
// once `slots` is live, so the pet/skin registration is guaranteed (the
// loader never runs apply() before the SlotRegistry service exists).
const inject = ['slots']

function apply(ctx) {
  // Order matters: skin + pet are unconditional, settings attaches softly.
  mountSkin(ctx)
  mountPet(ctx)
  mountSettings(ctx)
}

export { apply, inject, name }
