import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AppLogo from './AppLogo'

interface Props {
  children: ReactNode
  title?: string
}

export default function Layout({ children, title }: Props) {
  const { appUser, logout, localMode, demoUsers, signInDemo, resetDemo } = useAuth()
  const navigate = useNavigate()

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
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={homeRoute} className="flex items-center gap-2">
              <AppLogo size="sm" />
              <span className="text-indigo-600 font-bold">LinVre</span>
            </Link>
            {title && <span className="text-gray-500 text-xs">{title}</span>}
          </div>

          <div className="flex items-center gap-3">
            {localMode && (
              <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hidden sm:inline-flex">
                Modo Demo
              </span>
            )}

            {localMode && (
              <select
                value={appUser?.id ?? ''}
                onChange={(e) => void handleSwitchDemoUser(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white"
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
                <span className="text-sm text-gray-500 hidden sm:block">
                  {appUser.displayName}
                </span>
                {localMode && (
                  <button
                    onClick={resetDemo}
                    className="text-xs text-amber-700 hover:text-amber-900 transition-colors"
                  >
                    Reset Demo
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
                >
                  Sair
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
