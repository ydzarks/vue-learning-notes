export declare type ValueKey = string | symbol
export declare type EffectFn = Function

// 记录所有的响应对象的集合，使用WeakMap是为了不影响垃圾回收
export const Bucket = new WeakMap<any, Map<ValueKey, Set<EffectFn>>>()

// eslint-disable-next-line import/no-mutable-exports
export let activeEffectFn: EffectFn

export function createEffect(fn: Function): EffectFn {
  const effectFn = () => {
    activeEffectFn = effectFn
    fn()
  }

  effectFn()

  return effectFn
}
