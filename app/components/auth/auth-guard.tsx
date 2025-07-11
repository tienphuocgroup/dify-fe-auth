'use client'

import type { ReactNode } from 'react'
import LoginButton from './login-button'
import { useAuthContext } from '@/contexts/auth-context'
import Loading from '@/app/components/base/loading'

type AuthGuardProps = {
  children: ReactNode
  fallback?: ReactNode
  requireAuth?: boolean
}

export default function AuthGuard({
  children,
  fallback,
  requireAuth = false,
}: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuthContext()

  if (isLoading)
    return <Loading type="app" />

  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Sign in to continue
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Access your conversations and chat history
            </p>
          </div>
          <div className="flex justify-center">
            <LoginButton />
          </div>
        </div>
      </div>
    )
  }

  if (fallback && !isAuthenticated)
    return <>{fallback}</>

  return <>{children}</>
}
