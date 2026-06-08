import type { Camera } from './types'

/** Ease-out cubic — fast start, gentle settle. */
export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return 1 - Math.pow(1 - c, 3)
}

/** Linear interpolate between two cameras at eased progress t in [0,1]. */
export function lerpCamera(from: Camera, to: Camera, t: number): Camera {
  const e = easeOutCubic(t)
  return {
    x: from.x + (to.x - from.x) * e,
    y: from.y + (to.y - from.y) * e,
    zoom: from.zoom + (to.zoom - from.zoom) * e,
  }
}

export interface CameraTween {
  from: Camera
  to: Camera
  start: number
  duration: number
}

/**
 * Step a tween at the given timestamp. Returns the camera for this frame and
 * whether the tween is finished.
 */
export function stepTween(tween: CameraTween, now: number): { cam: Camera; done: boolean } {
  const t = (now - tween.start) / tween.duration
  if (t >= 1) return { cam: tween.to, done: true }
  return { cam: lerpCamera(tween.from, tween.to, t), done: false }
}
