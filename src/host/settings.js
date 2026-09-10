/**
 * Plugin settings (dsh-aemeath namespace): pet visibility + the "advanced
 * effort" toggle and its max-tier animation style, persisted per profile.
 * (Renamed from `dsh-modef` in 0.3.0 — old values are not migrated.)
 *
 * dsh-settings / schemastery are imported lazily, never statically: under a
 * `link:` local install they may be absent from this folder and a static
 * import would crash the plugin tree at boot; failures only disable settings
 * (skin/pet keep working).
 */

let schemaPromise = null

/** Load (once) the settings namespace handle + schemastery config schema. */
function loadSchema() {
    if (!schemaPromise) {
        schemaPromise = Promise.all([
            import('@deepseek-ai/dsh-settings'),
            import('@deepseek-ai/schemastery'),
        ]).then(([settingsMod, schemasteryMod]) => {
            const settingsNamespace = settingsMod.settingsNamespace
            const z = schemasteryMod.default ?? schemasteryMod
            const ns = settingsNamespace('dsh-aemeath')
            const config = z.object({
                petEnabled: z.boolean().default(true),
                advancedEffort: z.boolean().default(false),
                effortStyle: z.string().default('starlight'),
            })
            return { ns, config }
        })
    }
    return schemaPromise
}

/** Register the namespace. Soft dependency: ctx.inject so skin/pet survive hosts without settings. */
export function registerSettings(ctx) {
    ctx.inject(['settings'], async (sctx) => {
        try {
            const { ns, config } = await loadSchema()
            sctx.settings.register(ns, config)
        } catch (err) {
            console.warn(
                '[dsh-aemeath] settings unavailable:',
                err instanceof Error ? err.message : String(err),
                '— for link:/local installs run `npm install` in the plugin folder (needs @deepseek-ai/dsh-settings + @deepseek-ai/schemastery).',
            )
        }
    })
}
