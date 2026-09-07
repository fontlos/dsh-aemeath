// bindSnapshotSelector: turns any { subscribe, getSnapshot } store into a
// useSyncExternalStore selector hook. Per-source identity cache — the
// subscribe/getSnapshot closures are captured once per source so
// useSyncExternalStore never resubscribes (mirrors the official renderer's
// observableHook).

import React from 'react'

const cache = new WeakMap()

export function bindSnapshotSelector(source) {
  let hook = cache.get(source)
  if (hook === undefined) {
    const subscribe = (fn) => source.subscribe(fn)
    const getSnapshot = () => source.getSnapshot()
    hook = function useSelector(sel) {
      const value = React.useSyncExternalStore(subscribe, getSnapshot)
      return sel ? sel(value) : value
    }
    cache.set(source, hook)
  }
  return hook
}
