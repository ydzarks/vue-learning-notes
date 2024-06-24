import type { EffectFn, ValueKey } from './effect'
import { Bucket, activeEffectFn } from './effect'
import { hasOwn } from './utils'

enum TriggerType {
  ADD = 'ADD',
  SET = 'SET',
  DELETE = 'DELETE',
}
const ITERATE_KEY = Symbol('effectKey')
const RAW = Symbol('raw')

export function reactive(data: any) {
  return createReactive(data, false, false)
}

export function shallowReactive(data: any) {
  return createReactive(data, true, false)
}

export function readonly(data: any) {
  return createReactive(data, false, true)
}

export function shallowReadonly(data: any) {
  return createReactive(data, true, true)
}

export function createReactive(data: any, isShallow = false, isReadonly = false) {
  return new Proxy(data, {
    set(target, key, newValue, receiver) {
      if (isReadonly) {
        console.warn(`属性${String(key)}是只读的`)
        return true
      }

      const oldValue = Reflect.get(target, key)
      const type = hasOwn(target, key) ? TriggerType.SET : TriggerType.ADD
      const result = Reflect.set(target, key, newValue, receiver)

      // 利用约定的RAW判断当前设置的是否是原始属性
      if (target === receiver[RAW]) {
        // eslint-disable-next-line no-self-compare
        if (oldValue !== newValue && (oldValue === oldValue || newValue === newValue)) {
          trigger(target, key, type)
        }
      }

      return result
    },
    // delete操作符识别
    deleteProperty(target, property) {
      if (isReadonly) {
        console.warn(`属性${String(property)}是只读的`)
        return true
      }

      // 要删除的属性是否存在
      const hadKey = hasOwn(target, property)
      const res = Reflect.deleteProperty(target, property)

      // 只有成功删除自己的属性才触发更新
      if (res && hadKey) {
        trigger(target, property, TriggerType.DELETE)
      }

      return res
    },

    get(target, key, receiver) {
      // 约定一个特殊的RAW Symbol属性来访问原始数据
      if (key === RAW) {
        return target
      }

      if (!isReadonly) {
        track(target, key)
      }

      const result = Reflect.get(target, key, receiver)

      if (isShallow) {
        return result
      }

      if (typeof result === 'object' && result !== null) {
        return isReadonly ? readonly(result) : reactive(result)
      }

      return result
    },
    // 对象in操作符识别，基于ECMA-262规范13.10.1节，in操作符的运算结果是基于HasProperty抽象方法获得
    has(target, key) {
      track(target, key)
      return Reflect.has(target, key)
    },
    // for...in操作符识别
    ownKeys(target) {
      track(target, ITERATE_KEY)
      return Reflect.ownKeys(target)
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

function trigger(target: any, key: ValueKey, type: TriggerType) {
  const depsMap = Bucket.get(target)
  if (!depsMap) {
    return false
  }

  // 与target中属性key相关连的副作用函数
  const effects = depsMap.get(key)

  // 解决cleanup带来的循环触发死循环
  const effectsToRun = new Set<EffectFn>()

  effects && effects.forEach((effectFn) => {
    // 解决递归循环 副作用函数内部再次修改内容
    if (effectFn !== activeEffectFn) {
      effectsToRun.add(effectFn)
    }
  })

  if (TriggerType.ADD === type || TriggerType.DELETE === type) {
    // 与ITERATE_KEY相关连的副作用函数
    const iterateEffects = depsMap.get(ITERATE_KEY)
    iterateEffects && iterateEffects.forEach((effectFn) => {
      if (effectFn !== activeEffectFn) {
        effectsToRun.add(effectFn)
      }
    })
  }

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
