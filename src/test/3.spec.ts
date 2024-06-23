import { describe, expect, it, suite } from 'vitest'

import { createReactive } from '../reactive'
import { watch } from '../watch'

describe('watch实现', () => {
  const original = { foo: 1 }
  const observed = createReactive(original)

  it('watch的入参是响应数据对象', () => {
    let count = 0
    watch(observed, () => {
      count += 1
    })
    observed.foo++
    expect(count).toBe(1)
  })

  it('watch的入参是getter函数', () => {
    let count = 0
    watch(() => observed.foo, () => {
      count += 1
    })
    observed.foo++
    expect(count).toBe(1)
  })

  it('watch的回调函数新旧值确认', () => {
    let _nVal = 0
    let _oVal = 0
    watch(() => observed.foo, (nVal, oVal) => {
      _nVal = nVal
      _oVal = oVal
    })
    observed.foo++
    expect(_nVal).toBe(observed.foo)
    expect(_oVal).toBe(observed.foo - 1)
  })

  it('watch函数立即执行的情况', () => {
    let _nVal = 0
    let _oVal = 0
    watch(() => observed.foo, (nVal, oVal) => {
      _nVal = nVal
      _oVal = oVal
    }, { immediate: true })
    expect(_nVal).toBe(observed.foo)
    expect(_oVal).toBe(undefined)
  })

  it('watch函数onInvalidate验证', () => {
    let count = 0
    watch(() => observed.foo, (nVal, oVal, onInvalidate) => {
      onInvalidate(() => { count += 1 })
    })
    observed.foo++
    observed.foo++
    expect(count).toBe(1)
  })
})
