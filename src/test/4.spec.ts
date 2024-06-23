import { describe, expect, it, suite, vi } from 'vitest'

import { createReactive } from '../reactive'
import { createEffect } from '../effect'

describe('object代理测试', () => {
  const original = { foo: 1 }
  const observed = createReactive(original)

  it('in操作符识别', () => {
    const fnSpy = vi.fn(() => { 'foo' in observed })
    createEffect(fnSpy)
    expect(fnSpy).toBeCalledTimes(1)
    observed.foo += 1
    expect(fnSpy).toBeCalledTimes(2)
  })

  suite('for...in操作识别', () => {
    it('能够识别属性增加', () => {
      const fnSpy = vi.fn(() => {
        for (const key in observed) {
          key
        }
      })
      createEffect(fnSpy)
      expect(fnSpy).toBeCalledTimes(1)
      observed.bar = 1
      expect(fnSpy).toBeCalledTimes(2)
    })

    it('已有属性修改不会触发', () => {
      const fnSpy = vi.fn(() => {
        for (const key in observed) {
          key
        }
      })
      createEffect(fnSpy)
      expect(fnSpy).toBeCalledTimes(1)
      observed.foo += 1
      expect(fnSpy).toBeCalledTimes(1)
    })
  })

  it('delete操作符识别', () => {
    const fnSpy = vi.fn(() => { observed.bar })
    createEffect(fnSpy)
    expect(fnSpy).toBeCalledTimes(1)
    delete observed.bar
    expect(fnSpy).toBeCalledTimes(2)
    delete observed.bar
    expect(fnSpy).toBeCalledTimes(2)
    delete observed.foo
    expect(fnSpy).toBeCalledTimes(2)
  })
})
