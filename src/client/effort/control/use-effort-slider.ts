/**
 * Effort slider domain: pointer/keyboard interaction, the snap animation and
 * the visual refs it drives, plus the async commit that forwards the chosen
 * tier to the model directory. Owns dragRatio / settledLabel / pendingError.
 */
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { ModelDirectoryState } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import { starlightRevealArmed } from '../fx'
import type { ModelSelectionInput, SelectModel, Translate } from './contract'
import type { EffortStop } from './model-data'
import { easeOutCubic, easeOutQuad } from './visual'

/** Gap between the track ends and the handle centre, in pixels. */
const HANDLE_INSET = 9
/** Handle radius, so the thumb rotates around its own centre. */
const THUMB_HALF = 11
/** Auto-dismiss delay of the commit-error banner. */
const ERROR_DISMISS_MS = 3000

export interface EffortSliderInput {
  readonly locked: boolean
  readonly busy: boolean
  readonly stops: readonly EffortStop[]
  readonly stopIndex: number
  readonly committedRatio: number
  readonly effortLabel: string | undefined
  readonly state: ModelDirectoryState
  readonly sessionKey: string
  readonly select: SelectModel
  readonly t: Translate
  readonly requestClose: (refocus: boolean) => void
}

export function useEffortSlider({
  locked,
  busy,
  stops,
  stopIndex,
  committedRatio,
  effortLabel,
  state,
  sessionKey,
  select,
  t,
  requestClose,
}: EffortSliderInput) {
  const [dragRatio, setDragRatio] = useState<number | null>(null)
  const [settledLabel, setSettledLabel] = useState<string | null | undefined>(null)
  const [pendingError, setPendingError] = useState<string | null>(null)

  const sliderRef = useRef<HTMLDivElement | null>(null)
  const fillRef = useRef<HTMLDivElement | null>(null)
  const thumbRef = useRef<HTMLDivElement | null>(null)
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([])
  const rafRef = useRef<number | null>(null)
  const mountRetryRef = useRef<number | null>(null)
  const pointerActiveRef = useRef(false)
  const visualRatioRef = useRef(0)
  const visualIdxRef = useRef(0)
  const pendingCommitRef = useRef<number | null>(null)
  // Locks the user-chosen target tier while the async model-directory select
  // is in flight, so the handle does not snap back to the old tier (whose
  // stopIndex is still current) before it updates.
  const pendingTargetRef = useRef<number | null>(null)

  // Release the pending-target lock once the directory actually caught up.
  if (pendingTargetRef.current !== null && stopIndex === pendingTargetRef.current) {
    pendingTargetRef.current = null
  }
  const pendingTarget = pendingTargetRef.current
  const pendingRatio = pendingTarget !== null && stops.length > 1 ? pendingTarget / (stops.length - 1) : null

  // ---- imperative visual sync (direct DOM writes, no React round-trip) ----
  const applyVisual = (ratio: number): void => {
    if (ratio < 0) ratio = 0
    else if (ratio > 1) ratio = 1
    visualRatioRef.current = ratio
    const width = sliderRef.current ? sliderRef.current.clientWidth : 0
    const usable = Math.max(0, width - HANDLE_INSET * 2)
    const px = HANDLE_INSET + ratio * usable
    if (fillRef.current) fillRef.current.style.width = px + 'px'
    if (thumbRef.current) thumbRef.current.style.transform = 'translate(' + (px - THUMB_HALF) + 'px, -50%)'
  }

  const updateDots = (): void => {
    const count = dotRefs.current.length
    if (count === 0) return
    const activeIndex = visualIdxRef.current
    const maxIndex = count - 1
    for (let index = 0; index < count; index++) {
      const dot = dotRefs.current[index]
      if (!dot) continue
      dot.className = 'aem-dot'
        + (index === activeIndex && index !== maxIndex ? ' aem-dotActive' : '')
        + (index === maxIndex ? ' aem-dotMax' : '')
    }
  }

  const ratioOfIndex = (index: number): number => (stops.length > 1 ? index / (stops.length - 1) : 1)

  // First paint / ref callbacks: slider may have zero width until layout, so
  // retry on the next frame until it can be measured.
  const syncMountVisual = (): void => {
    const width = sliderRef.current ? sliderRef.current.clientWidth : 0
    if (width <= 0) {
      if (mountRetryRef.current !== null) cancelAnimationFrame(mountRetryRef.current)
      mountRetryRef.current = requestAnimationFrame(() => {
        mountRetryRef.current = null
        syncMountVisual()
      })
      return
    }
    const idle =
      rafRef.current === null && dragRatio === null && pendingCommitRef.current === null && pendingTargetRef.current === null
    const ratio = idle ? committedRatio : visualRatioRef.current
    const usable = Math.max(0, width - HANDLE_INSET * 2)
    const px = HANDLE_INSET + ratio * usable
    if (fillRef.current) fillRef.current.style.width = px + 'px'
    if (thumbRef.current) thumbRef.current.style.transform = 'translate(' + (px - THUMB_HALF) + 'px, -50%)'
    if (idle && visualIdxRef.current !== stopIndex) {
      visualIdxRef.current = stopIndex
      updateDots()
      setSettledLabel(stops[stopIndex] !== undefined ? stops[stopIndex].name : effortLabel)
    }
  }
  const sliderRefCb = (node: HTMLDivElement | null): void => {
    sliderRef.current = node
    if (node) syncMountVisual()
  }
  const fillRefCb = (node: HTMLDivElement | null): void => {
    fillRef.current = node
    if (node) syncMountVisual()
  }
  const thumbRefCb = (node: HTMLDivElement | null): void => {
    thumbRef.current = node
    if (node) syncMountVisual()
  }

  const settleLabel = (index: number): void =>
    setSettledLabel(stops[index] !== undefined ? stops[index].name : effortLabel)

  // ---- snap animation ----
  const animateSnap = (fromRatio: number, toRatio: number, index: number, fast: boolean): void => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const settled = ratioOfIndex(index)
    if (Math.abs(toRatio - fromRatio) < 0.002) {
      applyVisual(settled)
      if (!pointerActiveRef.current) setDragRatio(null)
      settleLabel(index)
      updateDots()
      return
    }
    applyVisual(fromRatio)
    const duration = fast ? 120 : 220
    const easing = fast ? easeOutQuad : easeOutCubic
    const start = performance.now ? performance.now() : Date.now()
    const step = (now: number): void => {
      let progress = (now - start) / duration
      if (progress > 1) progress = 1
      applyVisual(fromRatio + (toRatio - fromRatio) * easing(progress))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = null
        applyVisual(settled)
        if (!pointerActiveRef.current) setDragRatio(null)
        settleLabel(index)
        updateDots()
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }

  // ---- commit: forward the chosen tier to the model directory ----
  /**
   * Arm the starlight entry wipe. It must happen as soon as the handle reaches
   * MAX — not when the async commit lands, which is a whole interaction later:
   * the wipe's class is read when its layer mounts, so arming after the mount
   * restarts the animation from the full-cover frame (the bar flashed blue once,
   * on the first switch into MAX). Idempotent.
   */
  const armReveal = (index: number): void => {
    if (index === stops.length - 1) starlightRevealArmed.set(sessionKey, true)
  }

  const commitEffort = (index: number, keepOpen: boolean): void => {
    const stop = stops[index]
    if (state.current === null || stop === undefined || index < 0 || index >= stops.length) return
    if (index === stopIndex) {
      if (!keepOpen) requestClose(true)
      return
    }
    // A real switch into MAX arms the entry wipe; the pointer and keyboard
    // paths already armed it before their layer mounted, so this only covers a
    // commit that arrives some other way.
    armReveal(index)
    pendingCommitRef.current = index
    pendingTargetRef.current = index
    const base: ModelSelectionInput = { provider: state.current.provider, model: state.current.model }
    void select(stop.id === undefined ? base : { ...base, reasoningEffort: stop.id }).then((ok) => {
      pendingCommitRef.current = null
      if (!ok) setPendingError(t('effort.error'))
      else if (!keepOpen) requestClose(true)
    })
  }

  // ---- pointer + keyboard interaction ----
  const indexFromRatio = (ratio: number): number =>
    Math.max(0, Math.min(stops.length - 1, Math.round(ratio * (stops.length - 1))))
  const ratioOf = (clientX: number): number => {
    const rect = sliderRef.current ? sliderRef.current.getBoundingClientRect() : null
    if (!rect || rect.width <= 0) return 0
    const ratio = (clientX - rect.left) / rect.width
    return ratio < 0 ? 0 : ratio > 1 ? 1 : ratio
  }
  const onSliderPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (locked || busy || stops.length < 2) return
    event.preventDefault()
    if (sliderRef.current && typeof sliderRef.current.setPointerCapture === 'function') {
      sliderRef.current.setPointerCapture(event.pointerId)
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    pointerActiveRef.current = true
    const index = indexFromRatio(ratioOf(event.clientX))
    armReveal(index)
    visualIdxRef.current = index
    setDragRatio(ratioOfIndex(index))
    animateSnap(visualRatioRef.current, ratioOfIndex(index), index, true)
  }
  const onSliderPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!pointerActiveRef.current) return
    const index = indexFromRatio(ratioOf(event.clientX))
    if (index === visualIdxRef.current) return
    armReveal(index)
    visualIdxRef.current = index
    setDragRatio(ratioOfIndex(index))
    animateSnap(visualRatioRef.current, ratioOfIndex(index), index, true)
  }
  const onSliderPointerUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!pointerActiveRef.current) return
    pointerActiveRef.current = false
    const index = indexFromRatio(ratioOf(event.clientX))
    if (index !== visualIdxRef.current) {
      armReveal(index)
      visualIdxRef.current = index
      setDragRatio(ratioOfIndex(index))
      animateSnap(visualRatioRef.current, ratioOfIndex(index), index, false)
    } else if (rafRef.current === null) {
      setDragRatio(null)
    }
    commitEffort(index, true)
  }
  const onSliderPointerCancel = (): void => {
    pointerActiveRef.current = false
    setDragRatio(null)
  }
  const onSliderKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (locked || busy || stops.length < 2) return
    let next: number
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(stops.length - 1, stopIndex + 1)
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(0, stopIndex - 1)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = stops.length - 1
    else return
    event.preventDefault()
    const from = visualRatioRef.current
    const to = ratioOfIndex(next)
    armReveal(next)
    visualIdxRef.current = next
    setDragRatio(to)
    animateSnap(from, to, next, false)
    commitEffort(next, true)
  }

  // ---- effects ----
  // Settle sync: whenever nothing is in flight (no raf, no drag, no pending
  // commit/target) pull the visuals back to the committed tier.
  useEffect(() => {
    if (rafRef.current === null && dragRatio === null && pendingCommitRef.current === null && pendingTargetRef.current === null) {
      if (Math.abs(visualRatioRef.current - committedRatio) > 0.001) {
        visualRatioRef.current = committedRatio
        applyVisual(committedRatio)
      }
      if (visualIdxRef.current !== stopIndex) {
        visualIdxRef.current = stopIndex
        updateDots()
        settleLabel(stopIndex)
      }
    }
  })

  // Auto-dismiss the pending-error banner.
  useEffect(() => {
    if (pendingError === null) return
    const timer = setTimeout(() => setPendingError(null), ERROR_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [pendingError])

  // Unmount: stop any running animation or mount retry.
  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    if (mountRetryRef.current !== null) cancelAnimationFrame(mountRetryRef.current)
  }, [])

  const shownIdx = indexFromRatio(
    dragRatio !== null ? dragRatio : pendingRatio !== null ? pendingRatio : committedRatio,
  )

  return {
    dragRatio,
    settledLabel,
    pendingError,
    visualIdxRef,
    shownIdx,
    dotRefs,
    sliderRefCb,
    fillRefCb,
    thumbRefCb,
    onSliderPointerDown,
    onSliderPointerMove,
    onSliderPointerUp,
    onSliderPointerCancel,
    onSliderKeyDown,
    commitEffort,
  }
}
