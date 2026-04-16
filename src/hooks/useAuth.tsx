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

export function AuthProvider({ children }: { children: ReactNode }) {
const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
const [appUser, setAppUser] = useState<AppUser | null>(null)
const [demoUsers, setDemoUsers] = useState<AppUser[]>([])
const [loading, setLoading] = useState(true)
const [profileLoadError, setProfileLoadError] = useState<string | null>(null)
const configured = isFirebaseConfigured()

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
return new Promise((resolve, reject) => {
const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
promise.then(
(value) => {
clearTimeout(timer)
resolve(value)
},
(error) => {
clearTimeout(timer)
reject(error)
}
)
})
}

useEffect(() => {
if (!configured || !auth) {
setDemoUsers(providerGetDemoUsers())
setAppUser(providerGetCurrentDemoUser())
setLoading(false)
return
}

void setPersistence(auth, browserLocalPersistence)

const unsubscribe = onAuthStateChanged(auth, async (user) => {
  console.log('[AUTH] state-change:start')
  console.log('[AUTH] state-change:user', user ? { uid: user.uid, email: user.email } : null)

  setFirebaseUser(user)

  try {
    if (user) {
      console.log('[AUTH] profile:before-fetch', user.uid)

      const profile = await withTimeout(
        getCurrentUserProfile(user.uid),
        8000
      )

      console.log('[AUTH] profile:after-fetch', profile)

      if (profile) {
        if (profile.role === 'child') {
          console.log('[ACCESS] child-login:status', {
            childId: profile.id,
            accessStatus: profile.accessStatus,
            accessMode: profile.accessMode ?? null,
            blockedReason: profile.blockedReason ?? null,
            releaseReason: profile.releaseReason ?? null,
          })
        }
        console.log('[AUTH] profile:using-firestore-profile')
        setAppUser(profile)
        setProfileLoadError(null)
      } else {
        console.log('[AUTH] profile:null-using-fallback')

        const fallbackProfile: AppUser = {
          id: user.uid,
          displayName:
            user.displayName ??
            user.email?.split('@')[0] ??
            'User',
          email: user.email ?? '',
          role: 'child',
          roleLabel: 'Filho',
          familyId: '',
          points: 0,
          accessStatus: 'released',
          isActive: true,
          createdAt: new Date(),
        }

        setAppUser(fallbackProfile)
        setProfileLoadError('Perfil não encontrado, usando fallback.')
      }
    } else {
      console.log('[AUTH] state-change:no-user')
      setAppUser(null)
      setProfileLoadError(null)
    }
  } catch (err) {
    console.error('[AUTH] profile:catch', err)
    console.log('[AUTH] profile:catch-using-fallback')

    if (user) {
      const fallbackProfile: AppUser = {
        id: user.uid,
        displayName:
          user.displayName ??
          user.email?.split('@')[0] ??
          'User',
        email: user.email ?? '',
        role: 'child',
        roleLabel: 'Filho',
        familyId: '',
        points: 0,
        accessStatus: 'released',
        isActive: true,
        createdAt: new Date(),
      }

      setAppUser(fallbackProfile)
      setProfileLoadError('Erro ao carregar perfil, usando fallback.')
    } else {
      setAppUser(null)
      setProfileLoadError(null)
    }
  } finally {
    console.log('[AUTH] state-change:before-setLoading-false')
    setLoading(false)
    console.log('[AUTH] state-change:end')
  }
})

return unsubscribe

}, [configured])

const signIn = async (email: string, password: string): Promise<void> => {
if (!configured || !auth) {
throw new Error('Firebase is not configured.')
}

try {
  console.log('[AUTH] login:attempt', { email })

  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  )

  console.log('[AUTH] login:success', {
    uid: userCredential.user.uid,
    email: userCredential.user.email,
  })
} catch (error) {
  console.error('[AUTH] login:error:full', error)

  const err = error as {
    code?: string
    message?: string
    customData?: unknown
  }

  console.error('[AUTH] login:error:code', err?.code)
  console.error('[AUTH] login:error:message', err?.message)
  console.error('[AUTH] login:error:customData', err?.customData)

  throw error
}

}

const signInDemo = async (userId: string) => {
if (configured) {
throw new Error('Demo login only in local mode')
}

providerSetCurrentDemoUser(userId)
const nextDemoUser = providerGetCurrentDemoUser()
if (nextDemoUser?.role === 'child') {
  console.log('[ACCESS] child-login:status', {
    childId: nextDemoUser.id,
    accessStatus: nextDemoUser.accessStatus,
    accessMode: nextDemoUser.accessMode ?? null,
    blockedReason: nextDemoUser.blockedReason ?? null,
    releaseReason: nextDemoUser.releaseReason ?? null,
  })
}
setAppUser(nextDemoUser)
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
  if (profile) {
    setAppUser(profile)
    setProfileLoadError(null)
  }
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

export function useAuth() {
const ctx = useContext(AuthContext)
if (!ctx) throw new Error('useAuth must be used within AuthProvider')
return ctx
}
