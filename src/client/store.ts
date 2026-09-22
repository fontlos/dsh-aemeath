import { useSyncExternalStore } from 'react'

/** Minimal observable shape the dsh client services expose. */
export interface SnapshotSource<T> {
  subscribe(listener: () => void): () => void
  getSnapshot(): T
}

/** Selector hook produced for one source: `use(select?)`. */
export type SnapshotSelector<T> = <R = T>(select?: (snapshot: T) => R) => R

const cache = new WeakMap<object, SnapshotSelector<never>>()

/**
 * Turn a `{ subscribe, getSnapshot }` store into a selector hook. The hook is
 * cached per source, so `useSyncExternalStore` keeps one subscription per
 * component across re-renders (mirrors the official renderer's observable hook).
 */
export function bindSnapshotSelector<T>(source: SnapshotSource<T>): SnapshotSelector<T> {
  const cached = cache.get(source)
  if (cached !== undefined) return cached as unknown as SnapshotSelector<T>

  const subscribe = (listener: () => void): (() => void) => source.subscribe(listener)
  const getSnapshot = (): T => source.getSnapshot()
  const hook = <R = T>(select?: (snapshot: T) => R): R => {
    const value = useSyncExternalStore(subscribe, getSnapshot)
    return (select === undefined ? value : select(value)) as R
  }

  cache.set(source, hook as unknown as SnapshotSelector<never>)
  return hook
}
