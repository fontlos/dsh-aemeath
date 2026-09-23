/**
 * Model directory → control data. `useModelData` subscribes to the directory
 * store and the optional configuration form (live effort-style preference), then
 * derives the flat model list, the current selection and the effort tiers shared
 * by the picker, the slider and the max-tier effects.
 */
import { useEffect, useState } from 'react'
import type { ModelCatalogModel, ModelProviderGroup } from '@deepseek-ai/dsh-api-session-controller/types'
import type { ModelDirectoryState } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type { ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { AemeathSettings } from '../../../settings-contract'
import type { EffectStyleId } from '../fx'
import { resolveStyle } from '../fx'
import type { SnapshotSelector } from '../../store'
import { bindSnapshotSelector } from '../../store'
import type { AemeathSettingsForm, ModelDirectoryStore, Translate } from './contract'

export type { Translate }

/** One effort tier of the current model. */
export interface EffortStop {
  readonly id: string | undefined
  readonly name: string | undefined
  readonly description: string | undefined
}

/** One selectable model inside its provider group. */
export interface ModelChoice {
  readonly group: ModelProviderGroup
  readonly model: ModelCatalogModel
}

/** Everything the control renders, derived from one directory snapshot. */
export interface ModelData {
  readonly state: ModelDirectoryState
  readonly busy: boolean
  readonly choices: readonly ModelChoice[]
  readonly currentChoice: ModelChoice | null
  readonly stops: readonly EffortStop[]
  readonly stopIndex: number
  readonly modelLabel: string
  readonly effortLabel: string | undefined
  readonly showEffort: boolean
  readonly committedRatio: number
}

/** Subscribe a directory store (`{ subscribe, getSnapshot }`) to React. */
function useDirectoryState(directory: ModelDirectoryStore): ModelDirectoryState {
  const [, force] = useState(0)
  useEffect(() => directory.subscribe(() => force((value) => value + 1)), [directory])
  return directory.getSnapshot()
}

/**
 * Derive everything the control needs from one directory snapshot.
 * Pure: no state, no side effects — same inputs produce the same outputs.
 */
export function deriveModelData(state: ModelDirectoryState, t: Translate): ModelData {
  const choices: ModelChoice[] = []
  for (const group of state.groups) {
    for (const model of group.models) choices.push({ group, model })
  }

  const current = state.current
  let currentChoice: ModelChoice | null = null
  if (current !== null) {
    const found = choices.findIndex((choice) => choice.group.id === current.provider && choice.model.id === current.model)
    currentChoice = found >= 0 ? (choices[found] ?? null) : null
  }

  const reasoning = currentChoice?.model.reasoning
  const effectiveEffort =
    current !== null && current.reasoningEffort !== undefined ? current.reasoningEffort : reasoning?.defaultEffort

  // Effort tiers of the current model, most specific first: a leading
  // "no effort" entry appears only when the model ships no default.
  const stops: EffortStop[] = []
  if (reasoning !== undefined) {
    if (reasoning.defaultEffort === undefined) {
      stops.push({ id: undefined, name: t('effort.default'), description: undefined })
    }
    for (const effort of reasoning.efforts) {
      stops.push({ id: effort.id, name: effort.name, description: effort.description })
    }
  }
  let stopIndex = stops.findIndex((stop) => stop.id === effectiveEffort)
  if (stopIndex < 0) {
    const fallback = reasoning === undefined ? -1 : stops.findIndex((stop) => stop.id === reasoning.defaultEffort)
    stopIndex = fallback >= 0 ? fallback : 0
  }

  const stop = stops[stopIndex]
  return {
    state,
    busy: state.status === 'selecting',
    choices,
    currentChoice,
    stops,
    stopIndex,
    modelLabel: currentChoice !== null ? currentChoice.model.name : t('trigger.fallback'),
    effortLabel: stop === undefined ? undefined : stop.name,
    showEffort: stops.length >= 1,
    committedRatio: stops.length > 1 ? stopIndex / (stops.length - 1) : 1,
  }
}

export interface ModelDataInput {
  readonly directory: ModelDirectoryStore
  /** Soft dependency: absent on hosts without the settings service. */
  readonly settingsForm: AemeathSettingsForm | undefined
  readonly initialStyle: string | undefined
  readonly t: Translate
}

export interface ModelDataResult extends ModelData {
  readonly activeStyle: EffectStyleId
  readonly fxSprayFlow: boolean
  readonly fxStarlight: boolean
}

/** All render-time inputs of the control: directory data + live effort style. */
export function useModelData({ directory, settingsForm, initialStyle, t }: ModelDataInput): ModelDataResult {
  const useStyleScope: SnapshotSelector<ConfigFormSnapshot<AemeathSettings>> | null =
    settingsForm === undefined ? null : bindSnapshotSelector(settingsForm)
  const styleSnap = useStyleScope === null ? null : useStyleScope((snapshot) => snapshot)

  let liveStyle = initialStyle
  if (styleSnap?.status === 'ready' && typeof styleSnap.value?.effortStyle === 'string') {
    liveStyle = styleSnap.value.effortStyle
  }
  const activeStyle = resolveStyle(liveStyle)
  return {
    ...deriveModelData(useDirectoryState(directory), t),
    activeStyle,
    fxSprayFlow: activeStyle === 'spray-flow',
    fxStarlight: activeStyle === 'starlight',
  }
}
