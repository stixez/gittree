import { useEffect, useState } from 'react'

interface DragDropOptions {
  onDrop: (handle: FileSystemDirectoryHandle) => void
  enabled?: boolean
}

export function useDragDrop({ onDrop, enabled = true }: DragDropOptions) {
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let dragCounter = 0

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      dragCounter++
      setIsDragging(true)
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      dragCounter--
      if (dragCounter === 0) {
        setIsDragging(false)
      }
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
    }

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      dragCounter = 0
      setIsDragging(false)

      if (!e.dataTransfer?.items) return

      // Get the first directory item
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i]
        
        if (item.kind === 'file') {
          // @ts-expect-error - getAsFileSystemHandle is experimental
          const handle = await item.getAsFileSystemHandle?.()
          
          if (handle && handle.kind === 'directory') {
            onDrop(handle as FileSystemDirectoryHandle)
            break
          }
        }
      }
    }

    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [onDrop, enabled])

  return { isDragging }
}
