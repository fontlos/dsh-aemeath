/**
 * Static visual primitives for the effort control: the trigger chevron glyph,
 * easing curves and the RAF-driven chevron rotation (immune to CSS transition
 * gaps from node rebuilds or stylesheet reloads). JSX here compiles to the
 * seeded `react` instance through the build's JSX alias.
 */

/** Same glyph as the shipped IconChevronDownOutline14. */
export const CHEVRON_ICON = (
  <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z"
      fill="currentColor"
    />
  </svg>
)

/** Same glyph as the shipped IconCheckOutline14 (the selected-model mark). */
export const CHECK_ICON = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block' }}
  >
    <path
      d="M11.5635 4.58984L7.61426 9.07715C7.35154 9.37561 7.11346 9.64812 6.89453 9.84668C6.66593 10.054 6.38519 10.2506 6.01465 10.3164C5.82079 10.3508 5.62207 10.3529 5.42773 10.3213C5.0561 10.2609 4.77266 10.0674 4.54102 9.86328C4.31926 9.66791 4.07752 9.39911 3.81055 9.10449L2.44531 7.59863L3.55664 6.59082L4.92188 8.09766C5.21256 8.41844 5.38878 8.61191 5.53223 8.73828C5.61022 8.80699 5.65253 8.83192 5.66895 8.83984C5.69648 8.84429 5.72449 8.84467 5.75195 8.83984C5.72657 8.84451 5.75564 8.85422 5.88672 8.73535C6.02833 8.60692 6.20225 8.41088 6.48828 8.08594L10.4385 3.59961L11.5635 4.58984Z"
      fill="currentColor"
    />
  </svg>
)

/**
 * Slider handle glyph: one horizontal double arrow, i.e. "drag either way".
 * Drawn on a 12-unit grid so its 1.5 stroke still reads at `.aem-thumbIcon`'s
 * size; the three subpaths are the shaft and the two heads, nothing crossing.
 */
export const ARROWS_HORIZONTAL_ICON = (
  <svg className="aem-thumbIcon" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M1.5 6h9M4.25 3.25 1.5 6l2.75 2.75M7.75 3.25 10.5 6l-2.75 2.75"
      stroke="#71717a"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const easeOutCubic = (p: number): number => {
  const q = 1 - p
  return 1 - q * q * q
}

export const easeOutQuad = (p: number): number => {
  const q = 1 - p
  return 1 - q * q
}

export interface ChevronAnimator {
  readonly state: { raf: number | null; deg: number }
  animate(element: HTMLElement | null, open: boolean): void
}

/** Rotate between 0° and 180° on its own animation frame loop. */
export function createChevronAnimator(): ChevronAnimator {
  const state: { raf: number | null; deg: number } = { raf: null, deg: 0 }
  return {
    state,
    animate(element, open) {
      if (element === null) return
      const target = open ? 180 : 0
      if (state.raf !== null) {
        cancelAnimationFrame(state.raf)
        state.raf = null
      }
      const from = state.deg
      if (Math.abs(from - target) < 0.5) {
        state.deg = target
        element.style.transform = `rotate(${target}deg)`
        return
      }
      const duration = 200
      const start = performance.now ? performance.now() : Date.now()
      const step = (now: number): void => {
        const progress = Math.min(1, (now - start) / duration)
        const eased = 1 - (1 - progress) ** 3
        state.deg = from + (target - from) * eased
        element.style.transform = `rotate(${state.deg}deg)`
        state.raf = progress < 1 ? requestAnimationFrame(step) : null
      }
      state.raf = requestAnimationFrame(step)
    },
  }
}
