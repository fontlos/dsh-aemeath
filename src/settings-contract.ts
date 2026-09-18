/**
 * The plugin's settings namespace value — one contract shared by the host schema
 * (`src/host/settings.ts`) and the client scopes (`dsh-aemeath` namespace).
 */
export interface AemeathSettings {
  /** Whether the desktop pet renders at all. */
  readonly petEnabled: boolean
  /** Whether the composer seat takes over the model slot with the effort slider. */
  readonly advancedEffort: boolean
  /** Max-tier animation style id (see `src/client/effort/fx.ts`). */
  readonly effortStyle: string
}

/**
 * Defaults of that namespace: the host schema declares them, so a client that
 * has not read its section yet renders the same thing the host would resolve.
 */
export const DEFAULT_SETTINGS: AemeathSettings = {
  petEnabled: true,
  advancedEffort: false,
  effortStyle: 'starlight',
}
