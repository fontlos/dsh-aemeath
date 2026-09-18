/**
 * dsh-aemeath client entry (browser half).
 *
 * scripts/build.mjs (rolldown) bundles this module into lib/client.js as a
 * single loader-compatible artifact:
 *   window.__ModuleLoader__.load({ id: 'dsh-aemeath', factory: (require) => {...} })
 * whose factory returns this module's exports — the Cordis plugin object the
 * web boot mounts. Only `react` stays external (resolved at runtime by the
 * loader's platform seed table).
 */
import type { Context } from '@deepseek-ai/cordis'
import { mount as mountSkin } from './skin'
import { mount as mountPet } from './pet'
import { mount as mountSettings } from './settings'

export const name = 'dsh-aemeath'

// Hard dependency on the slot registry: the loader only activates this fiber
// once `slots` is live, so the pet/skin registration is guaranteed (the
// loader never runs apply() before the SlotRegistry service exists).
export const inject: string[] = ['slots']

export function apply(ctx: Context): void {
  // Order matters: skin + pet are unconditional, settings attaches softly.
  mountSkin(ctx)
  mountPet(ctx)
  mountSettings(ctx)
}
