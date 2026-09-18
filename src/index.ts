/**
 * dsh-aemeath — host half (Node): wallpaper/spritesheet/stylesheet routes, the
 * pet state machine and the plugin settings namespace. `exports["."]` points at
 * the built `lib/index.js`; the browser half lives in `lib/client.js`.
 */
import type { Context } from '@deepseek-ai/cordis'
import { registerAssets } from './host/assets'
import { registerPetState } from './host/pet-state'
import { registerSettings } from './host/settings'

export const name = 'dsh-aemeath'

/** Hard dependency: the browser HTTP carrier that serves /dsh-aemeath/*. */
export const inject: string[] = ['webServer']

export function apply(ctx: Context): void {
  registerAssets(ctx)
  registerPetState(ctx)
  registerSettings(ctx)
}
