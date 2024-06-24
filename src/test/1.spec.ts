import { describe, expect, it, suite, vi } from 'vitest'

import { createReactive, readonly, shallowReactive } from '../reactive'
import { createEffect } from '../effect'

describe('基础响应式能力测试', () => {
  it('是否成功创建响应对象', () => {
    const original = { foo: 1 }
    const observed = createReactive(original)
    expect(observed).not.toBe(original)
    observed.foo++
    expect(observed.foo).toBe(2)
  })

  it('reflect验证', () => {
    const original = { foo: 1, get bar() { return this.foo } }
    const observed = createReactive(original)
    let temp
    createEffect(() => { temp = observed.bar })
    observed.foo++
    expect(temp).toBe(2)
  })

  it('副作用函数会被默认执行一次', () => {
    const original = { foo: 1 }
    const observed = createReactive(original)
    let temp = 0
    createEffect(() => { temp = observed.foo })
    expect(temp).toBe(1)
    observed.foo++
    expect(temp).toBe(2)
  })

  suite('验证分支切换是否处理不必要的更新', () => {
    const original = { ok: true, foo: 1 }
    const observed = createReactive(original)
    let temp = 0
    let count = 0
    createEffect(() => {
      count++
      temp = observed.ok ? observed.foo : 'empty'
    })
    expect(temp).toBe(observed.foo)
    expect(count).toBe(1)

    it('ok为false时，temp值为empty', () => {
      observed.ok = false
      expect(temp).toBe('empty')
      expect(count).toBe(2)
    })

    it('ok为false时，修改foo不会触发副作用函数', () => {
      observed.foo = 2
      expect(count).toBe(2)
    })
  })

  suite('验证嵌套副作用函数时是否处理了不必要的更新', () => {
    const original = { bar: true, foo: true }
    const observed = createReactive(original)
    let fn1Count = 0; let fn2Count = 0

    createEffect(() => {
      fn1Count += 1
      createEffect(() => {
        fn2Count += 1
        observed.bar
      })
      observed.foo
    })

    it('初始化时各只执行一次', () => {
      expect(fn1Count).toBe(1)
      expect(fn2Count).toBe(1)
    })

    // 如果先修改foo，这样fn2Count就为2，因为fn1又创建了新的副作用函数

    it('修改bar时只有fn2执行一次', () => {
      fn1Count = 0
      fn2Count = 0
      observed.bar = false
      expect(fn1Count).toBe(0)
      expect(fn2Count).toBe(1)
    })
  })

  it('避免无限递归循环', () => {
    const original = { foo: 1 }
    const observed = createReactive(original)

    createEffect(() => {
      observed.foo++
    })

    expect(observed.foo).toBe(2)
    observed.foo++
    expect(observed.foo).toBe(4)
  })

  it('调度执行', () => {
    const original = { foo: 1 }
    const observed = createReactive(original)
    let count = 0
    createEffect(() => { observed.foo }, {
      scheduler: (effect) => {
        count += 1
        effect()
      },
    })
    expect(count).toBe(0)
    observed.foo = 2
    expect(count).toBe(1)
  })

  suite('合理的触发响应', () => {
    const original = { foo: 1 }
    const observed = createReactive(original)

    it('数据值实际没有发生变化不触发', () => {
      const fnSpy = vi.fn(() => observed.foo)
      createEffect(fnSpy)
      expect(fnSpy).toBeCalledTimes(1)
      observed.foo = 1
      expect(fnSpy).toBeCalledTimes(1)
    })

    it('值为NAN的情况', () => {
      const fnSpy = vi.fn(() => observed.foo)
      observed.foo = Number.NaN
      createEffect(fnSpy)
      expect(fnSpy).toBeCalledTimes(1)
      observed.foo = Number.NaN
      expect(fnSpy).toBeCalledTimes(1)
    })

    it('原型链继承', () => {
      observed.foo = 1
      const child = {}
      const childOb = createReactive(child)
      Object.setPrototypeOf(childOb, observed)
      const fnSpy = vi.fn(() => childOb.foo)
      createEffect(fnSpy)
      expect(fnSpy).toBeCalledTimes(1)
      childOb.foo = 2
      expect(observed.foo).toBe(1)
      expect(childOb.foo).toBe(2)
      expect(fnSpy).toBeCalledTimes(2)
    })
  })

  suite('浅响应与深响应', () => {
    it('深响应支持', () => {
      const original = { foo: { bar: 1 } }
      const observed = createReactive(original)
      const fnSpy = vi.fn(() => { observed.foo.bar })
      createEffect(fnSpy)
      expect(fnSpy).toBeCalledTimes(1)
      observed.foo.bar = 2
      expect(fnSpy).toBeCalledTimes(2)
    })

    it('浅响应支持', () => {
      const original = { foo: { bar: 1 } }
      const shallow = shallowReactive(original)
      const fnSpy = vi.fn(() => { shallow.foo.bar })
      createEffect(fnSpy)
      expect(fnSpy).toBeCalledTimes(1)
      shallow.foo.bar = 2
      expect(fnSpy).toBeCalledTimes(1)
    })
  })

  suite('只读控制', () => {
    const original = { foo: 1 }
    const observed = readonly(original)

    it('修改数据只读提醒', () => {
      const fnSpy = vi.fn(() => { observed.foo })
      createEffect(fnSpy)
      expect(fnSpy).toBeCalledTimes(1)
      observed.foo = 2
      expect(fnSpy).toBeCalledTimes(1)
    })
  })
})
