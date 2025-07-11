'use client'

import { useState } from 'react'
import { useAuthContext } from '@/contexts/auth-context'
import Button from '@/app/components/base/button'

export default function UserProfile() {
  const { user, logout, isLoading } = useAuthContext()
  const [isOpen, setIsOpen] = useState(false)

  if (!user)
    return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-gray-900">{user.name || user.email}</div>
          <div className="text-xs text-gray-500">{user.email}</div>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-900">{user.name || user.email}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
            </div>
          </div>

          <div className="p-2">
            <Button
              onClick={logout}
              disabled={isLoading}
              type="link"
              className="w-full text-left text-sm text-red-600"
            >
              {isLoading ? 'Signing out...' : 'Sign out'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
