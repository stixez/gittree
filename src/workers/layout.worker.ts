import { buildScene } from '../renderer/scene'
import type { LayoutRequest, LayoutResponse } from '../renderer/types'

/** Pure, testable handler. */
export function handleLayoutRequest(req: LayoutRequest): LayoutResponse {
  return { type: 'layout-result', scene: buildScene(req.repository) }
}

// Worker glue — guarded so importing this module under Node tests is safe.
if (typeof self !== 'undefined' && typeof (self as any).postMessage === 'function' && typeof window === 'undefined') {
  self.onmessage = (e: MessageEvent<LayoutRequest>) => {
    if (e.data?.type === 'layout') {
      const res = handleLayoutRequest(e.data)
      ;(self as any).postMessage(res)
    }
  }
}
