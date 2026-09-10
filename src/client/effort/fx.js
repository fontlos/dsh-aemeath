// Effort FX data: max-tier effect styles, particle constants and the reveal
// arming state shared by the slider control and the settings page.

/** Registered max-tier animation styles, in display order (first = default). */
const EFFECT_STYLES = [
  { id: 'starlight', titleKey: 'style.starlight' },
  { id: 'spray-flow', titleKey: 'style.sprayFlow' },
]
const DEFAULT_STYLE = 'starlight'

/** Renamed styles: persisted values from older versions keep resolving. */
const LEGACY_STYLE_IDS = { undertow: 'starlight' }

/** Resolve any persisted style id (legacy ids included) to a registered one. */
function resolveStyle(id) {
  const mapped = LEGACY_STYLE_IDS[id] || id
  return EFFECT_STYLES.some((s) => s.id === mapped) ? mapped : DEFAULT_STYLE
}

// Event-driven reveal arming for the starlight entry animation. The marker
// lives only while the effort panel is open: it is armed in commitEffort when
// the user really switches a tier INTO MAX (drag, click or keyboard), and
// disarmed as soon as the panel closes (effortOpen -> false). Reopening the
// panel never replays the entry animation because no commit happens on a plain
// reopen; reopening is not a tier change. Keyed by session so sessions never
// affect each other; survives component remounts by living at module scope.
const starlightRevealArmed = new Map()

// "璀璨星光" (starlight) dot-matrix texture + ejected sparks: a dense grid of
// small rounded rects shown only on the MAX tier. The bar's background is a
// horizontal gradient (purple right → white left) and every cell takes the same
// gradient slightly deepened, so the matrix reads as a fine low-res texture.
// Small square sparks are ejected from the right edge and run left across the
// texture, fading out — a continuous right→left spray with no wave cycling.
const MATRIX_COLS = 64
const MATRIX_ROWS = 6
const MATRIX = (function () {
  const cells = []
  // Cells take the background gradient slightly deepened (×0.88) so the texture
  // stays visible. Row-major order matches the CSS grid fill, keeping the
  // gradient horizontal (left white → right purple).
  const bgFrom = [255, 255, 255]
  const bgTo = [168, 85, 247]
  for (let row = 0; row < MATRIX_ROWS; row++) {
    for (let c = 0; c < MATRIX_COLS; c++) {
      const t = MATRIX_COLS === 1 ? 0 : c / (MATRIX_COLS - 1)
      const r = Math.round((bgFrom[0] + (bgTo[0] - bgFrom[0]) * t) * 0.88)
      const g = Math.round((bgFrom[1] + (bgTo[1] - bgFrom[1]) * t) * 0.88)
      const b = Math.round((bgFrom[2] + (bgTo[2] - bgFrom[2]) * t) * 0.88)
      cells.push({ col: c, row, color: 'rgb(' + r + ',' + g + ',' + b + ')' })
    }
  }
  return cells
})()

// Ejected sparks: cell-sized white squares that spawn near the right edge and
// run left, each with its own height, speed, delay and random fade-out point.
const RUNNERS = (function () {
  const list = []
  for (let k = 0; k < 100; k++) {
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

// Rocket-exhaust spray ("喷射流光"): dense near the nozzle, longer reach
// leftwards per tier.
const SPRAY = (function () {
  const list = []
  // launch = ignition delay in seconds. Entering MAX restarts every particle's
  // ignite animation, so short-range nozzle particles fire first and the plume
  // fans outward ("starting to spray").
  const push = function (n, x0, x1, y0, y1, d0, d1, du0, du1, s0, s1, tl, p0, p1, l0, l1) {
    for (let k = 0; k < n; k++) {
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

export { EFFECT_STYLES, DEFAULT_STYLE, resolveStyle, starlightRevealArmed, MATRIX, RUNNERS, SPRAY }
