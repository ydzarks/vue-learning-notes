export declare type ValueKey = string | symbol
export declare type EffectFn = Function & { deps: Set<EffectFn>[] }

// 记录所有的响应对象的集合，使用WeakMap是为了不影响垃圾回收
// 最后一层使用Set是为了防止重复收集，因为每次get都会触发收集行为
export const Bucket = new WeakMap<any, Map<ValueKey, Set<EffectFn>>>()

// eslint-disable-next-line import/no-mutable-exports
export let activeEffectFn: EffectFn | undefined // 利用全局变量记录当前被注册的副作用函数
// 注册的副作用函数堆栈，解决嵌套副作用函数时的不必要触发
const effectFnStack: EffectFn[] = []

export function createEffect(fn: Function): EffectFn {
  const effectFn: EffectFn = () => {
    cleanUp(effectFn)
    activeEffectFn = effectFn
    effectFnStack.push(effectFn)
    fn()
    effectFnStack.pop()
    activeEffectFn = effectFnStack.at(-1)
  }

  // 用于记录使用了该副作用函数的所有响应式对象属性
  effectFn.deps = []
  effectFn()

  return effectFn
}

// 利用清理函数解决条件分支不必要的副作用函数调用
function cleanUp(effectFn: EffectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i]
    deps.delete(effectFn)
  }
  effectFn.deps.length = 0
}
