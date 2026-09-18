/**
 * Effort panel domain: the open/close state machine with its transition
 * teardown. All close paths converge on finishClose: the opacity transitionend,
 * the panel's aem-pop-out animation end, or a safety timer. Closing restores
 * inline panel styles on cancel, so a reopen mid-transition never leaves the
 * panel invisible.
 */
import { useEffect, useRef, useState } from 'react'
import type { AnimationEvent as ReactAnimationEvent } from 'react'
import { createChevronAnimator } from './visual'

/** Safety timeout for the close teardown when no animation reports its end. */
const CLOSE_FALLBACK_MS = 380

export function useEffortPanel() {
  const [effortOpen, setEffortOpen] = useState(false)
  const [effortClosing, setEffortClosing] = useState(false)

  const effortTriggerRef = useRef<HTMLButtonElement | null>(null)
  const effortChevronRef = useRef<HTMLSpanElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeTransEndRef = useRef<((event: TransitionEvent) => void) | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeRefocusRef = useRef(false)
  // One animator per mounted control, created on first render.
  const [animator] = useState(createChevronAnimator)

  // Chevron rotation follows the panel visibility (closing counts as closed).
  useEffect(() => {
    if (effortChevronRef.current) animator.animate(effortChevronRef.current, effortOpen && !effortClosing)
  }, [effortOpen, effortClosing])

  // Unmount: stop the rotation + any pending safety timer.
  useEffect(() => () => {
    if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current)
    if (animator.state.raf !== null) cancelAnimationFrame(animator.state.raf)
  }, [])

  /**
   * Cancel a pending close and restore the panel's inline visuals. A cancelled
   * close (reopen mid-transition) must restore them, otherwise the panel
   * stays invisible.
   */
  function cancelClose(): void {
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
  function open(): void {
    cancelClose()
    setEffortClosing(false)
    setEffortOpen(true)
  }

  /**
   * The single place that actually tears the panel down. Reached when the
   * close transition finished (transitionend on opacity), when the pop-out
   * animation end fires, or by the safety timer. Idempotent.
   */
  function finishClose(): void {
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
  function playCloseTransition(panelEl: HTMLDivElement): void {
    if (closeTransEndRef.current !== null) {
      panelEl.removeEventListener('transitionend', closeTransEndRef.current)
      closeTransEndRef.current = null
    }
    const onTEnd = (event: TransitionEvent): void => {
      if (event.propertyName !== 'opacity') return
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
  function requestClose(refocus: boolean): void {
    if (!effortOpen || effortClosing) return
    closeRefocusRef.current = refocus
    setEffortClosing(true)
    cancelClose()
    let delay = CLOSE_FALLBACK_MS
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) delay = 0
    const panelEl = panelRef.current
    if (panelEl && delay > 0) {
      playCloseTransition(panelEl)
    }
    // Safety net: if neither the transition nor the pop-out animation can
    // finish (edge cases), tear down anyway.
    closeTimerRef.current = setTimeout(finishClose, delay)
  }

  /** Instant close (open the model picker, outside navigation…). */
  function closeNow(): void {
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
  function onPanelAnimationEnd(event: ReactAnimationEvent<HTMLDivElement>): void {
    if (effortClosing && event.animationName === 'aem-pop-out') {
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
