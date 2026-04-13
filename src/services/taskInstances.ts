import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  where,
  increment,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import type { Task, TaskInstance } from '../types'
import { todayKey } from '../utils/dateUtils'

export async function getTodayTaskInstancesByChild(
  childId: string,
  familyId: string,
  dateKey?: string,
): Promise<TaskInstance[]> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase não configurado.')
  }
  const key = dateKey ?? todayKey()
  const q = query(
    collection(db, 'taskInstances'),
    where('childId', '==', childId),
    where('familyId', '==', familyId),
    where('dateKey', '==', key),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskInstance)
}

export async function markTaskInstanceCompleted(
  instanceId: string,
  childId: string,
  pointsToAward: number,
  proofUrl?: string,
): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase não configurado.')
  }
  const updates: Record<string, unknown> = {
    status: 'completed',
    completedAt: serverTimestamp(),
    pointsAwarded: pointsToAward,
  }
  if (proofUrl) updates.proofUrl = proofUrl
  await updateDoc(doc(db, 'taskInstances', instanceId), updates)
  if (pointsToAward > 0) {
    await updateDoc(doc(db, 'users', childId), { points: increment(pointsToAward) })
  }
}

export async function markTaskInstanceWaitingApproval(
  instanceId: string,
  proofUrl?: string,
): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase não configurado.')
  }
  const updates: Record<string, unknown> = {
    status: 'waiting_approval',
    completedAt: serverTimestamp(),
  }
  if (proofUrl) updates.proofUrl = proofUrl
  await updateDoc(doc(db, 'taskInstances', instanceId), updates)
}

export async function approveTaskInstance(
  instanceId: string,
  approvedBy: string,
  pointsAwarded: number,
  childId: string,
): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase não configurado.')
  }
  await updateDoc(doc(db, 'taskInstances', instanceId), {
    status: 'completed',
    approvedAt: serverTimestamp(),
    approvedBy,
    pointsAwarded,
  })
  if (pointsAwarded > 0) {
    await updateDoc(doc(db, 'users', childId), { points: increment(pointsAwarded) })
  }
}

/**
 * Idempotent: creates TaskInstances for today if they don't exist yet.
 * Call this on dashboard load — acts as a lightweight daily scheduler.
 */
export async function ensureDailyInstances(
  childId: string,
  familyId: string,
  tasks: Task[],
  dateKey?: string,
): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase não configurado.')
  }
  const firestore = db
  const key = dateKey ?? todayKey()
  const existing = await getTodayTaskInstancesByChild(childId, familyId, key)
  const existingTaskIds = new Set(existing.map((i) => i.taskId))

  const toCreate = tasks.filter((t) => t.active && !existingTaskIds.has(t.id))

  await Promise.all(
    toCreate.map((task) =>
      addDoc(collection(firestore, 'taskInstances'), {
        familyId,
        childId,
        taskId: task.id,
        dateKey: key,
        status: 'pending',
        createdAt: serverTimestamp(),
      }),
    ),
  )
}
