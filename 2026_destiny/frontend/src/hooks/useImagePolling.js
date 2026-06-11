import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../api/axios'

/**
 * DALL-E 이미지 생성 완료까지 3초마다 폴링
 * @param {Function} onImageReady - 이미지 준비 완료 시 호출 (imageData 전달)
 */
export function useImagePolling(onImageReady) {
  const [imagePolling, setImagePolling]   = useState(false)
  const [imageGenFailed, setImageGenFailed] = useState(false)
  const pollingRef = useRef(null)

  const startPolling = useCallback(() => setImagePolling(true), [])
  const stopPolling  = useCallback(() => setImagePolling(false), [])

  useEffect(() => {
    if (!imagePolling) return

    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get('/saju/me/image-status')
        if (res.data?.imageReady || res.data?.imageData) {
          stopPolling()
          clearInterval(pollingRef.current)
          onImageReady?.(res.data)
        }
      } catch { /* 폴링 중 에러는 조용히 무시하고 다음 인터벌에 재시도 */ }
    }, 3000)

    // 최대 2분 후 자동 중단 → 실패 상태로 표시
    const timeout = setTimeout(() => {
      clearInterval(pollingRef.current)
      stopPolling()
      setImageGenFailed(true)
    }, 120_000)

    return () => {
      clearInterval(pollingRef.current)
      clearTimeout(timeout)
    }
  }, [imagePolling, stopPolling, onImageReady])

  return { imagePolling, imageGenFailed, startPolling }
}
