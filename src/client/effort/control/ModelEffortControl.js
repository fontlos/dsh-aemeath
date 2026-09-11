// ModelEffortControl: coordinator that wires the five domain hooks to the two
// presentational components. Owns only shared orchestration — the root
// outside-click guard and the root keyboard handling (Escape / roving focus).

import React from 'react'
import { useModelData } from './model-data.js'
import { useModelPicker } from './use-model-picker.js'
import { useEffortPanel } from './use-effort-panel.js'
import { useEffortSlider } from './use-effort-slider.js'
import { useMaxFx } from './use-max-fx.js'
import { ModelPicker } from './ModelPicker.js'
import { EffortControl } from './EffortControl.js'

export function ModelEffortControl(props) {
  const locked = props.locked
  const available = props.available
  const directory = props.directory
  const load = props.load
  const select = props.select
  const t = props.t
  const initialStyle = props.style
  const settingsScope = props.settingsScope
  const sessionKey = props.sessionId !== undefined ? String(props.sessionId) : 'default'

  // Seat liveness: report mount/unmount so the seat registration can
  // re-register when this cell switches to another registrant (a session
  // change re-elects the winner; a fresh registration shadows it back).
  const seatGeneration = props.seatGeneration
  const onSeatMounted = props.onSeatMounted
  const onSeatLost = props.onSeatLost
  React.useEffect(() => {
    if (typeof onSeatMounted === 'function') onSeatMounted(seatGeneration)
    return () => {
      if (typeof onSeatLost === 'function') onSeatLost(seatGeneration)
    }
  }, [])

  // --- domain hooks (fixed order, all unconditional) ---
  const data = useModelData({ directory, settingsScope, initialStyle, t })
  const panel = useEffortPanel()
  const picker = useModelPicker({ available, load, select, state: data.state })
  const slider = useEffortSlider({
    locked,
    busy: data.busy,
    stops: data.stops,
    stopIndex: data.stopIndex,
    committedRatio: data.committedRatio,
    effortLabel: data.effortLabel,
    state: data.state,
    sessionKey,
    select,
    t,
    requestClose: panel.requestClose,
  })
  const rootRef = React.useRef(null)

  // The tier mode always follows the visual position (visualIdxRef), never
  // the async commit state: the moment the handle leaves MAX — while
  // dragging, during the snap animation, or before the model-directory select
  // settles — the starlight effect starts its exit transition in lockstep with
  // the thumb motion.
  const maxIdx = data.stops.length - 1
  const visIdx = slider.visualIdxRef.current
  const effMode = data.stops.length > 1 && visIdx === maxIdx
    ? 'max'
    : (data.stops.length > 1 && visIdx === maxIdx - 1 ? 'high' : 'base')

  const fx = useMaxFx({
    effMode,
    fxSprayFlow: data.fxSprayFlow,
    fxStarlight: data.fxStarlight,
    effortOpen: panel.effortOpen,
    sessionKey,
  })

  // During the exit fade the fill stays MAX-blue so the effect fades out over
  // its own color; only after the fade completes does the fill transition to
  // the target tier color.
  const fillModeNow = fx.exitPhase ? 'max' : effMode
  const fillClass = 'aem-fill'
    + (fillModeNow === 'max' ? ' aem-fillMax' : fillModeNow === 'high' ? ' aem-fillHigh' : '')
    + (fillModeNow === 'max' && data.fxSprayFlow ? ' aem-fx-spray-flow' : '')
  const gradClass = effMode === 'max' ? ' aem-labelGrad' : ''
  const effortLabelNow = slider.settledLabel !== null ? slider.settledLabel : data.effortLabel

  // --- orchestration: outside click closes whatever is open ---
  React.useEffect(() => {
    if (!picker.modelOpen && !panel.effortOpen && !panel.effortClosing) return
    const onDown = (event) => {
      if (!rootRef.current || !rootRef.current.contains(event.target)) {
        picker.setModelOpen(false)
        if (panel.effortOpen && !panel.effortClosing) panel.requestClose(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [picker.modelOpen, panel.effortOpen, panel.effortClosing])

  // --- orchestration: root keyboard (Escape, menu roving focus) ---
  const onRootKeyDown = (event) => {
    if (event.key === 'Escape') {
      if (picker.modelOpen) {
        event.preventDefault()
        picker.closeModel(true)
      } else if (panel.effortOpen) {
        event.preventDefault()
        panel.requestClose(true)
      }
      return
    }
    if (picker.modelOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      picker.moveFocus(event.key === 'ArrowDown' ? 1 : -1)
    }
  }

  // --- cross-domain glue (latest closures, recreated per render) ---
  const onShowModel = () => picker.show(panel.closeNow)
  const onClickEffortTrigger = () => {
    if (panel.effortOpen) {
      if (panel.effortClosing) {
        panel.cancelClose()
        panel.setEffortClosing(false)
      } else {
        panel.requestClose(true)
      }
    } else {
      picker.closeModel(false)
      panel.open()
    }
  }
  const dotRefCb = (i, node) => { slider.dotRefs.current[i] = node }

  if (!available) return null

  return React.createElement(
    'div',
    { ref: rootRef, className: 'aem-root', onKeyDown: onRootKeyDown },
    React.createElement(ModelPicker, {
      t,
      state: data.state,
      choices: data.choices,
      modelLabel: data.modelLabel,
      locked,
      busy: data.busy,
      modelOpen: picker.modelOpen,
      uid: picker.uid,
      lastActionRef: picker.lastActionRef,
      triggerRef: picker.triggerRef,
      chevronRef: picker.chevronRef,
      onShow: onShowModel,
      onClose: picker.closeModel,
      onReload: picker.reload,
      onChoose: picker.choose,
      makeItemRef: picker.makeItemRef,
    }),
    React.createElement(EffortControl, {
      t,
      showEffort: data.showEffort,
      effortOpen: panel.effortOpen,
      effortClosing: panel.effortClosing,
      effortLabelNow,
      locked,
      busy: data.busy,
      stops: data.stops,
      maxIdx,
      shownIdx: slider.shownIdx,
      fillClass,
      gradClass,
      pendingError: slider.pendingError,
      panelRef: panel.panelRef,
      effortTriggerRef: panel.effortTriggerRef,
      effortChevronRef: panel.effortChevronRef,
      onPanelAnimationEnd: panel.onPanelAnimationEnd,
      onClickEffortTrigger,
      sliderRefCb: slider.sliderRefCb,
      fillRefCb: slider.fillRefCb,
      thumbRefCb: slider.thumbRefCb,
      dotRefCb,
      onSliderPointerDown: slider.onSliderPointerDown,
      onSliderPointerMove: slider.onSliderPointerMove,
      onSliderPointerUp: slider.onSliderPointerUp,
      onSliderPointerCancel: slider.onSliderPointerCancel,
      onSliderKeyDown: slider.onSliderKeyDown,
      fxSprayEl: fx.sprayEl,
      fxMatrixEl: fx.matrixEl,
    }),
  )
}
