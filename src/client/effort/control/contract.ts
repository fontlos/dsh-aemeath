/**
 * Boundary contracts of the effort control: the injected faces the control
 * consumes (model directory, selection action, settings form) and the
 * inline-style helper for CSS custom properties. Structural types only — the
 * official packages stay behind this file, so a control module never binds to a
 * package subpath it does not actually use.
 *
 * The locale lookup lives with the dictionaries (`src/client/i18n.ts`) and is
 * re-exported here, because every control module takes it as an input.
 */
import type { CSSProperties } from 'react'
import type { ModelDirectoryState } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { AemeathSettings } from '../../../settings-contract'
import type { Translate } from '../../i18n'
import type { SnapshotSource } from '../../store'

export type { Translate }

/** The session's shared model directory (`ModelSelectInjected['directory']`). */
export type ModelDirectoryStore = SnapshotSource<ModelDirectoryState>

/** A complete provider/model/effort selection (`ModelSelection`). */
export interface ModelSelectionInput {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
}

/** Model selection action (`ModelSelectInjected['select']`). */
export type SelectModel = (selection: ModelSelectionInput) => Promise<unknown>

/**
 * The plugin's own configuration form (`ctx.configForms.get(entryId)`), keyed by
 * the Loader entry id our bundle patch inserts (`dsh-aemeath`).
 */
export type AemeathSettingsForm = ConfigForm<AemeathSettings>

/** Tier the slider currently points at. */
export type EffortMode = 'base' | 'high' | 'max'

/** Inline style carrying CSS custom properties (React passes `--*` through). */
export type CssVars = CSSProperties & Record<`--${string}`, string | number>
