/**
 * Pet: Q-version pixel Aemeath. pet.css is injected as <link> (served by the host).
 */
import { useEffect, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { SettingsScopeBinder, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { AemeathSettings } from '../settings-contract'
import type { AemeathSettingsScope } from './effort/control/contract'
import { bindSnapshotSelector } from './effort/store'

declare global {
  interface Window {
    /** Animation override channel driven by the drag/click reactions. */
    __aemSetAnim?: (animation: PetAnimation) => void
  }
}

const CSS_KEY = 'dsh-aemeath/pet.css'
const CSS_HREF = '/dsh-aemeath/pet.css'

/** One sprite cell as (row, col) in the 15-row atlas. */
type Frame = readonly [row: number, col: number]

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
} as const satisfies Record<string, readonly Frame[]>

type PetAnimation = keyof typeof FRAMES

/** First cell of the atlas, the fallback for an out-of-range frame index. */
const IDLE_FRAME: Frame = [0, 0]

/** Left-click reactions: a random little animation + bubble line. */
interface Reaction {
  readonly anim: PetAnimation
  readonly text: string
}

const REACTIONS: readonly Reaction[] = [
  { anim: 'waving', text: '嗨~ 我在呢！' },
  { anim: 'jumping', text: '嘿嘿，怎么啦~' },
  { anim: 'chatting', text: '抱抱你~' },
  { anim: 'waving', text: '有什么我可以帮忙的吗？' },
]

const FALLBACK_REACTION: Reaction = { anim: 'waving', text: '嗨~ 我在呢！' }

const GREETING = '你好呀，我是爱弥斯~'
/** Animations the idle timer and the menu pick between. */
const IDLE_PICKS: readonly PetAnimation[] = ['waving', 'jumping', 'chatting']

/** Random entry of a non-empty list (the fallback covers out-of-range rolls). */
function pickOne<T>(list: readonly T[], fallback: T): T {
  return list[Math.floor(Math.random() * list.length)] ?? fallback
}

/** Narrow a status payload's animation name to a known atlas row. */
function toAnimation(value: unknown): PetAnimation {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(FRAMES, value)
    ? (value as PetAnimation)
    : 'idle'
}

interface Bubble {
  readonly text: string
  readonly persistent: boolean
}

// Pet visibility lives in the dsh-aemeath settings scope (petEnabled, host
// schema). The settings service is a soft dependency: the bridge below is
// filled by the mount-time inject, and while it is absent the pet falls back
// to the legacy localStorage hidden flag.
const scopeBox: { current: AemeathSettingsScope | null } = { current: null }

function usePetSetting(): SettingsScopeSnapshot<AemeathSettings> | null {
  // Wake up when the settings scope arrives after this component mounted
  // (it may register later than the first render).
  const [, bump] = useState(0)
  useEffect(() => {
    if (scopeBox.current !== null) return
    let attempts = 0
    const timer = setInterval(() => {
      if (scopeBox.current !== null) {
        clearInterval(timer)
        bump((value) => value + 1)
        return
      }
      attempts += 1
      if (attempts >= 100) clearInterval(timer) // no settings host: stop quietly
    }, 200)
    return () => clearInterval(timer)
  }, [])
  const source = scopeBox.current
  const useScope = source === null ? null : bindSnapshotSelector(source)
  return useScope === null ? null : useScope((snapshot) => snapshot)
}

export function mount(ctx: Context): void {
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
  const bindScope = (binder: SettingsScopeBinder | undefined): void => {
    if (binder && typeof binder.bind === 'function') {
      scopeBox.current = binder.bind<AemeathSettings>({ namespace: 'dsh-aemeath' })
    }
  }
  // `get` is the injection-free accessor: reading this fiber's `settingsScope`
  // property directly throws in cordis ("cannot get property … without
  // inject"), because the entry declares only `slots`. The property stays as
  // the fallback, evaluated only when `get` had no answer.
  bindScope((ctx.get('settingsScope') as SettingsScopeBinder | undefined) || ctx.settingsScope)
  ctx.inject(['settingsScope'], (sctx) => {
    bindScope(sctx.settingsScope)
  })

  // ---- localStorage helpers ----
  function readLS(key: string, fallback: string): string {
    try {
      const value = window.localStorage.getItem('dsh-aemeath.' + key)
      return value === null ? fallback : value
    } catch (_) { return fallback }
  }
  function writeLS(key: string, value: string): void {
    try { window.localStorage.setItem('dsh-aemeath.' + key, value) } catch (_) { /* storage unavailable */ }
  }

  // ---- shared drag / position state ----
  interface Position { right: number; bottom: number }

  function readPos(): Position {
    let parsed: unknown = null
    try { parsed = JSON.parse(readLS('pos', 'null')) } catch (_) { parsed = null }
    const saved = typeof parsed === 'object' && parsed !== null ? parsed as { right?: unknown; bottom?: unknown } : {}
    return {
      right: typeof saved.right === 'number' && Number.isFinite(saved.right) ? saved.right : 28,
      bottom: typeof saved.bottom === 'number' && Number.isFinite(saved.bottom) ? saved.bottom : 28,
    }
  }
  const posState = readPos()
  function persistPos(): void {
    writeLS('pos', JSON.stringify({ right: posState.right, bottom: posState.bottom }))
  }

  // Stable drag state — must live outside Pet so the mount-once window
  // listeners and the re-attached onPointerDown share the SAME object.
  interface DragState {
    active: boolean
    moved: boolean
    sx: number
    sy: number
    sr: number
    sb: number
  }
  const drag: DragState = { active: false, moved: false, sx: 0, sy: 0, sr: 0, sb: 0 }

  let overrideUntil = 0
  function playTemp(animation: PetAnimation, ms: number): void {
    overrideUntil = Date.now() + ms
    if (window.__aemSetAnim) window.__aemSetAnim(animation)
  }

  // ---- pet component ----
  function Pet(): ReactElement | null {
    // petEnabled (settings) is the source of truth once ready; until then
    // the legacy localStorage hidden flag below governs.
    const settingSnap = usePetSetting()
    const settingValue = settingSnap !== null && settingSnap.status === 'ready' ? settingSnap.value : undefined
    const settingReady = settingValue !== undefined
    const settingVisible = settingValue === undefined ? true : settingValue.petEnabled !== false
    const [hidden, setHidden] = useState(() => readLS('hidden', '0') === '1')
    const [anim, setAnim] = useState<PetAnimation>('idle')
    const [frame, setFrame] = useState(0)
    const [bubble, setBubble] = useState<Bubble>({ text: GREETING, persistent: false })
    const [menuOpen, setMenuOpen] = useState(false)
    const [dragging, setDragging] = useState(false)

    window.__aemSetAnim = setAnim

    function onReact(): void {
      const reaction = pickOne(REACTIONS, FALLBACK_REACTION)
      setMenuOpen(false)
      overrideUntil = Date.now() + 2300
      setAnim(reaction.anim)
      setBubble({ text: reaction.text, persistent: false })
    }

    // Hide: persist via the settings scope when available (keeps the
    // theme-page switch in sync), else fall back to the legacy flag.
    function hidePet(): void {
      if (settingReady && scopeBox.current !== null) {
        void scopeBox.current.set('petEnabled', false).catch(() => { /* the switch will show the failure */ })
      } else {
        setHidden(true)
        writeLS('hidden', '1')
      }
    }

    // frame ticker
    useEffect(() => {
      const frames = FRAMES[anim]
      setFrame(0)
      const timer = setInterval(() => setFrame((value) => (value + 1) % frames.length), 180)
      return () => clearInterval(timer)
    }, [anim])

    // status poll
    useEffect(() => {
      let alive = true
      const tick = async (): Promise<void> => {
        try {
          const response = await fetch('/dsh-aemeath/status')
          if (!alive || !response.ok) return
          const data = await response.json() as { core?: unknown; bubble?: unknown; animation?: unknown }
          const core = String(data.core || 'idle')
          const text = String(data.bubble || '')
          if (Date.now() >= overrideUntil) setAnim(toAnimation(data.animation))
          if (text) {
            setBubble({ text, persistent: core === 'running' || core === 'chatting' || core === 'waiting' })
          } else if (core !== 'running' && core !== 'chatting' && core !== 'waiting') {
            setBubble((current) => (current.text ? { text: '', persistent: false } : current))
          }
        } catch (_) { /* the host may not be up yet */ }
      }
      void tick()
      const timer = setInterval(() => { void tick() }, 900)
      return () => { alive = false; clearInterval(timer) }
    }, [])

    // non-persistent bubble auto-hide
    useEffect(() => {
      if (bubble.persistent || !bubble.text) return
      const timer = setTimeout(() => setBubble({ text: '', persistent: false }), 4200)
      return () => clearTimeout(timer)
    }, [bubble])

    // idle random animations
    useEffect(() => {
      if (anim !== 'idle') return
      const timer = setTimeout(() => {
        overrideUntil = Date.now() + 2300
        setAnim(pickOne(IDLE_PICKS, 'idle'))
        setTimeout(() => { if (Date.now() >= overrideUntil) setAnim('idle') }, 2200)
      }, 12000 + Math.random() * 26000)
      return () => clearTimeout(timer)
    }, [anim])

    // drag + click (drag object is defined in mount scope, not here)
    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
      if (event.button !== 0) return
      drag.active = true
      drag.moved = false
      drag.sx = event.clientX
      drag.sy = event.clientY
      drag.sr = posState.right
      drag.sb = posState.bottom
    }
    const onContextMenu = (event: ReactMouseEvent<HTMLDivElement>): void => {
      event.preventDefault()
      setMenuOpen((open) => !open)
    }
    useEffect(() => {
      const move = (event: PointerEvent): void => {
        if (!drag.active) return
        const dx = event.clientX - drag.sx
        const dy = event.clientY - drag.sy
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true
        if (!drag.moved) return
        setDragging(true)
        posState.right = Math.max(4, Math.round(drag.sr - dx))
        posState.bottom = Math.max(4, Math.round(drag.sb - dy))
        setMenuOpen(false)
      }
      const up = (): void => {
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
      return (
        <div className="aem-pet" style={{ right: posState.right, bottom: posState.bottom }}>
          <button
            className="aem-pet-summon"
            title="召唤爱弥斯"
            onClick={() => { setHidden(false); writeLS('hidden', '0') }}
          >
            🪄
          </button>
        </div>
      )
    }

    const frames = FRAMES[anim]
    const cell = frames[frame % frames.length] ?? IDLE_FRAME
    const spriteStyle = { backgroundPosition: '-' + (cell[1] * 160) + 'px -' + (cell[0] * 173.33).toFixed(1) + 'px' }

    return (
      <div className="aem-pet" style={{ right: posState.right, bottom: posState.bottom }}>
        {bubble.text ? <div className="aem-pet-bubble">{bubble.text}</div> : null}
        {menuOpen ? (
          <div className="aem-pet-menu">
            <button onClick={() => { setMenuOpen(false); playTemp(pickOne(IDLE_PICKS, 'waving'), 2300) }}>
              🐾 换个表情
            </button>
            <button onClick={() => { setMenuOpen(false); setBubble({ text: '你好呀，我是爱弥斯~ 一起加油吧！', persistent: false }) }}>
              💬 打招呼
            </button>
            <button onClick={() => { setMenuOpen(false); hidePet() }}>✕ 隐藏桌宠</button>
          </div>
        ) : null}
        <div
          className={'aem-pet-sprite' + (dragging ? ' aem-dragging' : '')}
          style={spriteStyle}
          onPointerDown={onPointerDown}
          onContextMenu={onContextMenu}
        />
      </div>
    )
  }

  // ---- register pet in the frame-wide overlay slot ----
  // The plugin entry declares inject: ['slots'], so `slots` is live here; the
  // guard stays as a soft fallback for hosts without a slot system.
  const slots = ctx.slots
  if (slots) {
    slots.inject('shell.overlay', () => {
      slots.register({ name: 'shell.overlay', id: 'dsh-aemeath-pet', order: 10, label: '爱弥斯桌宠' }, Pet)
    })
  } else {
    console.warn('[dsh-aemeath] slots service unavailable — desktop pet disabled (skin CSS still applied)')
  }
}
