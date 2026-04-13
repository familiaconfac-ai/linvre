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
  signIn: (email: string, password: string) => Promise<void>
  signInDemo: (userId: string) => Promise<void>
  logout: () => Promise<void>
  refreshAppUser: () => Promise<void>
  resetDemo: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [demoUsers, setDemoUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
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
      setFirebaseUser(user)
      if (user) {
        try {
          const profile = await getCurrentUserProfile(user.uid)
          setAppUser(profile)
        } catch (err) {
          console.warn('Failed to load user profile:', err)
          setAppUser(null)
        }
      } else {
        setAppUser(null)
      }
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
    if (!configured) {
      setDemoUsers(providerGetDemoUsers())
      setAppUser(providerGetCurrentDemoUser())
      return
    }
    if (!firebaseUser) return
    try {
      const profile = await getCurrentUserProfile(firebaseUser.uid)
      setAppUser(profile)
    } catch (err) {
      console.warn('Failed to refresh user profile:', err)
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
        signIn,
        signInDemo,
        logout,
        refreshAppUser,
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
