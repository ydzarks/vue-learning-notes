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

  // 互相关联，这样能够获取到对方并作进一步处理
  effects.add(activeEffectFn)
  activeEffectFn.deps.push(effects)
}

function trigger(target: any, key: ValueKey) {
  const depsMap = Bucket.get(target)
  if (!depsMap) {
    return false
  }

  const effects = depsMap.get(key)

  // 解决cleanup带来的循环触发死循环
  const effectsToRun = new Set<EffectFn>()

  effects && effects.forEach((effectFn) => {
    // 解决递归循环 副作用函数内部再次修改内容
    if (effectFn !== activeEffectFn) {
      effectsToRun.add(effectFn)
    }
  })

  effectsToRun.forEach((effectFn) => {
    const scheduler = effectFn.options.scheduler
    if (scheduler) {
      scheduler(effectFn)
    }
    else {
      effectFn()
    }
  })
}
