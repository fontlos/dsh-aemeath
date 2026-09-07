// Pet: Q-version pixel Aemeath. pet.css is injected as <link> (served by the host).

import React from 'react'
import { bindSnapshotSelector } from './effort/store.js'

const CSS_KEY = 'dsh-aemeath/pet.css'
const CSS_HREF = '/dsh-aemeath/pet.css'


// Frame map (row, col) per animation, from the 15-row atlas (used cells only).
const FRAMES = {
    idle: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5]],
    'running-right': [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7]],
    'running-left': [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7]],
    waving: [[3, 0], [3, 1], [3, 2], [3, 3]],
    jumping: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4]],
    failed: [[5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [5, 6], [5, 7]],
    waiting: [[6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5]],
    running: [[7, 0], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    review: [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5]],
    chatting: [[9, 0], [9, 1], [9, 2], [9, 3], [9, 4], [9, 5], [9, 6], [9, 7]],
    fetching: [[10, 0], [10, 1], [10, 2], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7]],
    searching: [[11, 0], [11, 1], [11, 2], [11, 3], [11, 4], [11, 5], [11, 6], [11, 7]],
    analyzing: [[12, 0], [12, 1], [12, 2], [12, 3], [12, 4], [12, 5], [12, 6], [12, 7]],
    building: [[13, 0], [13, 1], [13, 2], [13, 3], [13, 4], [13, 5], [13, 6], [13, 7]],
    celebrating: [[14, 0], [14, 1], [14, 2], [14, 3], [14, 4], [14, 5], [14, 6], [14, 7]],
}

// Left-click reactions: a random little animation + bubble line.
const REACTIONS = [
    { anim: 'waving', text: '嗨~ 我在呢！' },
    { anim: 'jumping', text: '嘿嘿，怎么啦~' },
    { anim: 'chatting', text: '抱抱你~' },
    { anim: 'waving', text: '有什么我可以帮忙的吗？' },
]

// Pet visibility lives in the dsh-aemeath settings scope (petEnabled, host
// schema). The settings service is a soft dependency: the bridge below is
// filled by the mount-time inject, and while it is absent the pet falls back
// to the legacy localStorage hidden flag.
const scopeBox = { current: null }

function usePetSetting() {
    // Wake up when the settings scope arrives after this component mounted
    // (it may register later than the first render).
    const [, bump] = React.useState(0)
    React.useEffect(() => {
        if (scopeBox.current) return
        let attempts = 0
        const timer = setInterval(() => {
            if (scopeBox.current) {
                clearInterval(timer)
                bump((v) => v + 1)
                return
            }
            attempts += 1
            if (attempts >= 100) clearInterval(timer) // no settings host: stop quietly
        }, 200)
        return () => clearInterval(timer)
    }, [])
    const source = scopeBox.current
    const useScope = source ? bindSnapshotSelector(source) : null
    const snap = useScope ? useScope((s) => s) : null
    return snap
}

