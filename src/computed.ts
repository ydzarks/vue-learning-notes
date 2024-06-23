import { createEffect } from './effect'

export function computed(getter: Function) {
  let cache
  let dirty = true

  const effectFn = createEffect(getter, {
    lazy: true,
    scheduler: () => {
      dirty = true
    },
  })

  const obj = {
    get value() {
      if (dirty) {
        cache = effectFn()
        dirty = false
      }
      return cache
    },
  }

  return obj
}
