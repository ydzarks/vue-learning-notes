import { describe, expect, it, vi } from 'vitest'

import { createReactive } from '../reactive'
import { createEffect } from '../effect'

describe('test', () => {
  it('是否成功创建响应对象', () => {
    const original = { foo: 1 }
    const observed = createReactive(original)
    expect(observed).not.toBe(original)
    observed.foo++
    expect(observed.foo).toBe(2)
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
})
