/**
 * Pre-renders a radial-glow sprite per (color, radius) once to an offscreen
 * canvas, then callers blit it with drawImage — so glow costs a stamp, not a
 * per-frame blur. This is the key to glow at scale.
 */
const cache = new Map<string, HTMLCanvasElement>()

export function getGlowSprite(color: string, radius: number): HTMLCanvasElement {
  const key = `${color}@${radius}`
  const existing = cache.get(key)
  if (existing) return existing

  const pad = radius * 2.5
  const size = Math.ceil(pad * 2)
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  const cx = size / 2

  const grad = ctx.createRadialGradient(cx, cx, radius * 0.3, cx, cx, pad)
  grad.addColorStop(0, color)
  grad.addColorStop(0.4, color + 'aa')
  grad.addColorStop(1, color + '00')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cx, pad, 0, Math.PI * 2)
  ctx.fill()

  cache.set(key, c)
  return c
}

export function clearGlowCache(): void {
  cache.clear()
}
