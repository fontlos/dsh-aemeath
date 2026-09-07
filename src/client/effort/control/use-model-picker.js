// Model-picker domain: the dropdown trigger + menu — its open state, trigger
// refs, item focus registry, load/choose actions and the chevron animation.

import React from 'react'
import { createChevronAnimator } from './visual.js'

export function useModelPicker({ available, load, select, state }) {
  const [modelOpen, setModelOpen] = React.useState(false)
  const triggerRef = React.useRef(null)
  const chevronRef = React.useRef(null)
  const itemRefs = React.useRef([])
  const lastActionRef = React.useRef('load')
  const uid = React.useRef('aem-' + Math.random().toString(36).slice(2, 8)).current
  const animatorRef = React.useRef(null)
  if (animatorRef.current === null) animatorRef.current = createChevronAnimator()

  // (Re)load the directory whenever the seat becomes available; remember that
  // the last user action was a load so menu errors render as load errors.
  React.useEffect(() => {
    if (available) {
      lastActionRef.current = 'load'
      load()
    }
  }, [available])

  // Chevron rotation follows the open state.
  React.useEffect(() => {
    if (chevronRef.current) animatorRef.current.animate(chevronRef.current, modelOpen)
  }, [modelOpen])

  // Unmount: stop the running rotation.
  React.useEffect(() => () => {
    if (animatorRef.current.state.raf !== null) cancelAnimationFrame(animatorRef.current.state.raf)
  }, [])

  /** Open the model menu; the caller passes the effort panel's instant close. */
  function show(closeEffortNow) {
    closeEffortNow()
    setModelOpen(true)
    lastActionRef.current = 'load'
    load()
  }
  function closeModel(refocus) {
    setModelOpen(false)
    if (refocus) queueMicrotask(() => { if (triggerRef.current) triggerRef.current.focus() })
  }
  function reload() {
    lastActionRef.current = 'load'
    load()
  }
  function choose(group, model) {
    if (state.current != null && state.current.provider === group.id && state.current.model === model.id) {
      closeModel(true)
      return
    }
    lastActionRef.current = 'select'
    select({ provider: group.id, model: model.id }).then((ok) => { if (ok) closeModel(true) })
  }

  // Item refs are rebuilt every render (the menu re-renders the option list).
  itemRefs.current = []
  let itemIndex = 0
  function makeItemRef() {
    const at = itemIndex++
    return (node) => { itemRefs.current[at] = node }
  }

  /** Roving focus across the menu options (menu-open arrow keys). */
  function moveFocus(offset) {
    const items = itemRefs.current.filter((i) => i !== null)
    if (items.length === 0) return
    const active = items.findIndex((i) => i === document.activeElement)
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
