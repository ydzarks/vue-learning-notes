import { describe, expect, it, vi } from 'vitest'

import { createReactive } from '../reactive'
import { createEffect } from '../effect'

describe('test', () => {
  it('是否返回响应式对象', () => {
    const original = { foo: 1 }
    const observed = createReactive(original)
    expect(observed).not.toBe(original)
  })

  it('副作用函数会被默认执行一次', () => {
    const fnSpy = vi.fn(() => { })
    createEffect(fnSpy)
    expect(fnSpy).toHaveBeenCalledTimes(1)
  })

  it('修改数据后是否成功触发副作用函数', () => {
    const original = { foo: 1 }
    const observed = createReactive(original)

    let foo = 0
    createEffect(() => {
      foo = observed.foo
    })
    expect(foo).toBe(1)
    observed.foo++
    expect(foo).toBe(2)
  })

  it('副作用函数存在条件分支时，是否避免不必要的触发', () => {
    const original = { foo: 1, ok: true }
    const observed = createReactive(original)
    let foo = 0
    const fnSpy = vi.fn(() => {
      foo = observed.ok ? observed.foo : -1
    })
    createEffect(fnSpy)
    expect(fnSpy).toHaveBeenCalledTimes(1)
    expect(foo).toBe(observed.foo)
    observed.ok = false
    expect(fnSpy).toHaveBeenCalledTimes(2)
    expect(foo).toBe(-1)
    observed.foo = 2
    expect(foo).toBe(-1)
    // 还是累计执行了2次
    expect(fnSpy).toHaveBeenCalledTimes(2)
  })
})
