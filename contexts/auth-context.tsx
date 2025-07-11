'use client'

import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import type { AuthActions, AuthState } from '@/hooks/use-auth'
import { useAuth } from '@/hooks/use-auth'

type AuthContextType = AuthState & AuthActions

const AuthContext = createContext<AuthContextType | null>(null)

type AuthContextProviderProps = {
  children: ReactNode
}

export function AuthContextProvider({ children }: AuthContextProviderProps) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context)
    throw new Error('useAuthContext must be used within an AuthContextProvider')

  return context
}

export { AuthContext }
