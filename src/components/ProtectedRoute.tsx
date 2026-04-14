import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface Props {
  allowedRole?: 'parent' | 'child'
}

export default function ProtectedRoute({ allowedRole }: Props) {
  const { appUser, firebaseUser, loading, localMode, profileLoadError } = useAuth()
  const location = useLocation()

  useEffect(() => {
    console.log('[ROUTE] navigation', {
      pathname: location.pathname,
      loading,
      firebaseUser: firebaseUser
        ? { uid: firebaseUser.uid, email: firebaseUser.email }
        : null,
      appUser: appUser
        ? {
            id: appUser.id,
            familyId: appUser.familyId,
            role: appUser.role,
          }
        : null,
      profileLoadError,
      allowedRole,
    })
  }, [allowedRole, appUser, firebaseUser, loading, location.pathname, profileLoadError])

  console.log('[PROTECTED_ROUTE] render', {
    pathname: location.pathname,
    loading,
    firebaseUser: firebaseUser
      ? { uid: firebaseUser.uid, email: firebaseUser.email }
      : null,
    appUser: appUser
      ? {
          id: appUser.id,
          familyId: appUser.familyId,
          role: appUser.role,
        }
      : null,
    localMode,
    profileLoadError,
    allowedRole,
  })

  if (loading) {
    console.log('[PROTECTED_ROUTE] state:real-loading')
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <span className="text-gray-400 text-sm">Carregando...</span>
      </div>
    )
  }

  if (!localMode && !firebaseUser) {
    console.log('[PROTECTED_ROUTE] state:no-firebase-user -> /login')
    return <Navigate to="/login" replace />
  }

  if (localMode && !appUser) {
    console.log('[PROTECTED_ROUTE] state:local-mode-without-app-user -> /login')
    return <Navigate to="/login" replace />
  }

  if (!appUser && profileLoadError) {
    console.log('[PROTECTED_ROUTE] state:profile-load-error-without-app-user')
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-sm p-8 text-center">
          <div className="text-red-500 text-4xl mb-4">!</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Erro ao carregar perfil</h2>
          <p className="text-sm text-gray-600 mb-4">{profileLoadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white rounded-lg py-2 px-4 text-sm font-semibold hover:bg-indigo-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (!appUser) {
    console.log('[PROTECTED_ROUTE] state:app-user-missing -> /setup-family')
    return <Navigate to="/setup-family" replace />
  }

  if (!appUser.familyId) {
    console.log('[PROTECTED_ROUTE] state:fallback-or-incomplete-app-user -> /setup-family', {
      profileLoadError,
      role: appUser.role,
    })
    return <Navigate to="/setup-family" replace />
  }

  if (allowedRole && appUser.role !== allowedRole) {
    console.log('[PROTECTED_ROUTE] state:wrong-role-redirect', {
      currentRole: appUser.role,
      expectedRole: allowedRole,
    })
    return <Navigate to={appUser.role === 'parent' ? '/parent' : '/child'} replace />
  }

  return <Outlet />
}
