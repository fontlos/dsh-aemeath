/**
 * EffortControl UI: the effort trigger button and, while open/closing, the
 * slider with its tier dots + max-tier effect layers and the panel chrome.
 * Pure presentational — the coordinator wires hooks' handles through props.
 */
import type {
  AnimationEvent as ReactAnimationEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  ReactNode,
} from 'react'
import type { Translate } from './contract'
import type { EffortStop } from './model-data'
import { ARROWS_HORIZONTAL_ICON, CHEVRON_ICON } from './visual'

export interface EffortControlProps {
  readonly t: Translate
  readonly showEffort: boolean
  readonly effortOpen: boolean
  readonly effortClosing: boolean
  readonly effortLabelNow: string | undefined
  readonly locked: boolean
  readonly busy: boolean
  readonly stops: readonly EffortStop[]
  readonly maxIdx: number
  readonly shownIdx: number
  readonly fillClass: string
  readonly gradClass: string
  readonly pendingError: string | null
  // panel handles
  readonly panelRef: MutableRefObject<HTMLDivElement | null>
  readonly effortTriggerRef: MutableRefObject<HTMLButtonElement | null>
  readonly effortChevronRef: MutableRefObject<HTMLSpanElement | null>
  readonly onPanelAnimationEnd: (event: ReactAnimationEvent<HTMLDivElement>) => void
  readonly onClickEffortTrigger: () => void
  // slider handles
  readonly sliderRefCb: (node: HTMLDivElement | null) => void
  readonly fillRefCb: (node: HTMLDivElement | null) => void
  readonly thumbRefCb: (node: HTMLDivElement | null) => void
  readonly dotRefCb: (index: number, node: HTMLSpanElement | null) => void
  readonly onSliderPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  readonly onSliderPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  readonly onSliderPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  readonly onSliderPointerCancel: () => void
  readonly onSliderKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void
  // max-tier effect layers (built by useMaxFx)
  readonly fxSprayEl: ReactNode
  readonly fxMatrixEl: ReactNode
}

export function EffortControl(props: EffortControlProps): ReactElement | null {
  const {
    t,
    showEffort,
    effortOpen,
    effortClosing,
    effortLabelNow,
    locked,
    busy,
    stops,
    maxIdx,
    shownIdx,
    fillClass,
    gradClass,
    pendingError,
    // panel handles
    panelRef,
    effortTriggerRef,
    effortChevronRef,
    onPanelAnimationEnd,
    onClickEffortTrigger,
    // slider handles
    sliderRefCb,
    fillRefCb,
    thumbRefCb,
    dotRefCb,
    onSliderPointerDown,
    onSliderPointerMove,
    onSliderPointerUp,
    onSliderPointerCancel,
    onSliderKeyDown,
    // max-tier effect layers (built by useMaxFx)
    fxSprayEl,
    fxMatrixEl,
  } = props

  let effortEl: ReactElement | null = null
  if (showEffort) {
    effortEl = (
      <button
        ref={effortTriggerRef}
        type="button"
        className="aem-effortTrigger"
        aria-label={t('effort.triggerAria', { level: effortLabelNow })}
        aria-haspopup="dialog"
        aria-expanded={effortOpen}
        title={effortLabelNow}
        disabled={locked}
        onClick={onClickEffortTrigger}
      >
        <span className={'aem-effortCaption' + gradClass}>{t('effort.label')}</span>
        <span className={'aem-effortValue' + gradClass}>{effortLabelNow}</span>
        <span ref={effortChevronRef} className="aem-chevron">{CHEVRON_ICON}</span>
      </button>
    )

    if (effortOpen || effortClosing) {
      // Tier dots: hidden at MAX where the effect visuals replace them.
      const dotNodes = stops.length > 1 ? (
        <div className={'aem-dots' + (shownIdx === maxIdx ? ' aem-dotsHidden' : '')}>
          {stops.map((_stop, index) => (
            <span
              key={index}
              ref={(node) => { dotRefCb(index, node) }}
              className={'aem-dot'
                + (index === shownIdx && index !== maxIdx ? ' aem-dotActive' : '')
                + (index === maxIdx ? ' aem-dotMax' : '')}
              style={{ left: (index / (stops.length - 1)) * 100 + '%' }}
            />
          ))}
        </div>
      ) : null

      const sliderEl = (
        <div
          ref={sliderRefCb}
          className="aem-slider"
          role="slider"
          tabIndex={locked || busy ? -1 : 0}
          aria-label={t('effort.aria', { level: effortLabelNow })}
          aria-disabled={locked || busy}
          aria-valuemin={0}
          aria-valuemax={Math.max(0, maxIdx)}
          aria-valuenow={shownIdx}
          aria-valuetext={effortLabelNow}
          onPointerDown={onSliderPointerDown}
          onPointerMove={onSliderPointerMove}
          onPointerUp={onSliderPointerUp}
          onPointerCancel={onSliderPointerCancel}
          onKeyDown={onSliderKeyDown}
        >
          <div className="aem-track">
            <div ref={fillRefCb} className={fillClass}>
              <div className="aem-fillSheen" />
              <div className="aem-fillGlint" />
              {fxSprayEl}
            </div>
          </div>
          {fxMatrixEl}
          {dotNodes}
          <div ref={thumbRefCb} className="aem-thumb">{ARROWS_HORIZONTAL_ICON}</div>
        </div>
      )

      const panel = (
        <div
          ref={panelRef}
          className={effortClosing ? 'aem-panel aem-panelClosing' : 'aem-panel'}
          role="dialog"
          aria-label={t('effort.panelAria')}
          onAnimationEnd={onPanelAnimationEnd}
        >
          <div className="aem-panelHeader">
            <div className="aem-labelGroup">
              <span className="aem-panelTitle">{t('effort.title')}</span>
              <span className={'aem-panelValue' + gradClass}>{effortLabelNow}</span>
            </div>
          </div>
          <div className="aem-rangeLabels">
            <span className="aem-rangeLeft">{t('range.faster')}</span>
            <span className="aem-rangeRight">{t('range.smarter')}</span>
          </div>
          {sliderEl}
          {pendingError !== null ? <div className="aem-panelError">{pendingError}</div> : null}
        </div>
      )

      effortEl = (
        <>
          {effortEl}
          {panel}
        </>
      )
    }
  }

  return effortEl
}
