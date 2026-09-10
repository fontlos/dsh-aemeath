// Plugin settings page ("爱弥斯主题" tab in the dsh settings panel) + the
// conditional composer seat for the advanced model/effort control.
//
// The tab registers one `settings.section` entry (rendered by the settings
// shell when active) which draws the three rows itself — pet visibility,
// advanced-effort toggle and its max-tier animation style — all bound to the
// `dsh-aemeath` settings scope. The seat claims the `conversation.input.model`
// slot only while advancedEffort is on.
//
// Settings hydrate asynchronously on page load, and this single-slot cell
// renders its latest registration — so the seat re-registers a few times
// shortly after boot whenever the official selector landed after us (see the
// seat section below). Both are bounded and event-free.

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
        // This single-slot cell renders the LATEST registration ("later shadows
        // earlier"). The official selector's bundle activates together with the
        // conversation UI, so it can register AFTER our boot registration and
        // silently win the cell — a manual toggle off/on fixes it precisely
        // because it re-registers us last. The bounded late-correction below
        // does the same automatically: a few one-shot checks after boot
        // re-register our entry when someone else landed after us. It does NOT
        // subscribe and never recurses, so it cannot loop.
        const SLOT_KEY = 'conversation.input.model'
        const OUR_REGISTRANT = 'dsh-aemeath'
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
                    let entryDispose = null

                    const entryOptions = function () {
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
                                }
                            },
                        }
                    }
                    const registerEntry = function () {
                        entryDispose = seatCtx.slots.register(entryOptions(), ModelEffortControl)
                    }
                    // Canonical mount: wait for the slot to be declared, register.
                    seatCtx.slots.inject(SLOT_KEY, function () { registerEntry() })

                    // Bounded refresh-race correction (see the comment above).
                    const registrantOf = function (entry) {
                        const options = entry && entry.options
                        return (options && options.registrant) || (entry && entry.registrant)
                    }
                    let corrections = 0
                    let lastOthers = -1
                    const correct = function () {
                        if (corrections >= 3 || entryDispose === null) return
                        let all = []
                        try { all = seatCtx.slots.entries(SLOT_KEY) || [] } catch (_) { return }
                        const others = all.filter(function (e) { return registrantOf(e) !== OUR_REGISTRANT }).length
                        const lastIsOurs = all.length > 0 && registrantOf(all[all.length - 1]) === OUR_REGISTRANT
                        if (others > 0 && !lastIsOurs && others !== lastOthers) {
                            corrections += 1
                            lastOthers = others
                            try { entryDispose() } catch (_) { /* already gone */ }
                            entryDispose = null
                            registerEntry()
                        }
                    }
                    const timers = [600, 1500, 3000, 6000, 10000].map(function (ms) {
                        return setTimeout(correct, ms)
                    })
                    seatCtx.effect(function () {
                        return function () {
                            for (let i = 0; i < timers.length; i++) clearTimeout(timers[i])
                        }
                    }, 'dsh-aemeath: seat late corrections')
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
