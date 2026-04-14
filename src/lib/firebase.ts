import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.authDomain
  )
}

console.log('[FIREBASE] config-check', {
  hasApiKey: Boolean(firebaseConfig.apiKey),
  apiKeyPrefix: firebaseConfig.apiKey?.slice(0, 8) || '',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  configured: isFirebaseConfigured(),
})

let app: ReturnType<typeof initializeApp> | null = null
let authInstance: ReturnType<typeof getAuth> | null = null
let dbInstance: ReturnType<typeof getFirestore> | null = null
let storageInstance: ReturnType<typeof getStorage> | null = null

if (isFirebaseConfigured()) {
  try {
    console.log('[FIREBASE] initialize:start', {
      online: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
    })

    app = initializeApp(firebaseConfig)

    console.log('[FIREBASE] initialize:app-created', {
      projectId: firebaseConfig.projectId,
      appName: app.name,
    })

    authInstance = getAuth(app)

    console.log('[FIREBASE] initialize:auth-created', {
      hasAuth: Boolean(authInstance),
    })

    console.log('[FIREBASE] initialize:db-start')
    dbInstance = getFirestore(app)
    console.log('[FIREBASE] initialize:db-created', {
      hasDb: Boolean(dbInstance),
      transport: 'default',
      cache: 'default',
    })

    storageInstance = getStorage(app)

    console.log('[FIREBASE] initialize:storage-created', {
      hasStorage: Boolean(storageInstance),
    })
  } catch (err) {
    console.warn('[FIREBASE] initialize:failed', err)
  }
}

export const auth = authInstance
export const db = dbInstance
export const storage = storageInstance