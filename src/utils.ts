import type { ValueKey } from './effect'

export function hasOwn(target: any, key: ValueKey) {
  return Object.prototype.hasOwnProperty.call(target, key)
}
