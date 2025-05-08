import { UserDTO } from '@dtos/UserDTO'
import { createContext, ReactNode, useState } from 'react'

export type AuthContextDataProps = {
  user: UserDTO
}
export const AuthContext = createContext<AuthContextDataProps>(
  {} as AuthContextDataProps,
)

type AuthContextProviderProps = {
  children: ReactNode
}

export function AuthContextProvider({ children }: AuthContextProviderProps) {
  const [user, setUser] = useState({
    id: '1',
    name: 'José Guerra',
    email: 'jose@gmail.com',
    avatar: 'alalala',
  })
  return (
    <AuthContext.Provider
      value={{
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
