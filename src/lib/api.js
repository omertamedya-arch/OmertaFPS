import { createMockApi } from './mock-api'

const bridge = typeof window !== 'undefined' ? window.nitro : null

export const isMock = !bridge

export function notifyPaywall(detail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('omerta:paywall', { detail: detail || {} }))
}

const isLicenseError = (result) =>
  Boolean(result) && result.ok === false && result.code === 'license-required'

function wrap(value) {
  if (typeof value === 'function') {
    return (...args) => {
      const output = value(...args)
      if (!output || typeof output.then !== 'function') return output
      return output.then((result) => {
        if (isLicenseError(result)) {
          notifyPaywall({ module: result.module, message: result.error })
        }
        return result
      })
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const nested = {}
    for (const [key, child] of Object.entries(value)) nested[key] = wrap(child)
    return nested
  }

  return value
}

export const api = wrap(bridge || createMockApi())
