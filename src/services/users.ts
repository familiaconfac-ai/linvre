import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import type { AppUser } from '../types'

export async function getCurrentUserProfile(uid: string): Promise<AppUser | null> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase is not configured')
  }
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as AppUser
  } catch (err) {
    console.error('Error getting user profile:', err)
    throw err
  }
}

export async function createUserProfile(user: AppUser): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase is not configured')
  }
  try {
    await setDoc(doc(db, 'users', user.id), user)
  } catch (err) {
    console.error('Error creating user profile:', err)
    throw err
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<AppUser>,
): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase is not configured')
  }
  try {
    await updateDoc(doc(db, 'users', userId), updates as Record<string, unknown>)
  } catch (err) {
    console.error('Error updating user profile:', err)
    throw err
  }
}

export async function getFamilyChildren(familyId: string): Promise<AppUser[]> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase is not configured')
  }
  try {
    const q = query(
      collection(db, 'users'),
      where('familyId', '==', familyId),
      where('role', '==', 'child'),
      where('isActive', '==', true),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppUser)
  } catch (err) {
    console.error('Error getting family children:', err)
    throw err
  }
}

export async function updateUserAccessStatus(
  userId: string,
  accessStatus: AppUser['accessStatus'],
  points?: number,
): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase is not configured')
  }
  try {
    const updates: Record<string, unknown> = { accessStatus }
    if (points !== undefined) updates.points = points
    await updateDoc(doc(db, 'users', userId), updates)
  } catch (err) {
    console.error('Error updating user access status:', err)
    throw err
  }
}
