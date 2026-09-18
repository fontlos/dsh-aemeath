/**
 * Model-picker domain: the dropdown trigger + menu — its open state, trigger
 * refs, item focus registry, load/choose actions and the chevron animation.
 */
import { useEffect, useRef, useState } from 'react'
import type { ModelCatalogModel, ModelProviderGroup } from '@deepseek-ai/dsh-api-session-controller/types'
import type { ModelDirectoryState } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type { SelectModel } from './contract'
import { createChevronAnimator } from './visual'

/** Which user action the menu's error message belongs to. */
export type LastAction = 'load' | 'select'

export interface ModelPickerInput {
  readonly available: boolean
  readonly load: () => void
  readonly select: SelectModel
  readonly state: ModelDirectoryState
}

export function useModelPicker({ available, load, select, state }: ModelPickerInput) {
  const [modelOpen, setModelOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const chevronRef = useRef<HTMLSpanElement | null>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const lastActionRef = useRef<LastAction>('load')
  const uid = useRef('aem-' + Math.random().toString(36).slice(2, 8)).current
  // One animator per mounted control, created on first render.
  const [animator] = useState(createChevronAnimator)

  // (Re)load the directory whenever the seat becomes available; remember that
  // the last user action was a load so menu errors render as load errors.
  useEffect(() => {
    if (available) {
      lastActionRef.current = 'load'
      load()
    }
  }, [available])

  // Chevron rotation follows the open state.
  useEffect(() => {
    if (chevronRef.current) animator.animate(chevronRef.current, modelOpen)
  }, [modelOpen])

  // Unmount: stop the running rotation.
  useEffect(() => () => {
    if (animator.state.raf !== null) cancelAnimationFrame(animator.state.raf)
  }, [])

  /** Open the model menu; the caller passes the effort panel's instant close. */
  function show(closeEffortNow: () => void): void {
    closeEffortNow()
    setModelOpen(true)
    lastActionRef.current = 'load'
    load()
  }

  function closeModel(refocus = false): void {
    setModelOpen(false)
    if (refocus) queueMicrotask(() => { if (triggerRef.current) triggerRef.current.focus() })
  }

  function reload(): void {
    lastActionRef.current = 'load'
    load()
  }

  function choose(group: ModelProviderGroup, model: ModelCatalogModel): void {
    if (state.current !== null && state.current.provider === group.id && state.current.model === model.id) {
      closeModel(true)
      return
    }
    lastActionRef.current = 'select'
    void select({ provider: group.id, model: model.id }).then((ok) => { if (ok) closeModel(true) })
  }

  // Item refs are rebuilt every render (the menu re-renders the option list).
  itemRefs.current = []
  let itemIndex = 0
  function makeItemRef(): (node: HTMLButtonElement | null) => void {
    const at = itemIndex++
    return (node) => { itemRefs.current[at] = node }
  }

  /** Roving focus across the menu options (menu-open arrow keys). */
  function moveFocus(offset: number): void {
    const items = itemRefs.current.filter((item) => item !== null)
    if (items.length === 0) return
    const active = items.findIndex((item) => item === document.activeElement)
    const next = items[(Math.max(active, 0) + offset + items.length) % items.length]
    if (next) next.focus()
  }

  return {
    modelOpen,
    setModelOpen,
    triggerRef,
    chevronRef,
    uid,
    lastActionRef,
    show,
    closeModel,
    reload,
    choose,
    makeItemRef,
    moveFocus,
  }
}
