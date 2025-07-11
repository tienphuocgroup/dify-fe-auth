'use client'

import { useAuthContext } from '@/contexts/auth-context'
import Button from '@/app/components/base/button'
import { isMsalConfigured } from '@/lib/auth-config'

export default function LoginButton() {
  const { login, isLoading } = useAuthContext()
  const msalConfigured = isMsalConfigured()

  if (!msalConfigured) {
    return (
      <Button
        disabled={true}
        type="primary"
        className="flex items-center gap-2"
        title="Authentication is not configured. Please set MSAL environment variables."
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.64 12.2045c0-.8163-.0737-1.6054-.2109-2.3636H12.1818v4.4727h6.4563c-.2782 1.4968-1.1254 2.7636-2.3963 3.6136v2.9818h3.8781c2.2691-2.0909 3.5782-5.1682 3.5782-8.7045z" />
          <path d="M12.1818 23.64c3.24 0 5.9563-1.0773 7.9418-2.9136l-3.8781-2.9818c-1.0745.7227-2.4509 1.1491-4.0637 1.1491-3.1254 0-5.7681-2.1091-6.7145-4.9455H1.3909v2.9818C3.3818 20.8909 7.45 23.64 12.1818 23.64z" />
          <path d="M5.4673 14.0182c-.24-.7227-.3782-1.4936-.3782-2.2818s.1382-1.5591.3782-2.2818V6.4727H1.3909C.505 8.2409 0 10.0636 0 12.1818s.505 3.9409 1.3909 5.7091l4.0764-3.1527z" />
          <path d="M12.1818 4.8136c1.7636 0 3.3491.6055 4.5927 1.7909l3.4418-3.4418C18.1309 1.1909 15.4145 0 12.1818 0 7.45 0 3.3818 2.7491 1.3909 6.4727l4.0764 3.1527c.9464-2.8364 3.5891-4.9455 6.7145-4.9455z" />
        </svg>
        Sign in (not configured)
      </Button>
    )
  }

  return (
    <Button
      onClick={login}
      disabled={isLoading}
      type="primary"
      className="flex items-center gap-2"
    >
      {isLoading
        ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          Signing in...
          </>
        )
        : (
          <>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.64 12.2045c0-.8163-.0737-1.6054-.2109-2.3636H12.1818v4.4727h6.4563c-.2782 1.4968-1.1254 2.7636-2.3963 3.6136v2.9818h3.8781c2.2691-2.0909 3.5782-5.1682 3.5782-8.7045z" />
              <path d="M12.1818 23.64c3.24 0 5.9563-1.0773 7.9418-2.9136l-3.8781-2.9818c-1.0745.7227-2.4509 1.1491-4.0637 1.1491-3.1254 0-5.7681-2.1091-6.7145-4.9455H1.3909v2.9818C3.3818 20.8909 7.45 23.64 12.1818 23.64z" />
              <path d="M5.4673 14.0182c-.24-.7227-.3782-1.4936-.3782-2.2818s.1382-1.5591.3782-2.2818V6.4727H1.3909C.505 8.2409 0 10.0636 0 12.1818s.505 3.9409 1.3909 5.7091l4.0764-3.1527z" />
              <path d="M12.1818 4.8136c1.7636 0 3.3491.6055 4.5927 1.7909l3.4418-3.4418C18.1309 1.1909 15.4145 0 12.1818 0 7.45 0 3.3818 2.7491 1.3909 6.4727l4.0764 3.1527c.9464-2.8364 3.5891-4.9455 6.7145-4.9455z" />
            </svg>
          Sign in with Microsoft
          </>
        )}
    </Button>
  )
}
