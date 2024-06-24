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

  it('数组的for...in操作', () => {
    const observed = createReactive(['foo'])
    const fnSpy = vi.fn(() => { for (const key in observed) { key } })
    createEffect(fnSpy)
    expect(fnSpy).toBeCalledTimes(1)
    observed[1] = 'bar'
    expect(fnSpy).toBeCalledTimes(2)
    observed.length = 0
    expect(fnSpy).toBeCalledTimes(3)
  })

  it('数组的for...of操作', () => {
    const observed = createReactive(['foo'])
    const fnSpy = vi.fn(() => { for (const value of observed) { value } })
    createEffect(fnSpy)
    expect(fnSpy).toBeCalledTimes(1)
    observed[1] = 'bar'
    expect(fnSpy).toBeCalledTimes(2)
    observed.length = 0
    expect(fnSpy).toBeCalledTimes(3)
  })

  it('数组的查找方法1', () => {
    const observed = createReactive([1, 2])
    const fnSpy = vi.fn(() => { observed.includes(1) })
    createEffect(fnSpy)
    expect(fnSpy).toBeCalledTimes(1)
    observed[0] = 3
    expect(fnSpy).toBeCalledTimes(2)
    observed.length = 0
    expect(fnSpy).toBeCalledTimes(3)
  })

  it('数组的查找方法2', () => {
    const observed = createReactive([1, 2])
    const fnSpy = vi.fn(() => { observed.filter(i => i > 1) })
    createEffect(fnSpy)
    expect(fnSpy).toBeCalledTimes(1)
    observed[2] = 3
    expect(fnSpy).toBeCalledTimes(2)
    observed[2] = 3
    expect(fnSpy).toBeCalledTimes(2)
    observed[2] = 1
    expect(fnSpy).toBeCalledTimes(3)
  })

  it('数组的查找方法3', () => {
    const obj = {}
    const arr = createReactive([obj])
    expect(arr.includes(arr[0])).toBe(true)
    expect(arr.includes(obj)).toBe(true)
  })

  it('数组查找方法的改造，以满足常规直觉', () => {
    const obj = {}
    const arr = createReactive([obj])
    expect(arr.indexOf(arr[0])).toBe(0)
    expect(arr.indexOf(obj)).toBe(0)
    expect(arr.lastIndexOf(arr[0])).toBe(0)
    expect(arr.lastIndexOf(obj)).toBe(0)
  })

  it('隐式修改数组长度', () => {
    const arr = createReactive([])
    const fnSpy1 = vi.fn(() => { arr.push(1) })
    const fnSpy2 = vi.fn(() => { arr.push(1) })
    // 不做修改的话，两个会互相影响
    createEffect(fnSpy1)
    // 第二个副作用函数会进行length的读取操作，进而导致第一个副作用函数的执行
    createEffect(fnSpy2)
  })
})
