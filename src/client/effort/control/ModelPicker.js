// ModelPicker UI: the model trigger button plus its dropdown menu.
// Pure presentational — all state lives in useModelPicker (handles passed down).

import React from 'react'
import { CHEVRON_ICON } from './visual.js'

export function ModelPicker(props) {
  const {
    t,
    state,
    choices,
    modelLabel,
    locked,
    busy,
    modelOpen,
    uid,
    lastActionRef,
    triggerRef,
    chevronRef,
    onShow,
    onClose,
    onReload,
    onChoose,
    makeItemRef,
  } = props

  const trigger = React.createElement(
    'button',
    {
      ref: triggerRef,
      type: 'button',
      className: 'aem-trigger',
      'aria-label': t('trigger.aria', { model: modelLabel }),
      'aria-haspopup': 'menu',
      'aria-expanded': modelOpen,
      title: modelLabel,
      disabled: locked,
      onClick: () => { if (modelOpen) onClose(); else onShow() },
    },
    React.createElement('span', { className: 'aem-triggerLabel' }, modelLabel),
    React.createElement('span', { ref: chevronRef, className: 'aem-chevron' }, CHEVRON_ICON),
  )

  const menu = modelOpen
    ? React.createElement(
      'div',
      {
        id: uid + '-menu',
        className: 'aem-menu',
        role: 'menu',
        'aria-label': t('menu.aria'),
        'aria-busy': state.status === 'loading' || busy,
      },
      state.status === 'loading'
        ? React.createElement('div', { className: 'aem-status' }, t('status.loading'))
        : null,
      state.error != null && lastActionRef.current === 'load'
        ? React.createElement(
          'div', { className: 'aem-error' },
          React.createElement('span', null, t('error.load', { message: state.error })),
          React.createElement('button', { type: 'button', className: 'aem-retry', onClick: onReload }, t('retry')),
        )
        : null,
      state.failures.map((failure) =>
        React.createElement(
          'div', { className: 'aem-warning', key: failure.id },
          React.createElement('span', null, t('warning.groupLoad', { name: failure.name, message: failure.message })),
          React.createElement('button', { type: 'button', className: 'aem-retry', onClick: onReload }, t('retry')),
        ),
      ),
      React.createElement(
        'div', { className: 'aem-groups' },
        state.groups.map((group) =>
          React.createElement(
            'section', { key: group.id, role: 'group' },
            React.createElement('div', { className: 'aem-groupTitle' }, group.name),
            group.models.map((model) => {
              const selected = state.current != null && state.current.provider === group.id && state.current.model === model.id
              return React.createElement(
                'button',
                {
                  key: model.id,
                  ref: makeItemRef(),
                  type: 'button',
                  role: 'menuitemradio',
                  'aria-checked': selected,
                  className: selected ? 'aem-option aem-optionSelected' : 'aem-option',
                  title: model.name,
                  disabled: busy,
                  onClick: () => onChoose(group, model),
                },
                React.createElement(
                  'span', { className: 'aem-optionCopy' },
                  React.createElement('span', { className: 'aem-modelName' }, model.name),
                  model.description !== undefined
                    ? React.createElement('span', { className: 'aem-description' }, model.description)
                    : null,
                ),
                React.createElement('span', { className: 'aem-check' }, selected ? '\u2713' : null),
              )
            }),
          ),
        ),
        state.status === 'ready' && choices.length === 0
          ? React.createElement('div', { className: 'aem-status' }, t('empty.models'))
          : null,
      ),
    )
    : null

  return React.createElement(React.Fragment, null, trigger, menu)
}
