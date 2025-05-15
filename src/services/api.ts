import { storageTokenGet, storageTokenSave } from '@storage/storage-auth-token'
import { AppError } from '@utils/AppError'
import axios, { AxiosError, AxiosInstance } from 'axios'

type SignOut = () => void
type APIInstanceProps = AxiosInstance & {
  registerInterceptTokenManager: (signOut: SignOut) => () => void
}

type PromiseType = {
  onSuccess: (token: string) => void
  onFailure: (error: AxiosError) => void
}
const api = axios.create({
  baseURL: 'http://192.168.1.99:3333',
}) as APIInstanceProps

let failedQueue: Array<PromiseType> = []
let isRefreshing = false
api.registerInterceptTokenManager = (signOut) => {
  const interceptTokenManager = api.interceptors.response.use(
    (response) => response,
    async (requestError) => {
      if (requestError?.response?.status === 401) {
        if (
          requestError.response.data?.message === 'token.expired' ||
          requestError.response.data?.message === 'token.invalid'
        ) {
          const { refresh_token } = await storageTokenGet()

          if (!refresh_token) {
            signOut()
            return Promise.reject(requestError)
          }

          const originalRequestConfig = requestError.config

          // fila de requisição
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({
                onSuccess: (token: string) => {
                  originalRequestConfig.hearders = {
                    Authorization: `Bearer ${token}`,
                  }
                  resolve(api(originalRequestConfig))
                },
                onFailure: (error: AxiosError) => {
                  reject(error)
                },
              })
            })
          }

          isRefreshing = true

          // busca token atualizado
          return new Promise(async (resolve, reject) => {
            try {
              const { data } = await api.post('/sessions/refresh-token', {
                refresh_token,
              })
              await storageTokenSave({
                refresh_token: data.refresh_token,
                token: data.token,
              })

              if (originalRequestConfig.data) {
                originalRequestConfig.data = JSON.parse(
                  originalRequestConfig.data,
                )
              }

              originalRequestConfig.headers = {
                Authorization: `Bearer ${data.token}`,
              }

              api.defaults.headers.common.Authorization = `Bearer ${data.token}`

              failedQueue.forEach((request) => {
                request.onSuccess(data.token)
              })

              resolve(api(originalRequestConfig))
            } catch (error: any) {
              failedQueue.forEach((request) => {
                request.onFailure(error)
              })

              signOut()
              reject(error)
            } finally {
              isRefreshing = false
              failedQueue = []
            }
          })
        }

        signOut()
      }

      if (requestError.response && requestError.response.data) {
        return Promise.reject(new AppError(requestError.response.data.message))
      } else {
        return Promise.reject(
          new AppError('Erro no servidor. Tente novamente mais tarde'),
        )
      }
    },
  )

  return () => {
    api.interceptors.response.eject(interceptTokenManager)
  }
}

export { api }
