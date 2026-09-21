// Plugin settings page ("爱弥斯主题" tab in the dsh settings panel) + the
// conditional composer seat for the advanced model/effort control.
//
// The tab registers one `settings.section` entry (rendered by the settings
// shell when active) which draws the rows itself — pet visibility,
// advanced-effort toggle, its max-tier animation style and the surface colour
// scheme — all bound to the `dsh-aemeath` settings scope.
//
// The seat claims the `conversation.input.model` slot only while advancedEffort
// is on. That cell is per-session and elects its winner by priority, so the
// seat re-registers whenever its control stops rendering (boot race with the
// official selector, session switches) — see the seat section below. All of it
// is bounded and event-free.

import type { Context, Fiber } from '@deepseek-ai/cordis'
import type { SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import { useEffect, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { AemeathSettings } from '../settings-contract'
import type { Dispose, SlotEntryOptions } from './dsh-client'
import type { AemeathSettingsScope, Translate } from './effort/control/contract'
import { ModelEffortControl } from './effort/control/index'
import type { ModelEffortControlProps } from './effort/control/index'
import { EFFECT_STYLES, DEFAULT_STYLE, resolveStyle } from './effort/fx'
import { NS, zh, en } from './effort/i18n'
import type { SnapshotSelector } from './effort/store'
import { bindSnapshotSelector } from './effort/store'
import type { SurfaceKey, SurfacePart } from './surfaces'
import { BLUR_MAX, applyScheme, clearSurfaces, parseHex, readScheme } from './surfaces'

/** Injected face of the Aemeath section and the three rows it draws. */
interface RowProps {
  readonly useScope: SnapshotSelector<SettingsScopeSnapshot<AemeathSettings>>
  readonly scope: AemeathSettingsScope
}

/** Shared switch markup: title/desc on the left, switch on the right. */
interface RowFrameProps {
  readonly title: string
  readonly desc: string
  readonly children?: ReactNode
}

/** One boolean preference switch. */
interface ToggleProps {
  readonly checked: boolean
  readonly label: string
  readonly disabled: boolean
  readonly onClick: () => void
}

export function mount(ctx: Context): void {
  // Inject the shared stylesheet (settings rows + the effort control) once.
  if (typeof document !== 'undefined' && !document.querySelector("link[data-plugin-css='dsh-aemeath/effort.css']")) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/dsh-aemeath/effort.css'
    link.dataset.plugin = 'dsh-aemeath'
    link.dataset.pluginCss = 'dsh-aemeath/effort.css'
    document.head.appendChild(link)
    ctx.effect(() => () => link.remove(), 'dsh-aemeath: effort css cleanup')
  }

  // Optional services (locale / settingsScope) — nothing here may block skin/pet.
  ctx.inject(['slots', 'locale', 'settingsScope'], function (sctx) {
    const slots = sctx.slots
    if (!slots) return
    sctx.effect(function () {
      return sctx.locale.register(NS, { zh, en })
    }, 'dsh-aemeath: theme dictionaries')
    const t: Translate = sctx.locale.bind(NS)
    const scope: AemeathSettingsScope = sctx.settingsScope.bind<AemeathSettings>({ namespace: 'dsh-aemeath' })
    const useScope = bindSnapshotSelector(scope)

    // ---- surface scheme: push the four surfaces onto the shipped tokens ----
    // Kept outside React: it is plain DOM state that has to stay applied while
    // the settings section is closed, and it must be handed back on dispose.
    const syncSurfaces = function (): void {
      try {
        const snap = scope.getSnapshot()
        if (snap && snap.status === 'ready') applyScheme(readScheme(snap.value))
      } catch (_) { /* keep whatever is applied */ }
    }
    sctx.effect(function () {
      syncSurfaces()
      const stop = scope.subscribe(syncSurfaces)
      return function () {
        stop()
        clearSurfaces()
      }
    }, 'dsh-aemeath: surface scheme')

    // ---- rows (rendered by the Aemeath section below) ----
    const currentStyle = function () {
      try {
        const snap = scope.getSnapshot()
        if (snap && snap.status === 'ready' && snap.value && typeof snap.value.effortStyle === 'string') {
          return resolveStyle(snap.value.effortStyle)
        }
      } catch (_) { /* fall through */ }
      return DEFAULT_STYLE
    }

    const RowFrame = function (props: RowFrameProps): ReactElement {
      return (
        <div className="aem-settingRow">
          <div className="aem-settingRowText">
            <div className="aem-settingRowTitle">{props.title}</div>
            <div className="aem-settingRowDesc">{props.desc}</div>
          </div>
          {props.children}
        </div>
      )
    }
    const Toggle = function (props: ToggleProps): ReactElement {
      return (
        <button
          type="button"
          role="switch"
          aria-checked={props.checked}
          aria-label={props.label}
          title={props.checked ? t('settings.on') : t('settings.off')}
          className="aem-settingSwitch"
          disabled={props.disabled}
          onClick={props.onClick}
        >
          <span className="aem-settingKnob" />
        </button>
      )
    }

    // 显示桌宠
    const PetRow = function (props: RowProps): ReactElement {
      const snap = props.useScope((s) => s)
      const ready = snap && snap.status === 'ready'
      const enabled = ready ? snap.value!.petEnabled !== false : true
      return (
        <RowFrame title={t('pet.toggle.title')} desc={t('pet.toggle.desc')}>
          <Toggle
            checked={enabled}
            label={t('pet.toggle.title')}
            disabled={!ready || !snap.writable}
            onClick={() => { void props.scope.set('petEnabled', !enabled).catch(() => { }) }}
          />
        </RowFrame>
      )
    }

    // 高级的推理强度选择
    const AdvancedRow = function (props: RowProps): ReactElement {
      const snap = props.useScope((s) => s)
      const ready = snap && snap.status === 'ready'
      const enabled = !!(ready && snap.value && snap.value.advancedEffort === true)
      return (
        <RowFrame title={t('settings.advancedEffort.title')} desc={t('settings.advancedEffort.desc')}>
          <Toggle
            checked={enabled}
            label={t('settings.advancedEffort.title')}
            disabled={!ready || !snap.writable}
            onClick={() => { void props.scope.set('advancedEffort', !enabled).catch(() => { }) }}
          />
        </RowFrame>
      )
    }

    // 最高档动画样式 (shown while the advanced-effort toggle is on)
    const StyleRow = function (props: RowProps): ReactElement | null {
      const snap = props.useScope((s) => s)
      const ready = snap && snap.status === 'ready'
      const advancedOn = !!(ready && snap.value && snap.value.advancedEffort === true)
      if (!advancedOn) return null
      const current = ready && snap.value && typeof snap.value.effortStyle === 'string'
        ? resolveStyle(snap.value.effortStyle)
        : DEFAULT_STYLE
      const currentDef = EFFECT_STYLES.find((s) => s.id === current) || EFFECT_STYLES[0]
      return (
        <RowFrame title={t('settings.style.title')} desc={t('settings.style.desc')}>
          <div className="aem-styleSelect">
            <select
              aria-label={t('settings.style.title')}
              value={currentDef.id}
              disabled={!ready || !snap.writable}
              onChange={(event) => { void props.scope.set('effortStyle', event.target.value).catch(() => { }) }}
            >
              {EFFECT_STYLES.map((s) => <option key={s.id} value={s.id}>{t(s.titleKey)}</option>)}
            </select>
          </div>
        </RowFrame>
      )
    }

    /** Text field that commits on blur or Enter, so partial hex text never writes. */
    const HexField = function (props: {
      readonly value: string
      readonly disabled: boolean
      readonly onCommit: (next: string) => void
    }): ReactElement {
      const [draft, setDraft] = useState(props.value)
      useEffect(function () { setDraft(props.value) }, [props.value])
      const valid = parseHex(draft) !== null
      const commit = function (): void {
        const next = draft.trim()
        if (!valid) setDraft(props.value)
        else if (next !== props.value) props.onCommit(next)
      }
      return (
        <input
          className="aem-surfaceInput"
          type="text"
          value={draft}
          disabled={props.disabled}
          spellCheck={false}
          data-invalid={valid ? undefined : true}
          onChange={function (event) { setDraft(event.target.value) }}
          onBlur={commit}
          onKeyDown={function (event) { if (event.key === 'Enter') { event.preventDefault(); commit() } }}
        />
      )
    }

    /**
     * Range field for opacity and blur. Dragging previews the surface straight
     * away (no settings round-trip), and the scope write happens once at the end
     * of the gesture. The draft is held until the stored value catches up, so the
     * handle never snaps back while the host's answer is in flight.
     */
    const RangeField = function (props: {
      readonly label: string
      readonly value: number
      readonly min: number
      readonly max: number
      readonly suffix: string
      readonly disabled: boolean
      readonly onPreview: (next: number) => void
      readonly onCommit: (next: number) => void
    }): ReactElement {
      const [draft, setDraft] = useState<number | null>(null)
      const shown = draft ?? props.value
      useEffect(function () {
        if (draft !== null && Math.round(props.value) === draft) setDraft(null)
      }, [props.value, draft])
      const commit = function (): void {
        if (draft !== null) props.onCommit(draft)
      }
      return (
        <div className="aem-surfaceRangeRow">
          <input
            className="aem-surfaceRange"
            type="range"
            min={props.min}
            max={props.max}
            step={1}
            value={String(Math.round(shown))}
            disabled={props.disabled}
            aria-label={props.label}
            onChange={function (event) {
              const next = Number(event.target.value)
              if (!Number.isFinite(next)) return
              setDraft(next)
              props.onPreview(next)
            }}
            onPointerUp={commit}
            onKeyUp={commit}
            onBlur={commit}
          />
          <span className="aem-surfaceValue">{Math.round(shown)}{props.suffix}</span>
        </div>
      )
    }

    /** One surface card: colour, opacity and blur stacked over the settings fields. */
    const SurfacePartCard = function (
      props: RowProps & { readonly part: SurfaceKey; readonly title: string },
    ): ReactElement {
      const snap = props.useScope(function (s) { return s })
      const ready = snap !== null && snap.status === 'ready'
      const writable = snap !== null && snap.writable
      const disabled = !ready || !writable
      const value = readScheme(snap?.value).parts[props.part]
      const set = function (field: string, next: unknown): void {
        void props.scope.set(field, next).catch(function () { })
      }
      const preview = function (next: SurfacePart): void {
        const scheme = readScheme(snap?.value)
        const parts: Record<SurfaceKey, SurfacePart> = { ...scheme.parts, [props.part]: next }
        applyScheme({ enabled: scheme.enabled, parts })
      }
      return (
        <div className="aem-surfaceCard">
          <div className="aem-surfaceCardTitle">{props.title}</div>
          <label className="aem-surfaceField">
            <span className="aem-surfaceLabel">{t('surface.color')}</span>
            <HexField
              value={value.color}
              disabled={disabled}
              onCommit={function (color) { set(props.part + 'Color', color) }}
            />
          </label>
          <label className="aem-surfaceField">
            <span className="aem-surfaceLabel">{t('surface.opacity')}</span>
            <RangeField
              label={props.title + ' ' + t('surface.opacity')}
              value={value.opacity * 100}
              min={0}
              max={100}
              suffix="%"
              disabled={disabled}
              onPreview={function (percent) { preview({ ...value, opacity: percent / 100 }) }}
              onCommit={function (percent) { set(props.part + 'Opacity', percent / 100) }}
            />
          </label>
          <label className="aem-surfaceField">
            <span className="aem-surfaceLabel">{t('surface.blur')}</span>
            <RangeField
              label={props.title + ' ' + t('surface.blur')}
              value={value.blur}
              min={0}
              max={BLUR_MAX}
              suffix="px"
              disabled={disabled}
              onPreview={function (px) { preview({ ...value, blur: px }) }}
              onCommit={function (px) { set(props.part + 'Blur', px) }}
            />
          </label>
        </div>
      )
    }

    /** Master switch: hands the four surfaces between us and the theme palette. */
    const SurfaceRow = function (props: RowProps): ReactElement {
      const snap = props.useScope(function (s) { return s })
      const ready = snap !== null && snap.status === 'ready'
      const writable = snap !== null && snap.writable
      const enabled = readScheme(snap?.value).enabled
      return (
        <RowFrame title={t('surface.toggle.title')} desc={t('surface.toggle.desc')}>
          <Toggle
            checked={enabled}
            label={t('surface.toggle.title')}
            disabled={!ready || !writable}
            onClick={function () { void props.scope.set('surfaceScheme', !enabled).catch(function () { }) }}
          />
        </RowFrame>
      )
    }

    /** The four surface cards, drawn as a 2×2 grid while the scheme is on. */
    const SurfaceParts = function (props: RowProps): ReactElement | null {
      const snap = props.useScope(function (s) { return s })
      if (snap === null || snap.status !== 'ready' || !readScheme(snap.value).enabled) return null
      return (
        <div className="aem-surfaceList">
          <div className="aem-surfaceHint">{t('surface.hint')}</div>
          <div className="aem-surfaceGrid">
            <SurfacePartCard {...props} part="sidebar" title={t('surface.sidebar')} />
            <SurfacePartCard {...props} part="panel" title={t('surface.panel')} />
            <SurfacePartCard {...props} part="chat" title={t('surface.chat')} />
            <SurfacePartCard {...props} part="input" title={t('surface.input')} />
          </div>
        </div>
      )
    }

    /** The "爱弥斯主题" section content: our rows, bound to the scope. */
    const AemeathSection = function (props: RowProps): ReactElement {
      const rowProps: RowProps = { useScope: props.useScope, scope: props.scope }
      return (
        <div className="aem-settingsSection">
          <PetRow {...rowProps} />
          <AdvancedRow {...rowProps} />
          <StyleRow {...rowProps} />
          <SurfaceRow {...rowProps} />
          <SurfaceParts {...rowProps} />
        </div>
      )
    }

    slots.inject('settings.section', function () {
      return slots.register({
        name: 'settings.section',
        id: 'aemeath',
        order: 100,
        label: () => t('nav.title'),
        inject: () => ({ useScope, scope }),
      }, AemeathSection)
    })

    // ---- conditional composer seat: claim the model slot while advanced ----
    // effort is on; release it (back to the official selector) when off.
    //
    // This per-session single-slot cell elects its winner by priority, and
    // only a later registration shadows that winner. Two consequences:
    //  · the official selector can register after our boot registration and
    //    take the cell (a manual toggle off/on wins it back by registering
    //    again), and
    //  · every new session cell starts from the priority election again, so
    //    switching sessions hands the cell back to the official selector.
    // The seat therefore watches whether its control actually renders
    // (mount/unmount reports from the component) and re-registers through a
    // bounded verify ladder while it is not. No slot subscription and no
    // recursion — it cannot loop.
    const SLOT_KEY = 'conversation.input.model'
    let seatFiber: Fiber | null = null
    const syncSeat = function () {
      let enabled = false
      try {
        const snap = scope.getSnapshot()
        enabled = !!(snap && snap.status === 'ready' && snap.value && snap.value.advancedEffort === true)
      } catch (_) { /* treat as disabled */ }
      if (enabled && !seatFiber) {
        seatFiber = sctx.inject(['slots', 'modelDirectories', 'sessions'], function (seatCtx) {
          const models = seatCtx.modelDirectories
          const sessions = seatCtx.sessions

          // Seat liveness: a fresh session cell elects its winner by
          // priority, and only a later registration shadows it. Session
          // switches therefore hand the cell back to the official
          // selector until we register again (exactly what a manual
          // toggle does). The control reports its mount/unmount here and
          // a bounded verify ladder re-registers while it is not rendering.
          let entryDispose: Dispose | null = null
          let generation = 0
          let mountedGeneration = -1
          let reRegisters = 0
          let verifyTimer: ReturnType<typeof setTimeout> | null = null
          let disposed = false

          const entryOptions = function (myGeneration: number): SlotEntryOptions<ModelEffortControlProps> {
            return {
              name: SLOT_KEY,
              priority: -100,
              inject: function (sessionId) {
                const directory = models.directoryFor(sessionId)
                const available = sessions && typeof sessions.subagentAddress === 'function'
                  ? sessions.subagentAddress(sessionId) === void 0
                  : true
                return {
                  available,
                  directory: directory.store,
                  load: function () { if (available) directory.load().catch(function () { }) },
                  select: function (selection) {
                    return available
                      ? directory.select(selection).then(function () { return true }, function () { return false })
                      : Promise.resolve(false)
                  },
                  t,
                  sessionId,
                  style: currentStyle(),
                  settingsScope: scope,
                  seatGeneration: myGeneration,
                  onSeatMounted,
                  onSeatLost,
                }
              },
            }
          }
          const registerEntry = function () {
            generation += 1
            entryDispose = seatCtx.slots!.register(entryOptions(generation), ModelEffortControl)
          }
          // Backoff ladder: the first check waits for a possible mount,
          // later checks cover a composer/session that appears late.
          const VERIFY_DELAYS = [500, 1200, 2500, 5000, 10000, 20000]
          const verify = function (attempt: number) {
            verifyTimer = null
            if (disposed) return
            if (mountedGeneration === generation) return // seat renders: healthy
            if (attempt >= VERIFY_DELAYS.length || reRegisters >= 200) return
            reRegisters += 1
            if (entryDispose !== null) {
              try { entryDispose() } catch (_) { /* already gone */ }
              entryDispose = null
            }
            registerEntry()
            scheduleVerify(attempt + 1)
          }
          const scheduleVerify = function (attempt: number) {
            if (disposed || verifyTimer !== null || attempt >= VERIFY_DELAYS.length) return
            verifyTimer = setTimeout(function () { verify(attempt) }, VERIFY_DELAYS[attempt])
          }
          function onSeatMounted(generationOfMount: number) {
            mountedGeneration = generationOfMount
          }
          function onSeatLost(generationOfMount: number) {
            if (generationOfMount === mountedGeneration) mountedGeneration = -1
            scheduleVerify(0)
          }

          // Canonical mount: wait for the slot to be declared, register,
          // then watch whether the seat actually renders.
          seatCtx.slots!.inject(SLOT_KEY, function () {
            registerEntry()
            scheduleVerify(0)
          })
          seatCtx.effect(function () {
            return function () {
              disposed = true
              if (verifyTimer !== null) {
                clearTimeout(verifyTimer)
                verifyTimer = null
              }
            }
          }, 'dsh-aemeath: seat verify ladder')
        })
      } else if (!enabled && seatFiber) {
        try { void seatFiber.dispose() } catch (_) { /* already disposed */ }
        seatFiber = null
      }
    }

    // Live re-evaluation on settings changes (user writes always emit).
    sctx.effect(function () { return scope.subscribe(syncSeat) }, 'dsh-aemeath: seat sync')

    // Hydration guard: the persisted document can land without a subscribe
    // event, so poll briefly (bounded) until the first ready snapshot.
    let hydrationTimer: ReturnType<typeof setInterval> | null = null
    let attempts = 0
    sctx.effect(function () {
      hydrationTimer = setInterval(function () {
        attempts += 1
        let ready = false
        try {
          const snap = scope.getSnapshot()
          ready = !!(snap && snap.status === 'ready')
        } catch (_) { /* keep polling */ }
        syncSeat()
        syncSurfaces()
        if (ready || attempts >= 50) {
          clearInterval(hydrationTimer!)
          hydrationTimer = null
        }
      }, 200)
      return function () {
        if (hydrationTimer) {
          clearInterval(hydrationTimer)
          hydrationTimer = null
        }
      }
    }, 'dsh-aemeath: seat hydration poll')

    syncSeat()
  })
}
