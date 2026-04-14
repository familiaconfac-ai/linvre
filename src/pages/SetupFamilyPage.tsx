import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import AppLogo from '../components/AppLogo'
import { useAuth } from '../hooks/useAuth'
import { createFamily } from '../services/families'
import { createUserProfile, updateUserProfile } from '../services/users'
import type { AppUser, Family } from '../types'

export default function SetupFamilyPage() {
  const {
    firebaseUser,
    appUser,
    loading,
    refreshAppUser,
    setAppUser,
    profileLoadError,
  } = useAuth()
  const navigate = useNavigate()
  const [familyName, setFamilyName] = useState('')
  const [displayName, setDisplayName] = useState(appUser?.displayName ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (loading) return null

  if (!firebaseUser) return <Navigate to="/login" replace />

  if (appUser?.familyId) {
    console.log(
      '[SETUP_FAMILY] already-configured:redirecting',
      appUser.role === 'parent' ? '/parent' : '/child',
    )
    return <Navigate to={appUser.role === 'parent' ? '/parent' : '/child'} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!firebaseUser) return

    console.log('[SETUP_FAMILY] submit:start', {
      loading,
      firebaseUser: { uid: firebaseUser.uid, email: firebaseUser.email },
      appUser: appUser
        ? {
            id: appUser.id,
            familyId: appUser.familyId,
            role: appUser.role,
          }
        : null,
      profileLoadError,
    })
    setSubmitting(true)

    try {
      const newFamilyId = `f_${firebaseUser.uid.slice(0, 8)}_${Date.now()}`
      const nextProfile: AppUser = {
        id: firebaseUser.uid,
        displayName: displayName.trim() || appUser?.displayName || firebaseUser.email || 'Pai/Mae',
        email: appUser?.email || firebaseUser.email || '',
        role: appUser?.role ?? 'parent',
        roleLabel: appUser?.roleLabel,
        familyId: newFamilyId,
        points: appUser?.points ?? 0,
        accessStatus: appUser?.accessStatus ?? 'released',
        isActive: appUser?.isActive ?? true,
        createdAt: appUser?.createdAt ?? new Date(),
      }

      const family: Family = {
        id: newFamilyId,
        familyName: familyName.trim(),
        parentIds: [firebaseUser.uid],
        childrenIds: [],
        createdAt: new Date(),
      }

      console.log('[SETUP_FAMILY] submit:creating-family', { familyId: newFamilyId })
      await createFamily(family)

      console.log('[SETUP_FAMILY] submit:setting-local-app-user', {
        appUser: {
          id: nextProfile.id,
          familyId: nextProfile.familyId,
          role: nextProfile.role,
        },
      })
      setAppUser(nextProfile)

      const shouldUpdateExistingProfile = Boolean(appUser && !profileLoadError)

      if (shouldUpdateExistingProfile) {
        console.log('[SETUP_FAMILY] submit:user-update:start', {
          userId: firebaseUser.uid,
          familyId: newFamilyId,
          profileLoadError,
        })
        await updateUserProfile(firebaseUser.uid, {
          familyId: newFamilyId,
          displayName: nextProfile.displayName,
          email: nextProfile.email,
          role: nextProfile.role,
          roleLabel: nextProfile.roleLabel,
          points: nextProfile.points,
          accessStatus: nextProfile.accessStatus,
          isActive: nextProfile.isActive,
        })
      } else {
        console.log('[SETUP_FAMILY] submit:user-create:start', {
          userId: firebaseUser.uid,
          familyId: newFamilyId,
          profileLoadError,
        })
        await createUserProfile(nextProfile)
      }

      console.log('[SETUP_FAMILY] submit:refresh:start')
      try {
        await refreshAppUser()
      } catch (refreshError) {
        console.warn('[SETUP_FAMILY] submit:refresh:failed-but-continuing', refreshError)
      }

      console.log('[SETUP_FAMILY] navigate:/parent', {
        loading,
        firebaseUser: { uid: firebaseUser.uid, email: firebaseUser.email },
        appUser: {
          id: nextProfile.id,
          familyId: nextProfile.familyId,
          role: nextProfile.role,
        },
        profileLoadError,
      })
      navigate('/parent')
    } catch (err) {
      console.error(err)
      setError('Erro ao criar familia. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <AppLogo size="md" className="mb-3" />
          <h1 className="text-2xl font-bold text-indigo-600">LinVre</h1>
          <p className="text-gray-400 text-sm mt-1">Link Livre</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Ex: Maria"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da familia
            </label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Ex: Familia Silva"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Criando...' : 'Criar Familia'}
          </button>
        </form>
      </div>
    </div>
  )
}
