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
