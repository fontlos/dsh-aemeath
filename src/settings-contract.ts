/**
 * The Loader entry id this plugin's bundle patch inserts (`cordis.patch.yml`).
 * The settings system keys every configuration form by entry id, so the browser
 * half reads its values and writes its edits through this name.
 */
export const ENTRY_ID = 'dsh-aemeath'

/**
 * The plugin's settings value — one contract shared by the host Config schema
 * (`src/host/config.ts`) and the browser form (`ctx.configForms.get(ENTRY_ID)`).
 */
export interface AemeathSettings {
  /** Whether the desktop pet renders at all. */
  readonly petEnabled: boolean
  /** Whether the composer seat takes over the model slot with the effort slider. */
  readonly advancedEffort: boolean
  /** Max-tier animation style id (see `src/client/effort/fx.ts`). */
  readonly effortStyle: string
  /**
   * Master switch of the surface scheme. While it is on, the four surfaces below
   * override the shipped theme tokens; turning it off hands those surfaces back,
   * which is what a user running another appearance plugin wants.
   */
  readonly surfaceScheme: boolean
  /** Sidebar surface (`--dsw-specific-sidebar-fill`). */
  readonly sidebarColor: string
  readonly sidebarOpacity: number
  readonly sidebarBlur: number
  /** Settings panel and card surfaces (`--dsw-alias-bg-layer-1/2/3`, menus). */
  readonly panelColor: string
  readonly panelOpacity: number
  readonly panelBlur: number
  /** Conversation background (`--dsw-alias-bg-base`). */
  readonly chatColor: string
  readonly chatOpacity: number
  readonly chatBlur: number
  /** Composer card (`--dsw-specific-input-major`). */
  readonly inputColor: string
  readonly inputOpacity: number
  readonly inputBlur: number
}

/**
 * Defaults of that namespace: the host schema declares them, so a client that
 * has not read its section yet renders the same thing the host would resolve.
 *
 * A default only ever fills a field the stored section does not carry, so an
 * existing profile keeps every value it already wrote.
 */
export const DEFAULT_SETTINGS: AemeathSettings = {
  petEnabled: true,
  advancedEffort: false,
  effortStyle: 'starlight',
  surfaceScheme: true,
  sidebarColor: '#ffffff',
  sidebarOpacity: 0.6,
  sidebarBlur: 0,
  panelColor: '#ffffff',
  panelOpacity: 1,
  panelBlur: 0,
  chatColor: '#ffffff',
  chatOpacity: 0.25,
  chatBlur: 0,
  inputColor: '#ffffff',
  inputOpacity: 0.3,
  inputBlur: 30,
}
