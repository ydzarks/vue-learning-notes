import { Bucket, activeEffectFn } from './effect'

export function createReactive(data: any) {
  return new Proxy(data, {
    get(target, key, receiver) {
      track(target, key)
      return Reflect.get(target, key, receiver)
    },
    set(target, key, receiver) {
      const result = Reflect.set(target, key, receiver)
      trigger(target, key)
      return result
    },
  })
}

/**
 * 依赖收集
 * @param target
 * @param key
 */
function track(target: any, key: string | symbol) {
  if (activeEffectFn) {
    let depMap = Bucket.get(target)
    if (!depMap) {
      Bucket.set(target, (depMap = new Map<string | symbol, Set<Function>>()))
    }
    let effects = depMap.get(key)
    if (!effects) {
      depMap.set(key, (effects = new Set<Function>()))
    }
    effects.add(activeEffectFn)
    activeEffectFn.deps.push(effects)
  }
}

/**
 * 响应
 * @param target
 * @param key
 */
function trigger(target: any, key: string | symbol) {
  let depMap = Bucket.get(target)
  if (!depMap) {
    Bucket.set(target, (depMap = new Map<string | symbol, Set<Function>>()))
  }
  let effects = depMap.get(key)
  if (!effects) {
    depMap.set(key, (effects = new Set<Function>()))
  }
  const effectsToRun = new Set<Function>()

  effects && effects.forEach((effectFn) => {
    effectsToRun.add(effectFn)
  })

  effectsToRun.forEach((fn) => {
    fn()
  })
}
