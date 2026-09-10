// Model directory → control data. useModelData subscribes to the directory
// store and the optional settings scope (live effort-style preference), then
// derives the flat model list, current selection and effort stops shared by
// the picker, the slider and the max-tier effects.

import React from 'react'
import { bindSnapshotSelector } from '../store.js'
import { resolveStyle } from '../fx.js'

/** Subscribe a directory store ({ subscribe, getSnapshot }) to React. */
function useDirectoryState(directory) {
  const [, force] = React.useState(0)
  React.useEffect(() => directory.subscribe(() => force((v) => v + 1)), [directory])
  return directory.getSnapshot()
}

/**
 * Derive everything the control needs from one directory snapshot.
 * Pure: no state, no side effects — same inputs produce the same outputs.
 */
export function deriveModelData(state, t) {
  const choices = []
  for (let gi = 0; gi < state.groups.length; gi++) {
    const group = state.groups[gi]
    for (let mi = 0; mi < group.models.length; mi++) choices.push({ group, model: group.models[mi] })
  }

  let currentChoice = null
  if (state.current != null) {
    const found = choices.findIndex(
      (c) => c.group.id === state.current.provider && c.model.id === state.current.model,
    )
    currentChoice = found >= 0 ? choices[found] : null
  }

  const reasoning = currentChoice != null ? currentChoice.model.reasoning : undefined
  const effectiveEffort = state.current != null && state.current.reasoningEffort !== undefined
    ? state.current.reasoningEffort
    : (reasoning !== undefined ? reasoning.defaultEffort : undefined)

  // Effort tiers ("stops") of the current model, most specific first:
  // a leading "no effort" entry appears only when the model ships no default.
  const stops = []
  if (reasoning !== undefined) {
    if (reasoning.defaultEffort === undefined) stops.push({ id: undefined, name: t('effort.default'), description: undefined })
    const efforts = reasoning.efforts || []
    for (let i = 0; i < efforts.length; i++) stops.push({ id: efforts[i].id, name: efforts[i].name, description: efforts[i].description })
  }
  let stopIndex = stops.findIndex((s) => s.id === effectiveEffort)
  if (stopIndex < 0) {
    let di = -1
    if (reasoning !== undefined) di = stops.findIndex((s) => s.id === reasoning.defaultEffort)
    stopIndex = di >= 0 ? di : 0
  }

  const modelLabel = currentChoice != null ? currentChoice.model.name : t('trigger.fallback')
  const effortLabel = stops.length > 0 ? stops[stopIndex].name : undefined
  const showEffort = stops.length >= 1
  const committedRatio = stops.length > 1 ? stopIndex / (stops.length - 1) : 1

  return {
    state,
    busy: state.status === 'selecting',
    choices,
    currentChoice,
    stops,
    stopIndex,
    modelLabel,
    effortLabel,
    showEffort,
    committedRatio,
  }
}

/**
 * All render-time inputs of the control:
 *  - directory snapshot + derived data (deriveModelData)
 *  - live effort style from the settings scope (falls back to initialStyle)
 *
 * settingsScope is a soft dependency: when absent the style scope hook is not
 * mounted at all (stable across the control's lifetime, like the official UI).
 */
export function useModelData({ directory, settingsScope, initialStyle, t }) {
  const useStyleScope = settingsScope ? bindSnapshotSelector(settingsScope) : null
  const styleSnap = useStyleScope ? useStyleScope((s) => s) : null

  let liveStyle = initialStyle
  if (styleSnap && styleSnap.status === 'ready' && styleSnap.value && typeof styleSnap.value.effortStyle === 'string') {
    liveStyle = styleSnap.value.effortStyle
  }
  const activeStyle = resolveStyle(liveStyle)
  const fxSprayFlow = activeStyle === 'spray-flow'
  const fxStarlight = activeStyle === 'starlight'

  return {
    ...deriveModelData(useDirectoryState(directory), t),
    activeStyle,
    fxSprayFlow,
    fxStarlight,
  }
}
