import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.REACT_APP_BACKEND_URL
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let refreshSubscribers = []

const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback)
}

const onRefreshed = (token) => {
  refreshSubscribers.forEach((callback) => callback(token))
  refreshSubscribers = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const refreshToken = localStorage.getItem('refresh_token')

    if (error.response?.status === 401 && refreshToken && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const response = await api.post('/auth/refresh', { refresh_token: refreshToken })
        const newToken = response.data.access_token
        localStorage.setItem('access_token', newToken)
        api.defaults.headers.Authorization = `Bearer ${newToken}`
        onRefreshed(newToken)
        return api(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
