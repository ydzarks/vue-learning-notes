import type { EffectFn, ValueKey } from './effect'
import { Bucket, activeEffectFn } from './effect'

export function createReactive(data: any) {
  return new Proxy(data, {
    get(target, key, receiver) {
      track(target, key)
      return Reflect.get(target, key, receiver)
    },
    set(target, key, newValue, receiver) {
      const result = Reflect.set(target, key, newValue, receiver)
      trigger(target, key)
      return result
    },
  })
}

function track(target: any, key: ValueKey) {
  if (!activeEffectFn)
    return
  let depsMap = Bucket.get(target)
  if (!depsMap) {
    // 不存在目标依赖集合的情况时，初始化
    Bucket.set(target, (depsMap = new Map<ValueKey, Set<EffectFn>>()))
  }
  let effects = depsMap.get(key)
  if (!effects) {
    depsMap.set(key, (effects = new Set<EffectFn>()))
  }
  effects.add(activeEffectFn)
}

function trigger(target: any, key: ValueKey) {
  const depsMap = Bucket.get(target)
  if (!depsMap) {
    return false
  }

  const effects = depsMap.get(key)

  effects && effects.forEach((effectFn) => {
    effectFn()
  })
}
