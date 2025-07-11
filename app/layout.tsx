import { getLocaleOnServer } from '@/i18n/server'
import AuthProvider from '@/providers/msal-provider'
import { AuthContextProvider } from '@/contexts/auth-context'
import ErrorBoundary from '@/app/components/error-boundary'
import ChunkErrorHandler from '@/app/components/chunk-error-handler'

import './styles/globals.css'
import './styles/markdown.scss'

const LocaleLayout = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const locale = getLocaleOnServer()
  return (
    <html lang={locale ?? 'en'} className="h-full">
      <body className="h-full">
        <div className="overflow-x-auto">
          <div className="w-screen h-screen min-w-[300px]">
            <ErrorBoundary>
              <ChunkErrorHandler />
              <AuthProvider>
                <AuthContextProvider>
                  {children}
                </AuthContextProvider>
              </AuthProvider>
            </ErrorBoundary>
          </div>
        </div>
      </body>
    </html>
  )
}

export default LocaleLayout