function mount(ctx) {
    const slots = ctx.slots || ctx.get('slots')

    // ---- inject pet stylesheet (served by the host, once per fiber) ----
    if (typeof document !== 'undefined' && !document.querySelector('link[data-plugin-css=' + JSON.stringify(CSS_KEY) + ']')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = CSS_HREF
        link.dataset.plugin = 'dsh-aemeath'
        link.dataset.pluginCss = CSS_KEY
        document.head.appendChild(link)
        ctx.effect(() => () => link.remove(), 'dsh-aemeath: pet css cleanup')
    }

    // ---- settings scope bridge (soft dependency) ----
    // Bind the dsh-aemeath namespace when the service is (or becomes) live.
    const bindScope = () => {
        const svc = ctx.get('settingsScope') || ctx.settingsScope
        if (svc && typeof svc.bind === 'function') scopeBox.current = svc.bind({ namespace: 'dsh-aemeath' })
    }
    bindScope()
    ctx.inject(['settingsScope'], (sctx) => {
        scopeBox.current = sctx.settingsScope.bind({ namespace: 'dsh-aemeath' })
    })

    // ---- localStorage helpers ----
    function readLS(key, fallback) {
        try {
            const v = window.localStorage.getItem('dsh-aemeath.' + key)
            return v === null ? fallback : v
        } catch (_) { return fallback }
    }
    function writeLS(key, value) {
        try { window.localStorage.setItem('dsh-aemeath.' + key, value) } catch (_) { }
    }

    // ---- shared drag / position state ----
    let savedPos = null
    try { savedPos = JSON.parse(readLS('pos', 'null')) } catch (_) { }
    const posState = {
        right: savedPos && Number.isFinite(savedPos.right) ? savedPos.right : 28,
        bottom: savedPos && Number.isFinite(savedPos.bottom) ? savedPos.bottom : 28,
    }
    function persistPos() {
        writeLS('pos', JSON.stringify({ right: posState.right, bottom: posState.bottom }))
    }

    // Stable drag state — must live outside Pet so the mount-once window
    // listeners and the re-attached onPointerDown share the SAME object.
    const drag = { active: false, moved: false, sx: 0, sy: 0, sr: 0, sb: 0 }

    let overrideUntil = 0
    function playTemp(animName, ms) {
        overrideUntil = Date.now() + ms
        if (window.__aemSetAnim) window.__aemSetAnim(animName)
    }

    // ---- pet component ----
    function Pet() {
        // petEnabled (settings) is the source of truth once ready; until then
        // the legacy localStorage hidden flag below governs.
        const settingSnap = usePetSetting()
        const settingReady = !!(settingSnap && settingSnap.status === 'ready' && settingSnap.value)
        const settingVisible = settingReady ? settingSnap.value.petEnabled !== false : true
        const [hidden, setHidden] = React.useState(() => readLS('hidden', '0') === '1')
        const [anim, setAnim] = React.useState('idle')
        const [frame, setFrame] = React.useState(0)
        const [bubble, setBubble] = React.useState({ text: '你好呀，我是爱弥斯~', persistent: false })
        const [menuOpen, setMenuOpen] = React.useState(false)
        const [dragging, setDragging] = React.useState(false)

        window.__aemSetAnim = setAnim

        function onReact() {
            const r = REACTIONS[Math.floor(Math.random() * REACTIONS.length)]
            setMenuOpen(false)
            overrideUntil = Date.now() + 2300
            setAnim(r.anim)
            setBubble({ text: r.text, persistent: false })
        }

        // Hide: persist via the settings scope when available (keeps the
        // theme-page switch in sync), else fall back to the legacy flag.
        function hidePet() {
            if (settingReady && scopeBox.current) {
                scopeBox.current.set('petEnabled', false).catch(() => { })
            } else {
                setHidden(true)
                writeLS('hidden', '1')
            }
        }

        // frame ticker
        React.useEffect(() => {
            const frames = FRAMES[anim] || FRAMES.idle
            setFrame(0)
            const t = setInterval(() => setFrame((f) => (f + 1) % frames.length), 180)
            return () => clearInterval(t)
        }, [anim])

        // status poll
        React.useEffect(() => {
            let alive = true
            const tick = async () => {
                try {
                    const r = await fetch('/dsh-aemeath/status')
                    if (!alive || !r.ok) return
                    const data = await r.json()
                    const core = String(data.core || 'idle')
                    const text = String(data.bubble || '')
                    if (Date.now() >= overrideUntil) setAnim(String(data.animation || 'idle'))
                    if (text) {
                        setBubble({ text, persistent: core === 'running' || core === 'chatting' || core === 'waiting' })
                    } else if (core !== 'running' && core !== 'chatting' && core !== 'waiting') {
                        setBubble((b) => (b.text ? { text: '', persistent: false } : b))
                    }
                } catch (_) { }
            }
            tick()
            const t = setInterval(tick, 900)
            return () => { alive = false; clearInterval(t) }
        }, [])

        // non-persistent bubble auto-hide
        React.useEffect(() => {
            if (bubble.persistent || !bubble.text) return
            const t = setTimeout(() => setBubble({ text: '', persistent: false }), 4200)
            return () => clearTimeout(t)
        }, [bubble])

        // idle random animations
        React.useEffect(() => {
            if (anim !== 'idle') return
            const t = setTimeout(() => {
                const pick = ['waving', 'jumping', 'chatting'][Math.floor(Math.random() * 3)]
                overrideUntil = Date.now() + 2300
                setAnim(pick)
                setTimeout(() => { if (Date.now() >= overrideUntil) setAnim('idle') }, 2200)
            }, 12000 + Math.random() * 26000)
            return () => clearTimeout(t)
        }, [anim])

        // drag + click (drag object is defined in mount scope, not here)
        const onPointerDown = (e) => {
            if (e.button !== 0) return
            drag.active = true
            drag.moved = false
            drag.sx = e.clientX
            drag.sy = e.clientY
            drag.sr = posState.right
            drag.sb = posState.bottom
        }
        React.useEffect(() => {
            const move = (e) => {
                if (!drag.active) return
                const dx = e.clientX - drag.sx
                const dy = e.clientY - drag.sy
                if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true
                if (!drag.moved) return
                setDragging(true)
                posState.right = Math.max(4, Math.round(drag.sr - dx))
                posState.bottom = Math.max(4, Math.round(drag.sb - dy))
                setMenuOpen(false)
            }
            const up = () => {
                if (!drag.active) return
                const wasMoved = drag.moved
                drag.active = false
                setDragging(false)
                if (wasMoved) persistPos()
                else onReact()
            }
            window.addEventListener('pointermove', move)
            window.addEventListener('pointerup', up)
            return () => {
                window.removeEventListener('pointermove', move)
                window.removeEventListener('pointerup', up)
            }
        }, [])

        // Disabled in settings: render nothing (re-enable from the theme tab).
        if (!settingVisible) return null

        if (hidden && !settingReady) {
            return React.createElement('div', {
                className: 'aem-pet',
                style: { right: posState.right, bottom: posState.bottom },
            }, React.createElement('button', {
                className: 'aem-pet-summon',
                title: '召唤爱弥斯',
                onClick: () => { setHidden(false); writeLS('hidden', '0') },
            }, '🪄'))
        }

        const frames = FRAMES[anim] || FRAMES.idle
        const cell = frames[frame % frames.length]
        const spriteStyle = { backgroundPosition: '-' + (cell[1] * 160) + 'px -' + (cell[0] * 173.33).toFixed(1) + 'px' }

        const children = []
        if (bubble.text) {
            children.push(React.createElement('div', { className: 'aem-pet-bubble', key: 'b' }, bubble.text))
        }
        if (menuOpen) {
            children.push(React.createElement('div', { className: 'aem-pet-menu', key: 'm' },
                React.createElement('button', { onClick: () => { setMenuOpen(false); playTemp(['waving', 'jumping', 'chatting'][Math.floor(Math.random() * 3)], 2300) } }, '🐾 换个表情'),
                React.createElement('button', { onClick: () => { setMenuOpen(false); setBubble({ text: '你好呀，我是爱弥斯~ 一起加油吧！', persistent: false }) } }, '💬 打招呼'),
                React.createElement('button', { onClick: () => { setMenuOpen(false); hidePet() } }, '✕ 隐藏桌宠'),
            ))
        }
        children.push(React.createElement('div', {
            key: 's',
            className: 'aem-pet-sprite' + (dragging ? ' aem-dragging' : ''),
            style: spriteStyle,
            onPointerDown: onPointerDown,
            onContextMenu: (e) => { e.preventDefault(); setMenuOpen((o) => !o) },
        }))

        return React.createElement('div', {
            className: 'aem-pet',
            style: { right: posState.right, bottom: posState.bottom },
        }, ...children)
    }

    // ---- register pet in the frame-wide overlay slot ----
    // The plugin entry declares inject: ['slots'], so `slots` is live here; the
    // guard stays as a soft fallback for hosts without a slot system.
    if (slots) {
        slots.inject('shell.overlay', () => slots.register(
            { name: 'shell.overlay', id: 'dsh-aemeath-pet', order: 10, label: '爱弥斯桌宠' },
            () => React.createElement(Pet, null),
        ))
    } else {
        console.warn('[dsh-aemeath] slots service unavailable — desktop pet disabled (skin CSS still applied)')
    }
}


export { mount }
