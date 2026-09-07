// Max-tier effects domain: owns the spray ignition epoch (remount on every
// entry into MAX so the plume visibly starts from the nozzle) and the undertow
// exit phase (leaving MAX keeps the effect mounted briefly while a sheet
// sweeps in), and builds the effect element trees.

import React from 'react'
import { undertowRevealArmed, MATRIX, RUNNERS, SPRAY } from '../fx.js'

export function useMaxFx({ effMode, fxSprayFlow, fxUndertow, effortOpen, sessionKey }) {
  // Bumped every time the slider settles into MAX, remounting the spray so
  // the ignition stagger plays from the nozzle outward.
  const [sprayEpoch, setSprayEpoch] = React.useState(0)
  // When the tier leaves MAX the undertow effect stays mounted briefly while
  // a blue sheet sweeps in from the left, then unmounts.
  const [exitPhase, setExitPhase] = React.useState(false)
  const wasMaxRef = React.useRef(false)
  const prevMaxRef = React.useRef(false)
  const exitTimerRef = React.useRef(null)

  // Exit detection: leaving MAX starts the cover animation and unmounts the
  // effect after it completes; re-entering MAX cancels a pending exit.
  React.useEffect(() => {
    const nowMax = effMode === 'max'
    const wasMax = prevMaxRef.current
    prevMaxRef.current = nowMax
    if (wasMax && !nowMax) {
      setExitPhase(true)
      if (exitTimerRef.current !== null) clearTimeout(exitTimerRef.current)
      exitTimerRef.current = setTimeout(() => {
        exitTimerRef.current = null
        setExitPhase(false)
      }, 550)
    } else if (nowMax && exitTimerRef.current !== null) {
      clearTimeout(exitTimerRef.current)
      exitTimerRef.current = null
      setExitPhase(false)
    }
  }, [effMode])

  // Disarm the undertow reveal when the panel closes: the entry animation is
  // armed only by a real tier switch INTO MAX while the panel is open, so a
  // plain reopen must not replay it. Runs as soon as effortOpen turns false,
  // before the panel's closing transition finishes.
  React.useEffect(() => {
    if (!effortOpen) undertowRevealArmed.delete(sessionKey)
  }, [effortOpen])

  // Ignition: remount the spray each time the control settles into MAX,
  // replaying every particle's launch delay (nozzle first, then outward).
  React.useEffect(() => {
    const nowMax = effMode === 'max' && fxSprayFlow
    if (nowMax && !wasMaxRef.current) setSprayEpoch((e) => e + 1)
    wasMaxRef.current = nowMax
  })

  // Unmount: cancel a pending exit timer.
  React.useEffect(() => () => {
    if (exitTimerRef.current !== null) clearTimeout(exitTimerRef.current)
  }, [])

  // Spray-flow effect: the blue-purple stream + rocket exhaust plume.
  const sprayEl = fxSprayFlow
    ? React.createElement(
      'div',
      // Bumping the key remounts the spray on every entry into MAX, so the
      // ignite delays replay and the plume visibly starts spraying from the
      // nozzle instead of appearing all at once.
      { key: 'spray-' + sprayEpoch, className: 'aem-fillSpray' },
      React.createElement('div', { className: 'aem-sprayCore' }),
      React.createElement('div', { className: 'aem-sprayNozzle' }),
      SPRAY.map((p, i) =>
        React.createElement(
          'span',
          { key: i, className: 'aem-sprayWrap', style: { '--launch': p.launch + 's' } },
          React.createElement('span', {
            className: 'aem-sprayDot',
            style: {
              '--x': p.x + '%',
              '--y': p.y + '%',
              '--s': p.s + 'px',
              '--tl': p.tl,
              '--dist': p.dist + 'px',
              '--dur': p.dur + 's',
              '--delay': p.delay + 's',
              '--pk': p.pk,
            },
          }),
        ),
      ),
    )
    : null

  // Undertow effect: shown on the MAX tier (plus the brief exit phase). A
  // horizontal white→purple gradient backs the bar; the static dot-matrix
  // texture follows the gradient and cell-sized white sparks are ejected from
  // the right edge, running left and fading out. The reveal animation plays
  // only while the panel is open AND the user really switched a tier into MAX
  // while it was open; reopening the panel on MAX shows the settled effect
  // instantly.
  const undertowVisible = fxUndertow && (effMode === 'max' || exitPhase)
  const revealFirst = undertowVisible && undertowRevealArmed.get(sessionKey) === true
  const matrixEl = undertowVisible
    ? React.createElement(
      React.Fragment,
      null,
      React.createElement('div', { className: 'aem-undertowBg' + (exitPhase ? ' aem-undertowExit' : '') }),
      React.createElement(
        'div', { className: 'aem-matrix' + (exitPhase ? ' aem-matrixExit' : '') },
        MATRIX.map((cell, i) =>
          React.createElement('span', { key: i, className: 'aem-cell', style: { '--cell-color': cell.color } }),
        ),
        RUNNERS.map((r, i) =>
          React.createElement('span', {
            key: 'run-' + i,
            className: 'aem-runner',
            style: {
              '--run-y': r.y + '%',
              '--run-from': r.from + '%',
              '--run-to': r.to + '%',
              '--run-dur': r.dur + 's',
              '--run-delay': r.delay + 's',
            },
          }),
        ),
      ),
      // Right→left reveal on entry: one soft-edged blue sheet (solid with a
      // feathered right edge) slides away leftwards, so the new colors wash in
      // smoothly from the right. On panel remounts (no tier switch) the sheet
      // is already gone. On exit the whole effect fades out; the fill stays
      // MAX-blue during the fade and only then transitions to the target tier.
      React.createElement(
        'div', { className: 'aem-reveal' },
        React.createElement('div', { className: 'aem-revealSheet' + (revealFirst ? '' : ' aem-revealDone') }),
      ),
    )
    : null

  return { exitPhase, sprayEl, matrixEl }
}
