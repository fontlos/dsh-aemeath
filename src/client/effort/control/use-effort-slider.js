// Effort slider domain: pointer/keyboard interaction, the snap animation and
// the visual refs it drives, plus the async commit that forwards the chosen
// tier to the model directory. Owns dragRatio / settledLabel / pendingError.

import React from 'react'
import { easeOutCubic, easeOutQuad } from './visual.js'
import { undertowRevealArmed } from '../fx.js'

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
}) {
  const [dragRatio, setDragRatio] = React.useState(null)
  const [settledLabel, setSettledLabel] = React.useState(null)
  const [pendingError, setPendingError] = React.useState(null)

  const sliderRef = React.useRef(null)
  const fillRef = React.useRef(null)
  const thumbRef = React.useRef(null)
  const dotRefs = React.useRef([])
  const rafRef = React.useRef(null)
  const mountRetryRef = React.useRef(null)
  const pointerActiveRef = React.useRef(false)
  const visualRatioRef = React.useRef(0)
  const visualIdxRef = React.useRef(0)
  const pendingCommitRef = React.useRef(null)
  // Locks the user-chosen target tier while the async model-directory select
  // is in flight, so the handle does not snap back to the old tier (whose
  // stopIndex is still current) before it updates.
  const pendingTargetRef = React.useRef(null)

  // Release the pending-target lock once the directory actually caught up.
  if (pendingTargetRef.current !== null && stopIndex === pendingTargetRef.current) {
    pendingTargetRef.current = null
  }
  const pendingTarget = pendingTargetRef.current
  const pendingRatio = pendingTarget !== null && stops.length > 1 ? pendingTarget / (stops.length - 1) : null

  // ---- imperative visual sync (direct DOM writes, no React round-trip) ----
  const applyVisual = (ratio) => {
    if (ratio < 0) ratio = 0
    else if (ratio > 1) ratio = 1
    visualRatioRef.current = ratio
    const w = sliderRef.current ? sliderRef.current.clientWidth : 0
    const usable = Math.max(0, w - 18)
    const px = 9 + ratio * usable
    if (fillRef.current) fillRef.current.style.width = px + 'px'
    if (thumbRef.current) thumbRef.current.style.transform = 'translate(' + (px - 11) + 'px, -50%)'
  }

  const updateDots = () => {
    const n = dotRefs.current.length
    if (n === 0) return
    const i = visualIdxRef.current
    const maxK = n - 1
    for (let k = 0; k < n; k++) {
      const el = dotRefs.current[k]
      if (!el) continue
      el.className = 'aem-dot'
        + (k === i && k !== maxK ? ' aem-dotActive' : '')
        + (k === maxK ? ' aem-dotMax' : '')
    }
  }

  const ratioOfIndex = (idx) => (stops.length > 1 ? idx / (stops.length - 1) : 1)

  // First paint / ref callbacks: slider may have zero width until layout, so
  // retry on the next frame until it can be measured.
  const syncMountVisual = () => {
    const w = sliderRef.current ? sliderRef.current.clientWidth : 0
    if (w <= 0) {
      if (mountRetryRef.current !== null) cancelAnimationFrame(mountRetryRef.current)
      mountRetryRef.current = requestAnimationFrame(() => {
        mountRetryRef.current = null
        syncMountVisual()
      })
      return
    }
    const idle = rafRef.current === null && dragRatio === null && pendingCommitRef.current === null && pendingTargetRef.current === null
    const r = idle ? committedRatio : visualRatioRef.current
    const usable = Math.max(0, w - 18)
    const px = 9 + r * usable
    if (fillRef.current) fillRef.current.style.width = px + 'px'
    if (thumbRef.current) thumbRef.current.style.transform = 'translate(' + (px - 11) + 'px, -50%)'
    if (idle && visualIdxRef.current !== stopIndex) {
      visualIdxRef.current = stopIndex
      updateDots()
      setSettledLabel(stops[stopIndex] !== undefined ? stops[stopIndex].name : effortLabel)
    }
  }
  const sliderRefCb = (node) => {
    sliderRef.current = node
    if (node) syncMountVisual()
  }
  const fillRefCb = (node) => {
    fillRef.current = node
    if (node) syncMountVisual()
  }
  const thumbRefCb = (node) => {
    thumbRef.current = node
    if (node) syncMountVisual()
  }

  const settleLabel = (idx) => setSettledLabel(stops[idx] !== undefined ? stops[idx].name : effortLabel)

  // ---- snap animation ----
  const animateSnap = (fromRatio, toRatio, idx, fast) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const settled = ratioOfIndex(idx)
    if (Math.abs(toRatio - fromRatio) < 0.002) {
      applyVisual(settled)
      if (!pointerActiveRef.current) setDragRatio(null)
      settleLabel(idx)
      updateDots()
      return
    }
    applyVisual(fromRatio)
    const duration = fast ? 120 : 220
    const easing = fast ? easeOutQuad : easeOutCubic
    const start = performance.now ? performance.now() : Date.now()
    const step = (now) => {
      let p = (now - start) / duration
      if (p > 1) p = 1
      applyVisual(fromRatio + (toRatio - fromRatio) * easing(p))
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = null
        applyVisual(settled)
        if (!pointerActiveRef.current) setDragRatio(null)
        settleLabel(idx)
        updateDots()
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }

  // ---- commit: forward the chosen tier to the model directory ----
  const commitEffort = (idx, keepOpen) => {
    if (state.current == null || idx < 0 || idx >= stops.length) return
    if (idx === stopIndex) {
      if (!keepOpen) requestClose(true)
      return
    }
    // Arm the undertow entry animation only when the user really switches a
    // tier INTO MAX. Switching between non-MAX tiers, staying on MAX, or
    // merely reopening the panel never arms it.
    if (idx === stops.length - 1) undertowRevealArmed.set(sessionKey, true)
    pendingCommitRef.current = idx
    pendingTargetRef.current = idx
    const stop = stops[idx]
    const selection = { provider: state.current.provider, model: state.current.model }
    if (stop.id !== undefined) selection.reasoningEffort = stop.id
    select(selection).then((ok) => {
      pendingCommitRef.current = null
      if (!ok) setPendingError(t('effort.error'))
      else if (!keepOpen) requestClose(true)
    })
  }

  // ---- pointer + keyboard interaction ----
  const indexFromRatio = (r) => Math.max(0, Math.min(stops.length - 1, Math.round(r * (stops.length - 1))))
  const ratioOf = (clientX) => {
    const rect = sliderRef.current ? sliderRef.current.getBoundingClientRect() : null
    if (!rect || rect.width <= 0) return 0
    const r = (clientX - rect.left) / rect.width
    return r < 0 ? 0 : r > 1 ? 1 : r
  }
  const onSliderPointerDown = (event) => {
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
    const idx = indexFromRatio(ratioOf(event.clientX))
    visualIdxRef.current = idx
    setDragRatio(ratioOfIndex(idx))
    animateSnap(visualRatioRef.current, ratioOfIndex(idx), idx, true)
  }
  const onSliderPointerMove = (event) => {
    if (!pointerActiveRef.current) return
    const idx = indexFromRatio(ratioOf(event.clientX))
    if (idx === visualIdxRef.current) return
    visualIdxRef.current = idx
    setDragRatio(ratioOfIndex(idx))
    animateSnap(visualRatioRef.current, ratioOfIndex(idx), idx, true)
  }
  const onSliderPointerUp = (event) => {
    if (!pointerActiveRef.current) return
    pointerActiveRef.current = false
    const idx = indexFromRatio(ratioOf(event.clientX))
    if (idx !== visualIdxRef.current) {
      visualIdxRef.current = idx
      setDragRatio(ratioOfIndex(idx))
      animateSnap(visualRatioRef.current, ratioOfIndex(idx), idx, false)
    } else if (rafRef.current === null) {
      setDragRatio(null)
    }
    commitEffort(idx, true)
  }
  const onSliderPointerCancel = () => {
    pointerActiveRef.current = false
    setDragRatio(null)
  }
  const onSliderKeyDown = (event) => {
    if (locked || busy || stops.length < 2) return
    let next = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(stops.length - 1, stopIndex + 1)
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(0, stopIndex - 1)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = stops.length - 1
    else return
    event.preventDefault()
    const from = visualRatioRef.current
    const to = ratioOfIndex(next)
    visualIdxRef.current = next
    setDragRatio(to)
    animateSnap(from, to, next, false)
    commitEffort(next, true)
  }

  // ---- effects ----
  // Settle sync: whenever nothing is in flight (no raf, no drag, no pending
  // commit/target) pull the visuals back to the committed tier.
  React.useEffect(() => {
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
  React.useEffect(() => {
    if (pendingError === null) return
    const timer = setTimeout(() => setPendingError(null), 3000)
    return () => clearTimeout(timer)
  }, [pendingError])

  // Unmount: stop any running animation or mount retry.
  React.useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    if (mountRetryRef.current !== null) cancelAnimationFrame(mountRetryRef.current)
  }, [])

  const shownIdx = indexFromRatio(
    dragRatio != null ? dragRatio : (pendingRatio !== null ? pendingRatio : committedRatio),
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
