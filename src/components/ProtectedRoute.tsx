import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface Props {
  allowedRole?: 'parent' | 'child'
}

export default function ProtectedRoute({ allowedRole }: Props) {
  const { appUser, firebaseUser, loading, localMode, profileLoadError } = useAuth()

  console.log('[DEBUG] ProtectedRoute:', {
    loading,
    firebaseUser: !!firebaseUser,
    appUser: appUser ? { id: appUser.id, role: appUser.role, familyId: appUser.familyId } : null,
    localMode,
    profileLoadError,
    allowedRole
  })

  if (loading) {
    console.log('[DEBUG] ProtectedRoute: showing loading screen')
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <span className="text-gray-400 text-sm">Carregando...</span>
      </div>
    )
  }

  // Not authenticated at all
  if (!localMode && !firebaseUser) {
    console.log('[DEBUG] ProtectedRoute: no firebaseUser, redirecting to /login')
    return <Navigate to="/login" replace />
  }

  if (localMode && !appUser) {
    console.log('[DEBUG] ProtectedRoute: localMode but no appUser, redirecting to /login')
    return <Navigate to="/login" replace />
  }

  // Profile failed to load due to connectivity issues - but we have fallback
  if (profileLoadError && !appUser) {
    console.log('[DEBUG] ProtectedRoute: profileLoadError and no appUser, showing error screen')
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-sm p-8 text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
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

  // Authenticated but no Firestore profile yet → onboarding
  if (!appUser || !appUser.familyId) {
    console.log('[DEBUG] ProtectedRoute: no appUser or no familyId, redirecting to /setup-family')
    return <Navigate to="/setup-family" replace />
  }

  // Wrong role
  if (allowedRole && appUser.role !== allowedRole) {
    return <Navigate to={appUser.role === 'parent' ? '/parent' : '/child'} replace />
  }

  return <Outlet />
}
