import { AuthContext } from '@contexts/AuthContext'
import { useContext } from 'react'

export function useAuuth() {
  const context = useContext(AuthContext)

  return context
}
