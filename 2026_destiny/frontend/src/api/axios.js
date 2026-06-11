import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── 요청 인터셉터: accessToken 자동 첨부 ──
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── 응답 인터셉터: ApiResponse<T> 언래핑 + 401 시 refresh 시도 ──
let isRefreshing = false
let failedQueue = []   // refresh 중 대기 중인 요청들

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (res) => {
    const body = res.data
    if (body && typeof body.success === 'boolean') {
      if (!body.success) return Promise.reject(new Error(body.error || '오류가 발생했습니다.'))
      return { ...res, data: body.data }
    }
    return res
  },
  async (error) => {
    const originalRequest = error.config

    // 401 이고 refresh 재시도 아직 안 한 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refreshToken')

      // refresh token 없으면 바로 로그인
      if (!refreshToken) {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      // 이미 refresh 중이면 큐에 대기
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken })
        const newAccess  = data?.data?.accessToken  || data?.accessToken
        const newRefresh = data?.data?.refreshToken || data?.refreshToken

        if (!newAccess) throw new Error('토큰 갱신 실패')

        localStorage.setItem('accessToken', newAccess)
        if (newRefresh) localStorage.setItem('refreshToken', newRefresh)

        api.defaults.headers.common.Authorization = `Bearer ${newAccess}`
        originalRequest.headers.Authorization     = `Bearer ${newAccess}`

        processQueue(null, newAccess)
        return api(originalRequest)

      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshError)

      } finally {
        isRefreshing = false
      }
    }

    // 그 외 에러: 메시지 꺼내기
    const msg = error.response?.data?.error || error.message || '오류가 발생했습니다.'
    return Promise.reject(new Error(msg))
  }
)

export default api
