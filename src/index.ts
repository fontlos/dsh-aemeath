/**
 * dsh-aemeath — host half (Node): wallpaper/spritesheet/stylesheet routes, the
 * pet state machine and the plugin configuration schema. `exports["."]` points
 * at the built `lib/index.js`; the browser half lives in `lib/client.js`.
 */
import type { Context } from '@deepseek-ai/cordis'
import { registerAssets } from './host/assets'
import { Config } from './host/config'
import { registerPetState } from './host/pet-state'
import { registerSettingsPage } from './host/settings'

export const name = 'dsh-aemeath'

/**
 * The Loader validates the profile row's `config` against this schema at
 * activation and hands the resolved values to `apply`. The browser half reads
 * the same values through its configuration form, so the host keeps no copy.
 */
export { Config }

/** Hard dependency: the browser HTTP carrier that serves /dsh-aemeath/*. */
export const inject: string[] = ['webServer']

export function apply(ctx: Context): void {
  registerAssets(ctx)
  registerPetState(ctx)
  registerSettingsPage(ctx)
}
