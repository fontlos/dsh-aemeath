// EffortControl UI: the effort trigger button and, while open/closing, the
// slider with its tier dots + max-tier effect layers and the panel chrome.
// Pure presentational — the coordinator wires hooks' handles through props.

import React from 'react'
import { CHEVRON_ICON } from './visual.js'

export function EffortControl(props) {
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

  let effortEl = null
  if (showEffort) {
    effortEl = React.createElement(
      'button',
      {
        ref: effortTriggerRef,
        type: 'button',
        className: 'aem-effortTrigger',
        'aria-label': t('effort.triggerAria', { level: effortLabelNow }),
        'aria-haspopup': 'dialog',
        'aria-expanded': effortOpen,
        title: effortLabelNow,
        disabled: locked,
        onClick: onClickEffortTrigger,
      },
      React.createElement('span', { className: 'aem-effortCaption' + gradClass }, t('effort.label')),
      React.createElement('span', { className: 'aem-effortValue' + gradClass }, effortLabelNow),
      React.createElement('span', { ref: effortChevronRef, className: 'aem-chevron' }, CHEVRON_ICON),
    )

    if (effortOpen || effortClosing) {
      // Tier dots: hidden at MAX where the effect visuals replace them.
      const dotNodes = stops.length > 1
        ? React.createElement(
          'div',
          { className: 'aem-dots' + (shownIdx === maxIdx ? ' aem-dotsHidden' : '') },
          stops.map((s, i) =>
            React.createElement('span', {
              key: i,
              ref: (node) => { dotRefCb(i, node) },
              className: 'aem-dot'
                + (i === shownIdx && i !== maxIdx ? ' aem-dotActive' : '')
                + (i === maxIdx ? ' aem-dotMax' : ''),
              style: { left: (i / (stops.length - 1)) * 100 + '%' },
            }),
          ),
        )
        : null

      const sliderEl = React.createElement(
        'div',
        {
          ref: sliderRefCb,
          className: 'aem-slider',
          role: 'slider',
          tabIndex: locked || busy ? -1 : 0,
          'aria-label': t('effort.aria', { level: effortLabelNow }),
          'aria-disabled': locked || busy,
          'aria-valuemin': 0,
          'aria-valuemax': Math.max(0, maxIdx),
          'aria-valuenow': shownIdx,
          'aria-valuetext': effortLabelNow,
          onPointerDown: onSliderPointerDown,
          onPointerMove: onSliderPointerMove,
          onPointerUp: onSliderPointerUp,
          onPointerCancel: onSliderPointerCancel,
          onKeyDown: onSliderKeyDown,
        },
        React.createElement('div', { className: 'aem-track' },
          React.createElement(
            'div',
            { ref: fillRefCb, className: fillClass },
            React.createElement('div', { className: 'aem-fillSheen' }),
            React.createElement('div', { className: 'aem-fillGlint' }),
            fxSprayEl,
          ),
        ),
        fxMatrixEl,
        dotNodes,
        React.createElement(
          'div',
          { ref: thumbRefCb, className: 'aem-thumb' },
          React.createElement(
            'svg',
            { className: 'aem-thumbIcon', viewBox: '0 0 24 24' },
            React.createElement('path', {
              d: 'M8 3L4 7l4 4M16 3l4 4-4 4M4 12h16M4 12l4 4-4 4M20 12l-4 4 4 4',
              stroke: '#71717a',
              strokeWidth: 2,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              fill: 'none',
            }),
          ),
        ),
      )

      const panel = React.createElement(
        'div',
        {
          ref: panelRef,
          className: effortClosing ? 'aem-panel aem-panelClosing' : 'aem-panel',
          role: 'dialog',
          'aria-label': t('effort.panelAria'),
          onAnimationEnd: onPanelAnimationEnd,
        },
        React.createElement(
          'div', { className: 'aem-panelHeader' },
          React.createElement(
            'div', { className: 'aem-labelGroup' },
            React.createElement('span', { className: 'aem-panelTitle' }, t('effort.title')),
            React.createElement('span', { className: 'aem-panelValue' + gradClass }, effortLabelNow),
          ),
        ),
        React.createElement(
          'div', { className: 'aem-rangeLabels' },
          React.createElement('span', { className: 'aem-rangeLeft' }, t('range.faster')),
          React.createElement('span', { className: 'aem-rangeRight' }, t('range.smarter')),
        ),
        sliderEl,
        pendingError != null ? React.createElement('div', { className: 'aem-panelError' }, pendingError) : null,
      )

      effortEl = React.createElement(React.Fragment, null, effortEl, panel)
    }
  }

  return effortEl
}
