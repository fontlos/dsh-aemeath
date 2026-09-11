// Plugin settings page ("爱弥斯主题" tab in the dsh settings panel) + the
// conditional composer seat for the advanced model/effort control.
//
// The tab registers one `settings.section` entry (rendered by the settings
// shell when active) which draws the three rows itself — pet visibility,
// advanced-effort toggle and its max-tier animation style — all bound to the
// `dsh-aemeath` settings scope. The seat claims the `conversation.input.model`
// slot only while advancedEffort is on.
//
// The seat claims the `conversation.input.model` slot only while advancedEffort
// is on. That cell is per-session and elects its winner by priority, so the
// seat re-registers whenever its control stops rendering (boot race with the
// official selector, session switches) — see the seat section below. All of it
// is bounded and event-free.

import React from 'react'
import { NS, zh, en } from './effort/i18n.js'
import { EFFECT_STYLES, DEFAULT_STYLE, resolveStyle } from './effort/fx.js'
import { bindSnapshotSelector } from './effort/store.js'
import { ModelEffortControl } from './effort/control/index.js'

function mount(ctx) {
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
        const t = sctx.locale.bind(NS)
        const scope = sctx.settingsScope.bind({ namespace: 'dsh-aemeath' })
        const useScope = bindSnapshotSelector(scope)

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

        /** Shared switch markup: title/desc on the left, switch on the right. */
        const RowFrame = function (props) {
            return React.createElement(
                'div', { className: 'aem-settingRow' },
                React.createElement(
                    'div', { className: 'aem-settingRowText' },
                    React.createElement('div', { className: 'aem-settingRowTitle' }, props.title),
                    React.createElement('div', { className: 'aem-settingRowDesc' }, props.desc)
                ),
                props.children
            )
        }
        const Toggle = function (props) {
            return React.createElement(
                'button',
                {
                    type: 'button',
                    role: 'switch',
                    'aria-checked': props.checked,
                    'aria-label': props.label,
                    title: props.checked ? t('settings.on') : t('settings.off'),
                    className: 'aem-settingSwitch',
                    disabled: props.disabled,
                    onClick: props.onClick,
                },
                React.createElement('span', { className: 'aem-settingKnob' })
            )
        }

        // 显示桌宠
        const PetRow = function (props) {
            const snap = props.useScope((s) => s)
            const ready = snap && snap.status === 'ready'
            const enabled = ready ? snap.value.petEnabled !== false : true
            return React.createElement(RowFrame, {
                title: t('pet.toggle.title'),
                desc: t('pet.toggle.desc'),
                children: React.createElement(Toggle, {
                    checked: enabled,
                    label: t('pet.toggle.title'),
                    disabled: !ready || !snap.writable,
                    onClick: () => props.scope.set('petEnabled', !enabled).catch(() => { }),
                }),
            })
        }

        // 高级的推理强度选择
        const AdvancedRow = function (props) {
            const snap = props.useScope((s) => s)
            const ready = snap && snap.status === 'ready'
            const enabled = !!(ready && snap.value && snap.value.advancedEffort === true)
            return React.createElement(RowFrame, {
                title: t('settings.advancedEffort.title'),
                desc: t('settings.advancedEffort.desc'),
                children: React.createElement(Toggle, {
                    checked: enabled,
                    label: t('settings.advancedEffort.title'),
                    disabled: !ready || !snap.writable,
                    onClick: () => props.scope.set('advancedEffort', !enabled).catch(() => { }),
                }),
            })
        }

        // 最高档动画样式 (shown while the advanced-effort toggle is on)
        const StyleRow = function (props) {
            const snap = props.useScope((s) => s)
            const ready = snap && snap.status === 'ready'
            const advancedOn = !!(ready && snap.value && snap.value.advancedEffort === true)
            if (!advancedOn) return null
            const current = ready && snap.value && typeof snap.value.effortStyle === 'string'
                ? resolveStyle(snap.value.effortStyle)
                : DEFAULT_STYLE
            const currentDef = EFFECT_STYLES.find((s) => s.id === current) || EFFECT_STYLES[0]
            return React.createElement(RowFrame, {
                title: t('settings.style.title'),
                desc: t('settings.style.desc'),
                children: React.createElement(
                    'div', { className: 'aem-styleSelect' },
                    React.createElement(
                        'select',
                        {
                            'aria-label': t('settings.style.title'),
                            value: currentDef.id,
                            disabled: !ready || !snap.writable,
                            onChange: (event) => props.scope.set('effortStyle', event.target.value).catch(() => { }),
                        },
                        EFFECT_STYLES.map((s) => React.createElement('option', { key: s.id, value: s.id }, t(s.titleKey)))
                    )
                ),
            })
        }

        /** The "爱弥斯主题" section content: our rows, bound to the scope. */
        const AemeathSection = function (props) {
            const rowProps = { useScope: props.useScope, scope: props.scope }
            return React.createElement(
                'div', { className: 'aem-settingsSection' },
                React.createElement(PetRow, rowProps),
                React.createElement(AdvancedRow, rowProps),
                React.createElement(StyleRow, rowProps),
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
        let seatFiber = null
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
                    let entryDispose = null
                    let generation = 0
                    let mountedGeneration = -1
                    let reRegisters = 0
                    let verifyTimer = null
                    let disposed = false

                    const entryOptions = function (myGeneration) {
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
                        entryDispose = seatCtx.slots.register(entryOptions(generation), ModelEffortControl)
                    }
                    // Backoff ladder: the first check waits for a possible mount,
                    // later checks cover a composer/session that appears late.
                    const VERIFY_DELAYS = [500, 1200, 2500, 5000, 10000, 20000]
                    const verify = function (attempt) {
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
                    const scheduleVerify = function (attempt) {
                        if (disposed || verifyTimer !== null || attempt >= VERIFY_DELAYS.length) return
                        verifyTimer = setTimeout(function () { verify(attempt) }, VERIFY_DELAYS[attempt])
                    }
                    function onSeatMounted(generationOfMount) {
                        mountedGeneration = generationOfMount
                    }
                    function onSeatLost(generationOfMount) {
                        if (generationOfMount === mountedGeneration) mountedGeneration = -1
                        scheduleVerify(0)
                    }

                    // Canonical mount: wait for the slot to be declared, register,
                    // then watch whether the seat actually renders.
                    seatCtx.slots.inject(SLOT_KEY, function () {
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
                try { seatFiber.dispose() } catch (_) { /* already disposed */ }
                seatFiber = null
            }
        }

        // Live re-evaluation on settings changes (user writes always emit).
        sctx.effect(function () { return scope.subscribe(syncSeat) }, 'dsh-aemeath: seat sync')

        // Hydration guard: the persisted document can land without a subscribe
        // event, so poll briefly (bounded) until the first ready snapshot.
        let hydrationTimer = null
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
                if (ready || attempts >= 50) {
                    clearInterval(hydrationTimer)
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

export { mount }
