/**
 * Max-tier effects domain: owns the spray ignition epoch (remount on every
 * entry into MAX so the plume visibly starts from the nozzle) and the starlight
 * exit phase (leaving MAX keeps the effect mounted briefly while a sheet
 * sweeps in), and builds the effect element trees.
 */
import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { MATRIX, RUNNERS, SPRAY, starlightRevealArmed } from '../fx'
import type { CssVars, EffortMode } from './contract'

/** Exit fade of the starlight effect once the handle leaves MAX. */
const EXIT_FADE_MS = 550

export interface MaxFxInput {
  readonly effMode: EffortMode
  readonly fxSprayFlow: boolean
  readonly fxStarlight: boolean
  readonly effortOpen: boolean
  readonly sessionKey: string
}

export interface MaxFx {
  readonly exitPhase: boolean
  readonly sprayEl: ReactElement | null
  readonly matrixEl: ReactElement | null
}

/**
 * The entry wipe sheet. Its state is decided once, when the sheet itself
 * mounts: `starlightRevealArmed` can still be set after that (the async commit
 * lands after the layer mounted), and letting the class change then would
 * re-apply the animation from its full-cover frame — that restart was the blue
 * flash on the very first switch into MAX. Freezing it keeps the wipe one-shot.
 */
function RevealSheet({ sessionKey }: { readonly sessionKey: string }): ReactElement {
  const [reveal] = useState(() => starlightRevealArmed.get(sessionKey) === true)
  return <div className={'aem-revealSheet' + (reveal ? '' : ' aem-revealDone')} />
}

export function useMaxFx({ effMode, fxSprayFlow, fxStarlight, effortOpen, sessionKey }: MaxFxInput): MaxFx {
  // Bumped every time the slider settles into MAX, remounting the spray so
  // the ignition stagger plays from the nozzle outward.
  const [sprayEpoch, setSprayEpoch] = useState(0)
  // When the tier leaves MAX the starlight effect stays mounted briefly while
  // a blue sheet sweeps in from the left, then unmounts.
  const [exitPhase, setExitPhase] = useState(false)
  const wasMaxRef = useRef(false)
  const prevMaxRef = useRef(false)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Exit detection: leaving MAX starts the cover animation and unmounts the
  // effect after it completes; re-entering MAX cancels a pending exit.
  useEffect(() => {
    const nowMax = effMode === 'max'
    const wasMax = prevMaxRef.current
    prevMaxRef.current = nowMax
    if (wasMax && !nowMax) {
      setExitPhase(true)
      if (exitTimerRef.current !== null) clearTimeout(exitTimerRef.current)
      exitTimerRef.current = setTimeout(() => {
        exitTimerRef.current = null
        setExitPhase(false)
      }, EXIT_FADE_MS)
    } else if (nowMax && exitTimerRef.current !== null) {
      clearTimeout(exitTimerRef.current)
      exitTimerRef.current = null
      setExitPhase(false)
    }
  }, [effMode])

  // Disarm the starlight reveal when the panel closes: the entry animation is
  // armed only by a real tier switch INTO MAX while the panel is open, so a
  // plain reopen must not replay it. Runs as soon as effortOpen turns false,
  // before the panel's closing transition finishes.
  useEffect(() => {
    if (!effortOpen) starlightRevealArmed.delete(sessionKey)
  }, [effortOpen])

  // Ignition: remount the spray each time the control settles into MAX,
  // replaying every particle's launch delay (nozzle first, then outward).
  useEffect(() => {
    const nowMax = effMode === 'max' && fxSprayFlow
    if (nowMax && !wasMaxRef.current) setSprayEpoch((epoch) => epoch + 1)
    wasMaxRef.current = nowMax
  })

  // Unmount: cancel a pending exit timer.
  useEffect(() => () => {
    if (exitTimerRef.current !== null) clearTimeout(exitTimerRef.current)
  }, [])

  // Spray-flow effect: the blue-purple stream + rocket exhaust plume.
  const sprayEl = fxSprayFlow ? (
    <div
      // Bumping the key remounts the spray on every entry into MAX, so the
      // ignite delays replay and the plume visibly starts spraying from the
      // nozzle instead of appearing all at once.
      key={'spray-' + sprayEpoch}
      className="aem-fillSpray"
    >
      <div className="aem-sprayCore" />
      <div className="aem-sprayNozzle" />
      {SPRAY.map((particle, index) => (
        <span
          key={index}
          className="aem-sprayWrap"
          style={{ '--launch': `${particle.launch}s` } as CssVars}
        >
          <span
            className="aem-sprayDot"
            style={{
              '--x': `${particle.x}%`,
              '--y': `${particle.y}%`,
              '--s': `${particle.s}px`,
              '--tl': particle.tl,
              '--dist': `${particle.dist}px`,
              '--dur': `${particle.dur}s`,
              '--delay': `${particle.delay}s`,
              '--pk': particle.pk,
            } as CssVars}
          />
        </span>
      ))}
    </div>
  ) : null

  // Starlight effect: shown on the MAX tier (plus the brief exit phase). A
  // horizontal white→purple gradient backs the bar; the static dot-matrix
  // texture follows the gradient and cell-sized white sparks are ejected from
  // the right edge, running left and fading out. The reveal animation plays
  // only while the panel is open AND the user really switched a tier into MAX
  // while it was open; reopening the panel on MAX shows the settled effect
  // instantly.
  const starlightVisible = fxStarlight && (effMode === 'max' || exitPhase)
  const matrixEl = starlightVisible ? (
    <>
      <div className={'aem-starlightBg' + (exitPhase ? ' aem-starlightExit' : '')} />
      <div className={'aem-matrix' + (exitPhase ? ' aem-matrixExit' : '')}>
        {MATRIX.map((cell, index) => (
          <span key={index} className="aem-cell" style={{ '--cell-color': cell.color } as CssVars} />
        ))}
        {RUNNERS.map((runner, index) => (
          <span
            key={'run-' + index}
            className="aem-runner"
            style={{
              '--run-y': `${runner.y}%`,
              '--run-from': `${runner.from}%`,
              '--run-to': `${runner.to}%`,
              '--run-dur': `${runner.dur}s`,
              '--run-delay': `${runner.delay}s`,
            } as CssVars}
          />
        ))}
      </div>
      {/* Right→left reveal on entry: one soft-edged blue sheet (solid with a
          feathered right edge) slides away leftwards, so the new colors wash in
          smoothly from the right. On panel remounts (no tier switch) the sheet
          is already gone. On exit the whole effect fades out; the fill stays
          MAX-blue during the fade and only then transitions to the target tier. */}
      <div className="aem-reveal">
        <RevealSheet sessionKey={sessionKey} />
      </div>
    </>
  ) : null

  return { exitPhase, sprayEl, matrixEl }
}
