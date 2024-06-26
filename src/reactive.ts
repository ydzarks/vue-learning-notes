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
const ARRAY_LENGTH = 'length'

// 这个的存储一方面是为了解决isReadonly每次读取时都会生成新的对象
// 另外是否也是为了性能的考虑
const REACTIVE_MAP = new Map()

let shouldTrack = true
const arrayInstrumentations = {}
;['includes', 'indexOf', 'lastIndexOf'].forEach((method) => {
  const originMethod = Array.prototype[method]
  arrayInstrumentations[method] = function (...args) {
    let res = originMethod.apply(this, args)
    if (res === false || res === -1) {
      res = originMethod.apply(this[RAW], args)
    }
    return res
  }
})
;['push', 'pop', 'shift', 'unshift', 'splice'].forEach((method) => {
  const originMethod = Array.prototype[method]
  arrayInstrumentations[method] = function (...args) {
    shouldTrack = false
    const res = originMethod.apply(this, args)
    shouldTrack = true
    return res
  }
})

export function reactive(data: any) {
  const existionProxy = REACTIVE_MAP.get(data)
  if (existionProxy)
    return existionProxy
  const proxy = createReactive(data, false, false)
  REACTIVE_MAP.set(data, proxy)
  return proxy
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

      const type = Array.isArray(target)
        ? Number(key) < Reflect.get(target, ARRAY_LENGTH) ? TriggerType.SET : TriggerType.ADD
        : hasOwn(target, key) ? TriggerType.SET : TriggerType.ADD

      const result = Reflect.set(target, key, newValue, receiver)

      // 利用约定的RAW判断当前设置的是否是原始属性
      if (target === receiver[RAW]) {
        // eslint-disable-next-line no-self-compare
        if (oldValue !== newValue && (oldValue === oldValue || newValue === newValue)) {
          trigger(target, key, type, newValue)
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

      if (Array.isArray(target) && Object.prototype.hasOwnProperty.call(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver)
      }

      if (!isReadonly && typeof key !== 'symbol') {
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
      track(target, Array.isArray(target) ? ARRAY_LENGTH : ITERATE_KEY)
      return Reflect.ownKeys(target)
    },

  })
}

function track(target: any, key: ValueKey) {
  if (!activeEffectFn || !shouldTrack)
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

function trigger(target: any, key: ValueKey, type: TriggerType, newValue?: any) {
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

  // 确保数组的正确触发
  if (TriggerType.ADD === type && Array.isArray(target)) {
    const lengthEffects = depsMap.get(ARRAY_LENGTH)
    lengthEffects && lengthEffects.forEach((effectFn) => {
      if (effectFn !== activeEffectFn) {
        effectsToRun.add(effectFn)
      }
    })
  }

  if (Array.isArray(target) && key === ARRAY_LENGTH) {
    depsMap.forEach((effects, key) => {
      if ((key as unknown as number) >= newValue as unknown as number) {
        effects.forEach((effectFn) => {
          if (effectFn !== activeEffectFn) {
            effectsToRun.add(effectFn)
          }
        })
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
