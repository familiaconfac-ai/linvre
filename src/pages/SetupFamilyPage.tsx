import { useState, type FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AppLogo from '../components/AppLogo'
import { createFamily } from '../services/families'
import { updateUserProfile, createUserProfile } from '../services/users'
import type { Family } from '../types'

export default function SetupFamilyPage() {
  const { firebaseUser, appUser, loading, refreshAppUser } = useAuth()
  const navigate = useNavigate()
  const [familyName, setFamilyName] = useState('')
  const [displayName, setDisplayName] = useState(appUser?.displayName ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Still loading auth state — wait
  if (loading) return null

  // Not authenticated at all
  if (!firebaseUser) return <Navigate to="/login" replace />

  // Already fully set up → go to correct dashboard
  if (appUser?.familyId) {
    return <Navigate to={appUser.role === 'parent' ? '/parent' : '/child'} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!firebaseUser) return
    console.log('[DEBUG] submit:start')
    setSubmitting(true)

    try {
      const newFamilyId = `f_${firebaseUser.uid.slice(0, 8)}_${Date.now()}`

      const family: Family = {
        id: newFamilyId,
        familyName: familyName.trim(),
        parentIds: [firebaseUser.uid],
        childrenIds: [],
        createdAt: new Date(),
      }

      console.log('[DEBUG] submit: creating family')
      await createFamily(family)

      // Update or create the parent's user profile
      if (appUser && appUser.familyId) {
        // appUser exists and already has a familyId - this is a real profile from Firestore
        console.log('[DEBUG] submit: appUser exists with familyId, updating profile')
        console.log('[DEBUG] submit: user:update:start')
        await updateUserProfile(firebaseUser.uid, {
          familyId: newFamilyId,
          displayName: displayName.trim() || appUser.displayName,
        })
      } else {
        // appUser doesn't exist OR is a fallback profile (no familyId) - create new profile
        console.log('[DEBUG] submit: appUser does not exist or is fallback, creating profile')
        console.log('[DEBUG] submit: user:create:start')
        const newProfile = {
          id: firebaseUser.uid,
          displayName: (displayName.trim() || firebaseUser.email) ?? 'Pai/Mãe',
          email: firebaseUser.email ?? '',
          role: 'parent' as const,
          familyId: newFamilyId,
          points: 0,
          accessStatus: 'released' as const,
          isActive: true,
          createdAt: new Date(),
        }
        await createUserProfile(newProfile)
      }

      console.log('[DEBUG] submit: refresh:start')
      try {
        await refreshAppUser()
      } catch (refreshError) {
        console.warn('[DEBUG] submit: refresh failed, but continuing:', refreshError)
      }

      console.log('[DEBUG] submit: navigate:/parent')
      navigate('/parent')
    } catch (err) {
      console.error(err)
      setError('Erro ao criar família. Tente novamente.')
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seu nome
            </label>
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
              Nome da família
            </label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Ex: Família Silva"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Criando...' : 'Criar Família'}
          </button>
        </form>
      </div>
    </div>
  )
}
