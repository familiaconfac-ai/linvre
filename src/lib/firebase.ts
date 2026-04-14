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
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain)
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
    console.log('[FIREBASE] initialize:start')
    app = initializeApp(firebaseConfig)
    authInstance = getAuth(app)
    dbInstance = getFirestore(app)
    storageInstance = getStorage(app)
    console.log('[FIREBASE] initialize:success', {
      projectId: firebaseConfig.projectId,
      hasDb: Boolean(dbInstance),
      hasAuth: Boolean(authInstance),
      hasStorage: Boolean(storageInstance),
    })
  } catch (err) {
    console.warn('[FIREBASE] initialize:failed', err)
  }
}

export const auth = authInstance
export const db = dbInstance
export const storage = storageInstance
