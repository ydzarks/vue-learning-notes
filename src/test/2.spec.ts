import { describe, expect, it, suite } from 'vitest'

import { createReactive } from '../reactive'
import { createEffect } from '../effect'
import { computed } from '../computed'

describe('lazy与computed实现', () => {
  suite('lazy实现验证', () => {
    const original = { foo: 1 }
    const observed = createReactive(original)
    let count = 0
    const effect = createEffect(() => { count++; return observed.foo + 1 }, { lazy: true })

    it('副作用函数在注册后没有立即执行', () => {
      expect(count).toBe(0)
    })

    it('此时改变响应对象数据并不会触发副作用函数', () => {
      observed.foo++
      expect(count).toBe(0)
    })

    it('主动触发后才会响应', () => {
      effect()
      expect(count).toBe(1)
      observed.foo++
      expect(count).toBe(2)
    })
  })

  suite('computed实现验证', () => {
    const original = { foo: 1 }
    const observed = createReactive(original)
    const effect = createEffect(() => { return observed.foo + 1 }, { lazy: true })

    it('computed的支撑effect支持返回结果', () => {
      expect(effect()).toBe(2)
    })

    let count = 0
    const sums = computed(() => { count++; return observed.foo + 1 })

    it('computed的基本验证&缓存验证', () => {
      expect(sums.value).toBe(2)
      expect(count).toBe(1)
      expect(sums.value).toBe(2)
      expect(count).toBe(1)
      observed.foo++ // 触发了computed内部的调度器，但未执行副作用函数
      expect(count).toBe(1)
      expect(sums.value).toBe(3)
      expect(count).toBe(2)
    })
  })
})
