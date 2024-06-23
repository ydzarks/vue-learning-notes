import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['./src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
})
