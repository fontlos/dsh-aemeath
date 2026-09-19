/**
 * ModelPicker UI: the model trigger button plus its dropdown menu.
 * Pure presentational — all state lives in useModelPicker (handles passed down).
 */
import type { MutableRefObject, ReactElement } from 'react'
import type { ModelCatalogModel, ModelProviderGroup } from '@deepseek-ai/dsh-api-session-controller/types'
import type { ModelDirectoryState } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type { Translate } from './contract'
import type { ModelChoice } from './model-data'
import type { LastAction } from './use-model-picker'
import { CHECK_ICON, CHEVRON_ICON } from './visual'

export interface ModelPickerProps {
  readonly t: Translate
  readonly state: ModelDirectoryState
  readonly choices: readonly ModelChoice[]
  readonly modelLabel: string
  readonly locked: boolean
  readonly busy: boolean
  readonly modelOpen: boolean
  readonly uid: string
  readonly lastActionRef: MutableRefObject<LastAction>
  readonly triggerRef: MutableRefObject<HTMLButtonElement | null>
  readonly chevronRef: MutableRefObject<HTMLSpanElement | null>
  readonly onShow: () => void
  readonly onClose: () => void
  readonly onReload: () => void
  readonly onChoose: (group: ModelProviderGroup, model: ModelCatalogModel) => void
  readonly makeItemRef: () => (node: HTMLButtonElement | null) => void
}

export function ModelPicker(props: ModelPickerProps): ReactElement {
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

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className="aem-trigger"
      aria-label={t('trigger.aria', { model: modelLabel })}
      aria-haspopup="menu"
      aria-expanded={modelOpen}
      title={modelLabel}
      disabled={locked}
      onClick={() => { if (modelOpen) onClose(); else onShow() }}
    >
      <span className="aem-triggerLabel">{modelLabel}</span>
      <span ref={chevronRef} className="aem-chevron">{CHEVRON_ICON}</span>
    </button>
  )

  const menu = modelOpen ? (
    <div
      id={uid + '-menu'}
      className="aem-menu"
      role="menu"
      aria-label={t('menu.aria')}
      aria-busy={state.status === 'loading' || busy}
    >
      {state.status === 'loading' ? <div className="aem-status">{t('status.loading')}</div> : null}
      {state.error !== null && lastActionRef.current === 'load' ? (
        <div className="aem-error">
          <span>{t('error.load', { message: state.error })}</span>
          <button type="button" className="aem-retry" onClick={onReload}>{t('retry')}</button>
        </div>
      ) : null}
      {state.failures.map((failure) => (
        <div className="aem-warning" key={failure.id}>
          <span>{t('warning.groupLoad', { name: failure.name, message: failure.message })}</span>
          <button type="button" className="aem-retry" onClick={onReload}>{t('retry')}</button>
        </div>
      ))}
      <div className="aem-groups">
        {state.groups.map((group) => (
          <section key={group.id} role="group">
            <div className="aem-groupTitle">{group.name}</div>
            {group.models.map((model) => {
              const selected = state.current !== null
                && state.current.provider === group.id
                && state.current.model === model.id
              return (
                <button
                  key={model.id}
                  ref={makeItemRef()}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className={selected ? 'aem-option aem-optionSelected' : 'aem-option'}
                  title={model.name}
                  disabled={busy}
                  onClick={() => onChoose(group, model)}
                >
                  <span className="aem-optionCopy">
                    <span className="aem-modelName">{model.name}</span>
                    {model.description !== undefined
                      ? <span className="aem-description">{model.description}</span>
                      : null}
                  </span>
                  <span className="aem-check">{selected ? CHECK_ICON : null}</span>
                </button>
              )
            })}
          </section>
        ))}
        {state.status === 'ready' && choices.length === 0
          ? <div className="aem-status">{t('empty.models')}</div>
          : null}
      </div>
    </div>
  ) : null

  return (
    <>
      {trigger}
      {menu}
    </>
  )
}
