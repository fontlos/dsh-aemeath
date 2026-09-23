import type { Context } from '@deepseek-ai/cordis'
// Carries the `Context.settings` augmentation (type-only: nothing is imported
// at runtime — the service is provided by the harness).
import type {} from '@deepseek-ai/dsh-settings'

/**
 * Declare that this plugin brings its own settings page, so the shell never
 * generates one from the Config schema (every page it would draw is already
 * drawn by our own `settings.section` contributor).
 *
 * A soft dependency in the shape the settings package documents: the child
 * `inject` names the plugin fiber the policy belongs to, so a late-loading or
 * replaced settings service still picks it up, and the skin, the pet and the
 * seat keep working without it.
 */
export function registerSettingsPage(ctx: Context): void {
  ctx.inject(['settings'], (child) => {
    child.effect(
      () => child.settings.configure({ auto: false }, ctx.fiber),
      'dsh-aemeath: settings page policy',
    )
  })
}
