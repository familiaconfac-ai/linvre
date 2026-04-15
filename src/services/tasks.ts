import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import type { Task } from '../types'

export async function getTasksByChild(
  childId: string,
  familyId: string,
): Promise<Task[]> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase nao configurado.')
  }

  // Avoid composite-index dependency on first dashboard load by querying only by familyId
  // and applying the child/active filters plus sort locally.
  const q = query(collection(db, 'tasks'), where('familyId', '==', familyId))
  const snap = await getDocs(q)

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Task)
    .filter((task) => task.childId === childId && task.active)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

/**
 * Fetches ALL tasks (active and inactive) for a child. Used in management screens.
 * Sorts client-side to avoid requiring an extra composite index.
 */
export async function getAllTasksByChild(
  childId: string,
  familyId: string,
): Promise<Task[]> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase nao configurado.')
  }

  const q = query(collection(db, 'tasks'), where('familyId', '==', familyId))
  const snap = await getDocs(q)

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Task)
    .filter((task) => task.familyId === familyId && task.childId === childId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

export async function createTask(task: Omit<Task, 'id'>): Promise<string> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase nao configurado.')
  }
  const ref = await addDoc(collection(db, 'tasks'), {
    ...task,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase nao configurado.')
  }
  await updateDoc(doc(db, 'tasks', taskId), updates as Record<string, unknown>)
}
