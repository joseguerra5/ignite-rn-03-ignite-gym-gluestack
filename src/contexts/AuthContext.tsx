import { UserDTO } from '@dtos/UserDTO'
import { api } from '@services/api'
import {
  storageTokenGet,
  storageTokenRemove,
  storageTokenSave,
} from '@storage/storage-auth-token'
import {
  storageUserGet,
  storageUserRemove,
  storageUserSave,
} from '@storage/storage-user'
import { createContext, ReactNode, useEffect, useState } from 'react'

export type AuthContextDataProps = {
  user: UserDTO
  singIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isLoadingUserStorageData: boolean
}
export const AuthContext = createContext<AuthContextDataProps>(
  {} as AuthContextDataProps,
)

type AuthContextProviderProps = {
  children: ReactNode
}

export function AuthContextProvider({ children }: AuthContextProviderProps) {
  const [user, setUser] = useState<UserDTO>({} as UserDTO)
  const [isLoadingUserStorageData, setIsLoadingUserStorageData] = useState(true)

  async function userAndTokenUpdate(userData: UserDTO, token: string) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
    setUser(userData)
  }

  async function singIn(email: string, password: string) {
    try {
      const { data } = await api.post('/sessions', { email, password })

      if (data.user && data.token) {
        await storageUserSave(data.user)
        await storageTokenSave(data.token)
        userAndTokenUpdate(data.user, data.token)
      }
    } catch (error) {
      console.log(error)
      throw error
    } finally {
      setIsLoadingUserStorageData(false)
    }
  }

  async function signOut() {
    try {
      setIsLoadingUserStorageData(true)
      setUser({} as UserDTO)
      await storageUserRemove()
      await storageTokenRemove()
    } finally {
      setIsLoadingUserStorageData(false)
    }
  }

  async function loadUserData() {
    try {
      setIsLoadingUserStorageData(true)
      const userLogged = await storageUserGet()
      const token = await storageTokenGet()
      if (userLogged && token) {
        userAndTokenUpdate(userLogged, token)
      }
    } finally {
      setIsLoadingUserStorageData(false)
    }
  }

  useEffect(() => {
    loadUserData()
  }, [])
  return (
    <AuthContext.Provider
      value={{
        user,
        singIn,
        signOut,
        isLoadingUserStorageData,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
