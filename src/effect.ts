/**
 * @description 使用WeakMap是因为WeakMap对Key是弱引用，不会影响垃圾回收
 */
export const Bucket = new WeakMap<any, Map<string | symbol, Set<Function>>>()
// eslint-disable-next-line import/no-mutable-exports
export let activeEffectFn: EffectFunction | undefined

export declare type EffectFunction = Function & { deps: Set<Function>[] }

/**
 * 创建副作用函数
 * @param fn
 */
export function createEffect(fn: Function) {
  const effectFn = () => {
    // 调用之前先清除之前的联系
    cleanUp(activeEffectFn)
    activeEffectFn = effectFn
    fn()
  }

  // 解决条件分支情况下不必要的响应执行
  effectFn.deps = []

  effectFn()

  return effectFn
}

function cleanUp(effectFn: EffectFunction | undefined) {
  if (!effectFn)
    return
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i]
    deps.delete(effectFn)
  }
  effectFn.deps.length = 0
}
