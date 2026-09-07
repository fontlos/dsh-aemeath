/**
 * dsh-aemeath — host half (Node). Mounts the three src/host features:
 * asset/stylesheet routes, the pet status machine, and plugin settings.
 * exports["."] points here; lib/ holds only the client bundle artifact.
 */

import { registerAssets } from './host/assets.js'
import { registerPetState } from './host/pet-state.js'
import { registerSettings } from './host/settings.js'

const name = 'dsh-aemeath'

/** Hard dependency: the browser HTTP carrier (registers /dsh-aemeath/* routes). */
const inject = ['webServer']

function apply(ctx) {
    registerAssets(ctx)
    registerPetState(ctx)
    registerSettings(ctx)
}

export { apply, inject, name }
