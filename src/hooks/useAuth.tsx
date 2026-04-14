import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  browserLocalPersistence,
  type User,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../lib/firebase'
import { getCurrentUserProfile } from '../services/users'
import {
  providerClearCurrentDemoUser,
  providerGetCurrentDemoUser,
  providerGetDemoUsers,
  providerResetDemoData,
  providerSetCurrentDemoUser,
} from '../services/dataProvider'
import type { AppUser } from '../types'

// ─── Context ─────────────────────────────────────────────────────────────────

interface AuthContextValue {
  firebaseUser: User | null
  appUser: AppUser | null
  loading: boolean
  localMode: boolean
  demoUsers: AppUser[]
  profileLoadError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signInDemo: (userId: string) => Promise<void>
  logout: () => Promise<void>
  refreshAppUser: () => Promise<void>
  setAppUser: (user: AppUser | null) => void
  resetDemo: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [demoUsers, setDemoUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null)
  const configured = isFirebaseConfigured()

  useEffect(() => {
    // If Firebase is not configured, don't try to listen to auth state
    if (!configured || !auth) {
      setDemoUsers(providerGetDemoUsers())
      setAppUser(providerGetCurrentDemoUser())
      setLoading(false)
      return
    }

    void setPersistence(auth, browserLocalPersistence)

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[AUTH] onAuthStateChanged:start', {
        loading,
        firebaseUser: user
          ? { uid: user.uid, email: user.email }
          : null,
        currentAppUser: appUser
          ? {
              id: appUser.id,
              familyId: appUser.familyId,
              role: appUser.role,
            }
          : null,
        profileLoadError,
      })
      setFirebaseUser(user)
      if (user) {
        try {
          const profile = await getCurrentUserProfile(user.uid)
          console.log('[AUTH] onAuthStateChanged:profile-loaded', {
            uid: user.uid,
            profile: profile
              ? {
                  id: profile.id,
                  familyId: profile.familyId,
                  role: profile.role,
                }
              : null,
          })
          setAppUser(profile)
          setProfileLoadError(null) // Limpa erro anterior se conseguiu carregar
        } catch (err) {
          console.warn('Failed to load user profile from Firestore:', err)

          // Trata diferentes tipos de erro
          const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'

          if (errorMessage.includes('offline') || errorMessage.includes('network')) {
            // Erro de conectividade - cria perfil fallback com dados do Firebase Auth
            console.warn('Criando perfil fallback devido a erro de conectividade')
            const fallbackProfile: AppUser = {
              id: user.uid,
              displayName: user.displayName || user.email?.split('@')[0] || 'Usuário',
              email: user.email || '',
              role: 'parent', // Assume parent por padrão, pode ser ajustado depois
              roleLabel: 'Pai', // Assume Pai por padrão
              familyId: '', // Família não configurada
              points: 0,
              accessStatus: 'released',
              isActive: true,
              createdAt: new Date(),
            }
            setAppUser(fallbackProfile)
            setProfileLoadError('Perfil carregado em modo offline. Algumas funcionalidades podem estar limitadas.')
          } else if (errorMessage.includes('permission-denied')) {
            // Erro de permissão - cria perfil fallback mas marca como erro
            console.error('Erro de permissão ao acessar perfil do usuário')
            const fallbackProfile: AppUser = {
              id: user.uid,
              displayName: user.displayName || user.email?.split('@')[0] || 'Usuário',
              email: user.email || '',
              role: 'parent',
              roleLabel: 'Pai',
              familyId: '',
              points: 0,
              accessStatus: 'released',
              isActive: true,
              createdAt: new Date(),
            }
            setAppUser(fallbackProfile)
            setProfileLoadError('Erro de permissão. Usando perfil limitado.')
          } else {
            // Outro erro - cria perfil fallback genérico
            console.warn('Erro ao carregar perfil, usando fallback:', errorMessage)
            const fallbackProfile: AppUser = {
              id: user.uid,
              displayName: user.displayName || user.email?.split('@')[0] || 'Usuário',
              email: user.email || '',
              role: 'parent',
              roleLabel: 'Pai',
              familyId: '',
              points: 0,
              accessStatus: 'released',
              isActive: true,
              createdAt: new Date(),
            }
            setAppUser(fallbackProfile)
            setProfileLoadError('Perfil carregado com limitações. Tente sincronizar quando possível.')
          }
        }
      } else {
        setAppUser(null)
        setProfileLoadError(null)
      }
      console.log('[AUTH] onAuthStateChanged:end', {
        nextLoading: false,
        firebaseUser: user ? user.uid : null,
      })
      setLoading(false)
    })
    return unsubscribe
  }, [configured])

  const signIn = async (email: string, password: string) => {
    if (!configured || !auth) {
      throw new Error('Firebase is not configured. Please check your .env file.')
    }
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signInDemo = async (userId: string) => {
    if (configured) {
      throw new Error('Demo login is only available in local mode.')
    }
    providerSetCurrentDemoUser(userId)
    setAppUser(providerGetCurrentDemoUser())
    setDemoUsers(providerGetDemoUsers())
  }

  const logout = async () => {
    if (!configured) {
      providerClearCurrentDemoUser()
      setAppUser(null)
      return
    }
    if (!auth) return
    await signOut(auth)
  }

  const refreshAppUser = async () => {
    console.log('[AUTH] refreshAppUser:start', {
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
    })
    if (!configured) {
      console.log('[AUTH] refreshAppUser:local-mode')
      setDemoUsers(providerGetDemoUsers())
      setAppUser(providerGetCurrentDemoUser())
      return
    }
    if (!firebaseUser) {
      console.log('[AUTH] refreshAppUser:no-firebase-user')
      return
    }
    try {
      console.log('[AUTH] refreshAppUser:fetching-profile', { uid: firebaseUser.uid })
      const profile = await getCurrentUserProfile(firebaseUser.uid)
      console.log('[AUTH] refreshAppUser:profile-loaded', {
        profile: profile
          ? {
              id: profile.id,
              role: profile.role,
              familyId: profile.familyId,
            }
          : null,
      })

      if (profile) {
        setAppUser(profile)
        setProfileLoadError(null)
        return
      }

      console.warn('[AUTH] refreshAppUser:profile-null-preserving-current-state', {
        currentAppUser: appUser
          ? {
              id: appUser.id,
              role: appUser.role,
              familyId: appUser.familyId,
            }
          : null,
      })
    } catch (err) {
      console.warn('[AUTH] refreshAppUser:failed', err)
    }
  }

  const resetDemo = () => {
    providerResetDemoData()
    setDemoUsers(providerGetDemoUsers())
    setAppUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        appUser,
        loading,
        localMode: !configured,
        demoUsers,
        profileLoadError,
        signIn,
        signInDemo,
        logout,
        refreshAppUser,
        setAppUser,
        resetDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
