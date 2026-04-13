import { arrayUnion, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import type { Family } from '../types'

export async function getFamily(familyId: string): Promise<Family | null> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase não configurado.')
  }
  const snap = await getDoc(doc(db, 'families', familyId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Family
}

export async function createFamily(family: Family): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase não configurado.')
  }
  await setDoc(doc(db, 'families', family.id), family)
}

export async function addChildToFamily(familyId: string, childId: string): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase não configurado.')
  }
  await updateDoc(doc(db, 'families', familyId), {
    childrenIds: arrayUnion(childId),
  })
}
