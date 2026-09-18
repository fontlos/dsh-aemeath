/**
 * Max-tier effect data: the registered animation styles plus the particle
 * constants and reveal-arming state shared by the slider control and the
 * settings page.
 */

/** Registered max-tier animation styles, in display order (first = default). */
export type EffectStyleId = 'starlight' | 'spray-flow'

export interface EffectStyle {
  readonly id: EffectStyleId
  readonly titleKey: string
}

export const EFFECT_STYLES = [
  { id: 'starlight', titleKey: 'style.starlight' },
  { id: 'spray-flow', titleKey: 'style.sprayFlow' },
] as const satisfies readonly EffectStyle[]

export const DEFAULT_STYLE: EffectStyleId = 'starlight'

/** Resolve any persisted style id to a registered one. */
export function resolveStyle(id: string | undefined): EffectStyleId {
  return EFFECT_STYLES.some((style) => style.id === id) ? (id as EffectStyleId) : DEFAULT_STYLE
}

/**
 * Reveal arming for the starlight entry animation: armed only by a real switch
 * INTO MAX while the panel is open, disarmed when the panel closes. Keyed by
 * session so sessions never affect each other; module scope survives remounts.
 */
export const starlightRevealArmed = new Map<string, true>()

export interface MatrixCell {
  readonly col: number
  readonly row: number
  readonly color: string
}

const MATRIX_COLS = 64
const MATRIX_ROWS = 6

/**
 * "璀璨星光" dot-matrix texture: a dense grid of small cells that follow the
 * bar's white→purple gradient slightly deepened (×0.88), so the matrix reads as
 * a fine low-res texture. Row-major order matches the CSS grid fill.
 */
export const MATRIX: readonly MatrixCell[] = (() => {
  const cells: MatrixCell[] = []
  const from: readonly [number, number, number] = [255, 255, 255]
  const to: readonly [number, number, number] = [168, 85, 247]
  for (let row = 0; row < MATRIX_ROWS; row += 1) {
    for (let col = 0; col < MATRIX_COLS; col += 1) {
      const t = col / (MATRIX_COLS - 1)
      const r = Math.round((from[0] + (to[0] - from[0]) * t) * 0.88)
      const g = Math.round((from[1] + (to[1] - from[1]) * t) * 0.88)
      const b = Math.round((from[2] + (to[2] - from[2]) * t) * 0.88)
      cells.push({ col, row, color: `rgb(${r},${g},${b})` })
    }
  }
  return cells
})()

export interface Spark {
  readonly y: number
  readonly from: number
  readonly to: number
  readonly dur: number
  readonly delay: number
}

/** Ejected sparks: cell-sized white squares running right → left over the texture. */
export const RUNNERS: readonly Spark[] = (() => {
  const list: Spark[] = []
  for (let k = 0; k < 100; k += 1) {
    list.push({
      y: 10 + Math.random() * 80,
      from: 88 + Math.random() * 10,
      to: 24 + Math.random() * 14,
      dur: 1.1 + Math.random() * 0.9,
      delay: Math.random() * 1.2,
    })
  }
  return list
})()

export interface SprayParticle {
  readonly x: number
  readonly y: number
  readonly dist: number
  readonly dur: number
  readonly delay: number
  readonly launch: number
  readonly s: number
  readonly tl: number
  readonly pk: number
}

/**
 * Rocket-exhaust spray ("喷射流光"): dense near the nozzle, reaching further
 * left per tier. `launch` is the ignition delay, so entering MAX fires the
 * short-range nozzle particles first and fans the plume outward.
 */
export const SPRAY: readonly SprayParticle[] = (() => {
  const list: SprayParticle[] = []
  const push = (
    count: number,
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    d0: number,
    d1: number,
    du0: number,
    du1: number,
    s0: number,
    s1: number,
    tl: number,
    p0: number,
    p1: number,
    l0: number,
    l1: number,
  ): void => {
    for (let k = 0; k < count; k += 1) {
      list.push({
        x: x0 + Math.random() * (x1 - x0),
        y: y0 + Math.random() * (y1 - y0),
        dist: -(d0 + Math.random() * (d1 - d0)),
        dur: du0 + Math.random() * (du1 - du0),
        delay: Math.random() * 2.3,
        launch: l0 + Math.random() * (l1 - l0),
        s: s0 + Math.random() * (s1 - s0),
        tl,
        pk: p0 + Math.random() * (p1 - p0),
      })
    }
  }
  push(18, 92, 100, 22, 78, 40, 80, 1.0, 1.5, 3, 4.5, 3.2, 0.8, 1, 0, 0.08)
  push(18, 93, 99, 28, 72, 80, 120, 1.4, 1.9, 2.5, 3.5, 2.6, 0.7, 0.9, 0.06, 0.22)
  push(20, 95, 100, 33, 67, 140, 180, 1.9, 2.4, 2, 3, 2.2, 0.6, 0.8, 0.22, 0.45)
  push(17, 97, 100, 40, 60, 190, 230, 2.4, 2.8, 2, 2.5, 2, 0.5, 0.7, 0.45, 0.7)
  return list
})()
