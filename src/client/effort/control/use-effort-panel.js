// Effort panel domain: the open/close state machine with its transition
// teardown. All close paths converge on finishClose: the opacity transitionend,
// the panel's aem-pop-out animation end, or a safety timer. Closing restores
// inline panel styles on cancel, so a reopen mid-transition never leaves the
// panel invisible.

import React from 'react'
import { createChevronAnimator } from './visual.js'

export function useEffortPanel() {
  const [effortOpen, setEffortOpen] = React.useState(false)
  const [effortClosing, setEffortClosing] = React.useState(false)

  const effortTriggerRef = React.useRef(null)
  const effortChevronRef = React.useRef(null)
  const panelRef = React.useRef(null)
  const closeTransEndRef = React.useRef(null)
  const closeTimerRef = React.useRef(null)
  const closeRefocusRef = React.useRef(false)
  const animatorRef = React.useRef(null)
  if (animatorRef.current === null) animatorRef.current = createChevronAnimator()

  // Chevron rotation follows the panel visibility (closing counts as closed).
  React.useEffect(() => {
    if (effortChevronRef.current) animatorRef.current.animate(effortChevronRef.current, effortOpen && !effortClosing)
  }, [effortOpen, effortClosing])

  // Unmount: stop the rotation + any pending safety timer.
  React.useEffect(() => () => {
    if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current)
    if (animatorRef.current.state.raf !== null) cancelAnimationFrame(animatorRef.current.state.raf)
  }, [])

  /**
   * Cancel a pending close and restore the panel's inline visuals. A cancelled
   * close (reopen mid-transition) must restore them, otherwise the panel
   * stays invisible.
   */
  function cancelClose() {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (panelRef.current) {
      if (closeTransEndRef.current !== null) {
        panelRef.current.removeEventListener('transitionend', closeTransEndRef.current)
        closeTransEndRef.current = null
      }
      panelRef.current.style.transition = ''
      panelRef.current.style.opacity = ''
      panelRef.current.style.transform = ''
    }
  }

  /** Open the panel (the caller closes the model picker first). */
  function open() {
    cancelClose()
    setEffortClosing(false)
    setEffortOpen(true)
  }

  /**
   * The single place that actually tears the panel down. Reached when the
   * close transition finished (transitionend on opacity), when the pop-out
   * animation end fires, or by the safety timer. Idempotent.
   */
  function finishClose() {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (closeTransEndRef.current !== null && panelRef.current) {
      panelRef.current.removeEventListener('transitionend', closeTransEndRef.current)
      closeTransEndRef.current = null
    }
    const doRefocus = closeRefocusRef.current
    closeRefocusRef.current = false
    setEffortOpen(false)
    setEffortClosing(false)
    if (doRefocus) queueMicrotask(() => { if (effortTriggerRef.current) effortTriggerRef.current.focus() })
  }

  /**
   * Plays the fade-out directly on the panel element through an inline CSS
   * transition. Deliberately NOT dependent on the React `effortClosing` class
   * render: some host environments fail to apply the closing class in time,
   * which would make the panel vanish with no visual feedback. The unmount
   * happens on transitionend, with the timer as a safety net.
   */
  function playCloseTransition(panelEl) {
    if (closeTransEndRef.current !== null) {
      panelEl.removeEventListener('transitionend', closeTransEndRef.current)
      closeTransEndRef.current = null
    }
    const onTEnd = (ev) => {
      if (ev && ev.propertyName !== 'opacity') return
      if (closeTransEndRef.current !== null) {
        panelEl.removeEventListener('transitionend', closeTransEndRef.current)
        closeTransEndRef.current = null
      }
      finishClose()
    }
    closeTransEndRef.current = onTEnd
    panelEl.addEventListener('transitionend', onTEnd)
    // Commit current styles first, then change them, so the browser
    // interpolates instead of snapping.
    void panelEl.offsetWidth
    panelEl.style.transition = 'opacity .3s ease, transform .3s ease'
    panelEl.style.opacity = '0'
    panelEl.style.transform = 'translateY(10px)'
  }

  /** Start closing; refocus the effort trigger once gone when requested. */
  function requestClose(refocus) {
    if (!effortOpen || effortClosing) return
    closeRefocusRef.current = !!refocus
    setEffortClosing(true)
    cancelClose()
    let delay = 380
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) delay = 0
    const panelEl = panelRef.current
    if (panelEl && delay > 0) {
      playCloseTransition(panelEl)
    }
    // Safety net: if neither the transition nor the pop-out animation can
    // finish (edge cases), tear down anyway.
    closeTimerRef.current = setTimeout(finishClose, delay)
  }

  /** Instant close (open the model picker, outside navigation…). */
  function closeNow() {
    cancelClose()
    closeRefocusRef.current = false
    setEffortClosing(false)
    setEffortOpen(false)
  }

  /**
   * The panel's pop-out animation is the source of truth for unmount: as soon
   * as aem-pop-out finishes, tear the panel down. Child element animation ends
   * (sparks, shrink) bubble up but carry a different animationName, so only
   * the panel's own fade-out counts.
   */
  function onPanelAnimationEnd(event) {
    if (effortClosing && event && event.animationName === 'aem-pop-out') {
      finishClose()
    }
  }

  return {
    effortOpen,
    effortClosing,
    setEffortClosing,
    effortTriggerRef,
    effortChevronRef,
    panelRef,
    cancelClose,
    open,
    requestClose,
    closeNow,
    onPanelAnimationEnd,
  }
}
