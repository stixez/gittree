/**
 * Export the git visualization to PNG or SVG, rendered directly from the
 * Scene (the canvas renderer's data model) — independent of what's currently
 * on screen, so exports cover the whole graph at full quality.
 */
import type { Scene } from '../renderer/types'
import { renderSceneToCanvas, sceneToSVG } from '../renderer/exportScene'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportToPNG(scene: Scene, filename = 'gittree.png') {
  if (!scene.nodes.length) throw new Error('Nothing to export — no commits loaded')
  const canvas = renderSceneToCanvas(scene, 2)
  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Failed to create PNG')); return }
      downloadBlob(blob, filename)
      resolve()
    }, 'image/png')
  })
}

export function exportToSVG(scene: Scene, filename = 'gittree.svg') {
  if (!scene.nodes.length) throw new Error('Nothing to export — no commits loaded')
  const svg = sceneToSVG(scene)
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), filename)
}

export async function copyVisualizationLink(repository: string, commitOid?: string) {
  const baseUrl = window.location.origin
  const url = commitOid
    ? `${baseUrl}?repo=${encodeURIComponent(repository)}&commit=${commitOid}`
    : `${baseUrl}?repo=${encodeURIComponent(repository)}`
  try {
    await navigator.clipboard.writeText(url)
    return url
  } catch {
    throw new Error('Failed to copy to clipboard')
  }
}
