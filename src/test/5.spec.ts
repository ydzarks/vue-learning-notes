import { describe, expect, it, suite, vi } from 'vitest'

import { createReactive } from '../reactive'
import { createEffect } from '../effect'

describe('数组支持', () => {
  it('基于数组索引', () => {
    const observed = createReactive(['foo'])
    const fnSpy = vi.fn(() => { observed[0] })
    createEffect(fnSpy)
    expect(fnSpy).toBeCalledTimes(1)
    observed[0] = 'bar'
    expect(fnSpy).toBeCalledTimes(2)
  })

  it('基于数组length', () => {
    const observed = createReactive(['foo'])
    const fnSpy = vi.fn(() => { observed.length })
    createEffect(fnSpy)
    expect(fnSpy).toBeCalledTimes(1)
    observed[1] = 'bar' // 添加属性应该会改变数组长度
    expect(fnSpy).toBeCalledTimes(2)
    const fnSpy2 = vi.fn(() => { observed[0] })
    createEffect(fnSpy2)
    observed.length = 0 // 直接改变数组长度应该也能被识别
    expect(fnSpy2).toBeCalledTimes(2)
  })
})
