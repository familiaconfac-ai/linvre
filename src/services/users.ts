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
import type { AppUser, ChildAccessEvaluation } from '../types'

function normalizeFirestoreError(err: unknown): Error {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: unknown }).code) : ''
  const message =
    typeof err === 'object' && err && 'message' in err
      ? String((err as { message?: unknown }).message)
      : 'Erro desconhecido do Firestore'

  if (code === 'unavailable' || message.toLowerCase().includes('offline')) {
    return new Error('firestore-offline')
  }

  if (code === 'permission-denied') {
    return new Error('firestore-permission-denied')
  }

  return new Error(message)
}

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
    throw normalizeFirestoreError(err)
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
    throw normalizeFirestoreError(err)
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
    throw normalizeFirestoreError(err)
  }
}

export async function getFamilyChildren(familyId: string): Promise<AppUser[]> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase is not configured')
  }

  console.log('[CHILDREN] dependency-check', {
    hasFamilyId: Boolean(familyId),
    familyId: familyId || null,
  })

  if (!familyId) {
    console.log('[CHILDREN] load:aborted-no-familyId')
    return []
  }

  try {
    console.log('[CHILDREN] query:path', {
      collection: 'users',
      documentPattern: 'users/{userId}',
    })

    console.log('[CHILDREN] query:filters', {
      firestore: [{ field: 'familyId', op: '==', value: familyId }],
      client: [
        { field: 'role', op: '==', value: 'child' },
        { field: 'isActive', op: '==', value: true },
      ],
    })

    const q = query(collection(db, 'users'), where('familyId', '==', familyId))
    const snap = await getDocs(q)
    const children = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as AppUser)
      .filter((user) => user.role === 'child' && user.isActive)

    console.log('[CHILDREN] query:success', {
      count: children.length,
      docs: children.map((child) => ({ ...child })),
    })

    return children
  } catch (err) {
    console.error('[CHILDREN] query:error', err)
    const firestoreError = err as {
      code?: string
      message?: string
    }
    console.error('[CHILDREN] query:error:code', firestoreError?.code)
    console.error('[CHILDREN] query:error:message', firestoreError?.message)
    console.error('Error getting family children:', err)
    throw normalizeFirestoreError(err)
  }
}

export async function updateUserAccessStatus(
  userId: string,
  access: AppUser['accessStatus'] | ChildAccessEvaluation,
  points?: number,
): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase is not configured')
  }

  try {
    const updates: Record<string, unknown> =
      typeof access === 'string'
        ? { accessStatus: access }
        : {
            accessStatus: access.accessStatus,
            accessMode: access.accessMode,
            blockedReason: access.blockedReason,
            releaseReason: access.releaseReason,
          }
    if (points !== undefined) updates.points = points
    await updateDoc(doc(db, 'users', userId), updates)
  } catch (err) {
    console.error('Error updating user access status:', err)
    throw normalizeFirestoreError(err)
  }
}
