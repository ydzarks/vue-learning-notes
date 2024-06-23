import { createEffect } from './effect'

export declare interface WatchOptions { immediate: boolean, flush?: 'post' | 'sync' }
export declare type WatchCallBack = (nVal: any, oVal: any, onInvalidate: (fn: Function) => void) => void

export function watch(source: any, cb: WatchCallBack, options: WatchOptions = { immediate: false, flush: 'sync' }) {
  let getter: Function
  if (typeof source === 'function') {
    getter = source
  }
  else {
    getter = () => traverse(source)
  }

  let oldValue: any, newValue: any

  // 用来存储用户注册的过期回调
  let cleanup: Function
  function onInvalidate(fn: Function) {
    cleanup = fn
  }

  const job = (effectFn) => {
    newValue = effectFn()
    if (cleanup) {
      cleanup()
    }
    cb(newValue, oldValue, onInvalidate)
    oldValue = newValue
  }

  const effectFn = createEffect(() => getter(), {
    lazy: true,
    scheduler: () => {
      if (options.flush === 'post') {
        // post时塞入微队列,确保dom更新结束后再执行
        queueMicrotask(() => { job(effectFn) })
      }
      else {
        job(effectFn)
      }
    },
  })

  if (options.immediate) {
    job(effectFn)
  }
  else {
    oldValue = effectFn()
  }
}

function traverse(value, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value))
    return
  seen.add(value)
  for (const k in value) {
    traverse(value[k], seen)
  }
  return value
}
