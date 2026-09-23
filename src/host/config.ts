/**
 * The plugin's Config schema. Since 0.1.7 the settings service derives its forms
 * from a plugin's Config and exposes only the fields marked `.volatile()`, so
 * every editable preference is declared here — the Loader validates the profile
 * row's `config` against this schema at activation, and the browser half reads
 * the resolved values through `ctx.configForms.get(ENTRY_ID)`.
 *
 * Defaults live in the shared contract, so the schema and the client-side
 * fallbacks can never disagree.
 */
import z from '@deepseek-ai/schemastery'
import { DEFAULT_SETTINGS } from '../settings-contract'

/** Field schemas with their defaults; `Config` marks each one form-editable. */
const fields = {
  petEnabled: z.boolean().default(DEFAULT_SETTINGS.petEnabled),
  advancedEffort: z.boolean().default(DEFAULT_SETTINGS.advancedEffort),
  effortStyle: z.string().default(DEFAULT_SETTINGS.effortStyle),
  surfaceScheme: z.boolean().default(DEFAULT_SETTINGS.surfaceScheme),
  sidebarColor: z.string().default(DEFAULT_SETTINGS.sidebarColor),
  sidebarOpacity: z.number().default(DEFAULT_SETTINGS.sidebarOpacity),
  sidebarBlur: z.number().default(DEFAULT_SETTINGS.sidebarBlur),
  panelColor: z.string().default(DEFAULT_SETTINGS.panelColor),
  panelOpacity: z.number().default(DEFAULT_SETTINGS.panelOpacity),
  panelBlur: z.number().default(DEFAULT_SETTINGS.panelBlur),
  chatColor: z.string().default(DEFAULT_SETTINGS.chatColor),
  chatOpacity: z.number().default(DEFAULT_SETTINGS.chatOpacity),
  chatBlur: z.number().default(DEFAULT_SETTINGS.chatBlur),
  inputColor: z.string().default(DEFAULT_SETTINGS.inputColor),
  inputOpacity: z.number().default(DEFAULT_SETTINGS.inputOpacity),
  inputBlur: z.number().default(DEFAULT_SETTINGS.inputBlur),
}

/** Row config schema; a volatile field is one the settings form may edit. */
export const Config = z.object({
  petEnabled: fields.petEnabled.volatile(),
  advancedEffort: fields.advancedEffort.volatile(),
  effortStyle: fields.effortStyle.volatile(),
  surfaceScheme: fields.surfaceScheme.volatile(),
  sidebarColor: fields.sidebarColor.volatile(),
  sidebarOpacity: fields.sidebarOpacity.volatile(),
  sidebarBlur: fields.sidebarBlur.volatile(),
  panelColor: fields.panelColor.volatile(),
  panelOpacity: fields.panelOpacity.volatile(),
  panelBlur: fields.panelBlur.volatile(),
  chatColor: fields.chatColor.volatile(),
  chatOpacity: fields.chatOpacity.volatile(),
  chatBlur: fields.chatBlur.volatile(),
  inputColor: fields.inputColor.volatile(),
  inputOpacity: fields.inputOpacity.volatile(),
  inputBlur: fields.inputBlur.volatile(),
})
