import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AppLogo from './AppLogo'

interface Props {
  children: ReactNode
  title?: string
}

export default function Layout({ children, title }: Props) {
  const { appUser, logout, localMode, demoUsers, signInDemo, resetDemo, profileLoadError } = useAuth()
  const navigate = useNavigate()

  console.log('[DEBUG] Layout:', {
    appUser: appUser ? { id: appUser.id, role: appUser.role, familyId: appUser.familyId } : null,
    profileLoadError,
    title
  })

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const homeRoute = appUser?.role === 'parent' ? '/parent' : '/child'

  const handleSwitchDemoUser = async (userId: string) => {
    await signInDemo(userId)
    const next = demoUsers.find((u) => u.id === userId)
    navigate(next?.role === 'parent' ? '/parent' : '/child')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to={homeRoute} className="flex items-center gap-2 flex-shrink-0">
            <AppLogo size="sm" />
          </Link>

          <div className="flex items-center gap-2 ml-auto">
            {localMode && (
              <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hidden sm:inline-flex">
                Demo
              </span>
            )}

            {localMode && (
              <select
                value={appUser?.id ?? ''}
                onChange={(e) => void handleSwitchDemoUser(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white hover:border-gray-300 transition-colors"
              >
                {demoUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            )}

            {appUser && (
              <>
                <span className="text-xs text-gray-500 hidden sm:block">
                  {appUser.displayName}
                </span>
                {localMode && (
                  <button
                    onClick={resetDemo}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Sair
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {profileLoadError && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-4xl mx-auto px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <span className="text-amber-600">⚠️</span>
              <span>{profileLoadError}</span>
              <button
                onClick={() => window.location.reload()}
                className="ml-auto text-xs bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6">
        {title && <div className="text-xs text-gray-400 mb-4">{title}</div>}
        {children}
      </main>
    </div>
  )
}
