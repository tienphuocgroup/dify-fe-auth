'use client'

import { useEffect } from 'react'

export default function ChunkErrorHandler() {
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      const error = event.error
      if (error?.name === 'ChunkLoadError' || event.message?.includes('Loading chunk')) {
        console.log('Chunk loading error detected, reloading page...')
        event.preventDefault()
        window.location.reload()
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      if (error?.name === 'ChunkLoadError' || error?.message?.includes('Loading chunk')) {
        console.log('Chunk loading promise rejection detected, reloading page...')
        event.preventDefault()
        window.location.reload()
      }
    }

    // Add event listeners for unhandled errors
    window.addEventListener('error', handleChunkError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Cleanup
    return () => {
      window.removeEventListener('error', handleChunkError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return null
}
