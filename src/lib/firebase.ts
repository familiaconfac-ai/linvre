import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Copy .env.example to .env and fill with your Firebase project credentials.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

/** Check if Firebase is properly configured */
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.authDomain
  )
}
console.log('apiKey exists?', !!firebaseConfig.apiKey)
console.log('apiKey prefix:', firebaseConfig.apiKey?.slice(0, 8))
console.log('authDomain:', firebaseConfig.authDomain)
console.log('projectId:', firebaseConfig.projectId)
let app: ReturnType<typeof initializeApp> | null = null
let authInstance: ReturnType<typeof getAuth> | null = null
let dbInstance: ReturnType<typeof getFirestore> | null = null
let storageInstance: ReturnType<typeof getStorage> | null = null

// Initialize only if properly configured
if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig)
    authInstance = getAuth(app)
    dbInstance = getFirestore(app)
    storageInstance = getStorage(app)

    // Enable offline persistence for Firestore
    // This helps with offline scenarios
    if (dbInstance) {
      // Note: enableNetwork/disableNetwork can be used to manually control connectivity
      // but for now we'll rely on automatic handling
    }
  } catch (err) {
    console.warn('Firebase initialization failed:', err)
  }
}

// Export safe instances (may be null in local mode)
export const auth = authInstance
export const db = dbInstance
export const storage = storageInstance

