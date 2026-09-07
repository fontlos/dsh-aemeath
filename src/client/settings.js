// Plugin settings page ("爱弥斯主题" tab in the dsh settings panel) + the
// conditional composer seat for the advanced model/effort control.
//
// The tab registers one `settings.section` entry (rendered by the settings
// shell when active) which draws the three rows itself — pet visibility,
// advanced-effort toggle and its max-tier animation style — all bound to the
// `dsh-aemeath` settings scope. The seat claims the `conversation.input.model`
// slot only while advancedEffort is on.
//
// Settings hydrate asynchronously on page load and the scope can become ready
// without emitting a subscribe event; syncSeat therefore also polls until the
// first ready snapshot so the seat engages after a refresh without a manual
// toggle (see syncSeat + hydration poll below).

import React from 'react'
import { NS, zh, en } from './effort/i18n.js'
import { EFFECT_STYLES, DEFAULT_STYLE } from './effort/fx.js'
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
                    const known = EFFECT_STYLES.some((s) => s.id === snap.value.effortStyle)
                    if (known) return snap.value.effortStyle
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
                ? snap.value.effortStyle
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
                    seatCtx.slots.inject('conversation.input.model', function () {
                        return seatCtx.slots.register({
                            name: 'conversation.input.model',
                            // Single slot: one registration per priority; lowest renders. The
                            // official model selector sits at priority 0 — shadow it with a
                            // lower priority while the advanced-effort toggle is on, and the
                            // official control returns automatically when this fiber dies.
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
                                }
                            },
                        }, ModelEffortControl)
                    })
                })
            } else if (!enabled && seatFiber) {
                try { seatFiber.dispose() } catch (_) { /* already disposed */ }
                seatFiber = null
            }
        }

        // Live re-evaluation on settings changes.
        sctx.effect(function () { return scope.subscribe(syncSeat) }, 'dsh-aemeath: seat sync')

        // Bugfix (page refresh): the settings document hydrates asynchronously
        // and the snapshot can reach `ready` without a subscribe event (the
        // hydration may precede this effect). Until the first ready snapshot
        // — or the attempts budget — poll syncSeat so a persisted
        // advancedEffort=true engages the seat without a manual toggle.
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
                if (ready || attempts >= 100) {
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
