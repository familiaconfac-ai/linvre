import { initializeApp, deleteApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth, firebaseConfig, isFirebaseConfigured } from '../lib/firebase'
import { createUserProfile } from './users'
import type { AppUser } from '../types'

/**
 * Creates a Firebase Auth account and saves the AppUser doc to Firestore.
 * Use this when registering a new parent account.
 */
export async function registerUser(
  email: string,
  password: string,
  profile: Omit<AppUser, 'id'>,
): Promise<void> {
  if (!isFirebaseConfigured() || !auth) {
    throw new Error('Firebase não configurado para cadastro real.')
  }
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await createUserProfile({ ...profile, id: cred.user.uid })
}

/**
 * Registers a child account WITHOUT disrupting the currently logged-in parent session.
 * Uses a secondary Firebase app instance so the primary auth session is untouched.
 * No parent password needed.
 */
export async function registerChildUser(
  childEmail: string,
  childPassword: string,
  profile: Omit<AppUser, 'id'>,
): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase não configurado para cadastro de filho.')
  }
  const secondaryApp = initializeApp(firebaseConfig, `child_reg_${Date.now()}`)
  const secondaryAuth = getAuth(secondaryApp)
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, childEmail, childPassword)
    const childId = cred.user.uid
    await createUserProfile({ ...profile, id: childId })
    return childId
  } finally {
    await firebaseSignOut(secondaryAuth)
    await deleteApp(secondaryApp)
  }
}
