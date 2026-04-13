import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface Props {
  allowedRole?: 'parent' | 'child'
}

export default function ProtectedRoute({ allowedRole }: Props) {
  const { appUser, firebaseUser, loading, localMode } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <span className="text-gray-400 text-sm">Carregando...</span>
      </div>
    )
  }

  // Not authenticated at all
  if (!localMode && !firebaseUser) {
    return <Navigate to="/login" replace />
  }

  if (localMode && !appUser) {
    return <Navigate to="/login" replace />
  }

  // Authenticated but no Firestore profile yet → onboarding
  if (!appUser || !appUser.familyId) {
    return <Navigate to="/setup-family" replace />
  }

  // Wrong role
  if (allowedRole && appUser.role !== allowedRole) {
    return <Navigate to={appUser.role === 'parent' ? '/parent' : '/child'} replace />
  }

  return <Outlet />
}
