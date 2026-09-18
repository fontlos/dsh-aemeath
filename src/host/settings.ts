import type { Context } from '@deepseek-ai/cordis'
// Carries the `Context.settings` augmentation (type-only: nothing is imported
// at runtime — the service is provided by the harness).
import type {} from '@deepseek-ai/dsh-settings'
import { DEFAULT_SETTINGS } from '../settings-contract'

/**
 * Plugin settings namespace (`dsh-aemeath`): pet visibility, the advanced-effort
 * toggle and its max-tier animation style, persisted per profile.
 *
 * `@deepseek-ai/dsh-settings` / `@deepseek-ai/schemastery` resolve from the
 * profile tree at runtime, so they are imported dynamically: under a `link:`
 * install they live outside this folder and a static import would crash the
 * plugin tree at boot. A failure only disables this feature.
 */
type Schemastery = typeof import('@deepseek-ai/schemastery').default

let schema: ReturnType<typeof loadSchema> | undefined

function loadSchema() {
  return import('@deepseek-ai/schemastery').then((module) => {
    // The constructors live on the default export; the fallback covers runtimes
    // that hand back the namespace object directly.
    const z = ((module as { default?: Schemastery }).default ?? module) as Schemastery
    return z.object({
      petEnabled: z.boolean().default(DEFAULT_SETTINGS.petEnabled),
      advancedEffort: z.boolean().default(DEFAULT_SETTINGS.advancedEffort),
      effortStyle: z.string().default(DEFAULT_SETTINGS.effortStyle),
    })
  })
}

/** Register the namespace; a soft dependency, so skin/pet survive without it. */
export function registerSettings(ctx: Context): void {
  ctx.inject(['settings'], (sctx) => {
    schema ??= loadSchema()
    void schema.then(
      (config) => {
        sctx.settings.register('dsh-aemeath', config)
      },
      (error: unknown) => {
        console.warn(
          '[dsh-aemeath] settings unavailable:',
          error instanceof Error ? error.message : String(error),
          '— for link:/local installs run `pnpm install` in the plugin folder.',
        )
      },
    )
  })
}
