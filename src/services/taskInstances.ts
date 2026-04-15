import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import type { Task, TaskInstance } from '../types'
import {
  dateAtTime,
  eachDateInRange,
  endOfWeekKey,
  fromDateKey,
  startOfWeekKey,
  toDateKey,
  todayKey,
} from '../utils/dateUtils'
import { getCurrentUserProfile } from './users'
import { getTasksByChild } from './tasks'

function assertFirestore() {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase nao configurado.')
  }

  return db
}

function normalizeInstanceDateKey(dateKey: string): string {
  return toDateKey(fromDateKey(dateKey))
}

function buildInstanceSignature(taskId: string, dateKey: string): string {
  return `${taskId}:${normalizeInstanceDateKey(dateKey)}`
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (
    typeof value === 'object' &&
    value &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate()
  }
  return null
}

function resolveTaskAnchorDate(task: Task): Date {
  return toDate(task.createdAt) ?? new Date()
}

function resolveWeeklyDays(task: Task): number[] {
  if (task.weeklyDays && task.weeklyDays.length > 0) {
    return task.weeklyDays
  }

  // Backward compatibility for existing weekly tasks created before weekday configuration existed.
  return [resolveTaskAnchorDate(task).getUTCDay()]
}

function resolveMonthlyDays(task: Task): number[] {
  if (task.monthlyDays && task.monthlyDays.length > 0) {
    return task.monthlyDays
  }

  return [resolveTaskAnchorDate(task).getUTCDate()]
}

function shouldCreateInstanceForDate(task: Task, date: Date): boolean {
  switch (task.frequency) {
    case 'daily':
      return true
    case 'weekly':
      return resolveWeeklyDays(task).includes(date.getUTCDay())
    case 'monthly':
      return resolveMonthlyDays(task).includes(date.getUTCDate())
    case 'one_time':
      if (!task.oneTimeDate) return false
      return normalizeInstanceDateKey(task.oneTimeDate) === toDateKey(date)
    default:
      return false
  }
}

function buildDueAt(task: Task, dateKey: string): Date {
  return dateAtTime(dateKey, task.dueTime ?? '23:59')
}

function buildScheduledFor(dateKey: string): Date {
  return dateAtTime(dateKey, '00:00')
}

function sortInstancesByDate(a: TaskInstance, b: TaskInstance): number {
  if (a.dateKey !== b.dateKey) {
    return a.dateKey.localeCompare(b.dateKey)
  }

  return a.taskId.localeCompare(b.taskId)
}

export async function getTaskInstancesByChildPeriod(
  childId: string,
  familyId: string,
  startKey: string,
  endKey: string,
): Promise<TaskInstance[]> {
  const firestore = assertFirestore()
  const q = query(collection(firestore, 'taskInstances'), where('familyId', '==', familyId))
  const snap = await getDocs(q)

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as TaskInstance)
    .filter(
      (instance) =>
        instance.childId === childId &&
        instance.familyId === familyId &&
        instance.dateKey >= startKey &&
        instance.dateKey <= endKey,
    )
    .sort(sortInstancesByDate)
}

export async function getTodayTaskInstancesByChild(
  childId: string,
  familyId: string,
  dateKey?: string,
): Promise<TaskInstance[]> {
  const key = dateKey ?? todayKey()
  return getTaskInstancesByChildPeriod(childId, familyId, key, key)
}

export async function getWeekTaskInstancesByChild(
  childId: string,
  familyId: string,
  startKey: string,
  endKey: string,
): Promise<TaskInstance[]> {
  return getTaskInstancesByChildPeriod(childId, familyId, startKey, endKey)
}

export async function markTaskInstanceCompleted(
  instanceId: string,
  childId: string,
  pointsToAward: number,
  proofUrl?: string,
): Promise<void> {
  const firestore = assertFirestore()
  const updates: Record<string, unknown> = {
    status: 'completed',
    completedAt: serverTimestamp(),
    pointsAwarded: pointsToAward,
  }
  if (proofUrl) {
    updates.proofUrl = proofUrl
    updates.proofPhotoUrl = proofUrl
  }
  await updateDoc(doc(firestore, 'taskInstances', instanceId), updates)
  if (pointsToAward > 0) {
    await updateDoc(doc(firestore, 'users', childId), { points: increment(pointsToAward) })
  }
}

export async function markTaskInstanceWaitingApproval(
  instanceId: string,
  proofUrl?: string,
): Promise<void> {
  const firestore = assertFirestore()
  const updates: Record<string, unknown> = {
    status: 'waiting_approval',
    completedAt: serverTimestamp(),
  }
  if (proofUrl) {
    updates.proofUrl = proofUrl
    updates.proofPhotoUrl = proofUrl
  }
  await updateDoc(doc(firestore, 'taskInstances', instanceId), updates)
}

export async function markTaskInstanceIssueReported(
  instanceId: string,
  issuePhotoUrl: string,
  issueDescription?: string,
  reportedByUserId?: string,
  reportedByName?: string,
  reportedByRole?: 'parent' | 'child',
): Promise<void> {
  const firestore = assertFirestore()
  const updates: Record<string, unknown> = {
    status: 'issue_reported',
    issuePhotoUrl,
    createdByParent: true,
    isManualIssue: true,
  }
  if (issueDescription?.trim()) {
    updates.issueDescription = issueDescription.trim()
  }
  if (reportedByUserId) {
    updates.reportedByUserId = reportedByUserId
  }
  if (reportedByName) {
    updates.reportedByName = reportedByName
  }
  if (reportedByRole) {
    updates.reportedByRole = reportedByRole
    updates.createdByParent = reportedByRole === 'parent'
  } else {
    updates.reportedByRole = 'parent'
    updates.createdByParent = true
  }
  await updateDoc(doc(firestore, 'taskInstances', instanceId), updates)
}

export async function approveTaskInstance(
  instanceId: string,
  approvedBy: string,
  pointsAwarded: number,
  childId: string,
): Promise<void> {
  const firestore = assertFirestore()
  await updateDoc(doc(firestore, 'taskInstances', instanceId), {
    status: 'completed',
    approvedAt: serverTimestamp(),
    approvedBy,
    pointsAwarded,
  })
  if (pointsAwarded > 0) {
    await updateDoc(doc(firestore, 'users', childId), { points: increment(pointsAwarded) })
  }
}

export async function ensureTaskInstancesForChildPeriod(
  childId: string,
  startDate: Date,
  endDate: Date,
): Promise<void> {
  const firestore = assertFirestore()

  console.log('[INSTANCES] ensure:start', {
    childId,
    startDate: toDateKey(startDate),
    endDate: toDateKey(endDate),
  })

  try {
    const child = await getCurrentUserProfile(childId)

    if (!child) {
      throw new Error(`Child profile not found for "${childId}"`)
    }

    const [tasks, existingInstances] = await Promise.all([
      getTasksByChild(child.id, child.familyId),
      getTaskInstancesByChildPeriod(child.id, child.familyId, toDateKey(startDate), toDateKey(endDate)),
    ])

    const existingSignatures = new Set(
      existingInstances.map((instance) => buildInstanceSignature(instance.taskId, instance.dateKey)),
    )

    const dates = eachDateInRange(startDate, endDate)

    for (const task of tasks) {
      console.log('[INSTANCES] ensure:task', {
        childId,
        taskId: task.id,
        frequency: task.frequency,
        weeklyDays: task.weeklyDays ?? [],
        monthlyDays: task.monthlyDays ?? [],
        oneTimeDate: task.oneTimeDate ?? null,
      })

      for (const date of dates) {
        if (!shouldCreateInstanceForDate(task, date)) {
          continue
        }

        const dateKey = toDateKey(date)
        const signature = buildInstanceSignature(task.id, dateKey)

        if (existingSignatures.has(signature)) {
          console.log('[INSTANCES] ensure:skip-existing', {
            childId,
            taskId: task.id,
            dateKey,
          })
          continue
        }

        const scheduledFor = buildScheduledFor(dateKey)
        const dueAt = buildDueAt(task, dateKey)

        console.log('[INSTANCES] ensure:create', {
          childId,
          familyId: child.familyId,
          taskId: task.id,
          dateKey,
          scheduledFor,
          dueAt,
        })

        await addDoc(collection(firestore, 'taskInstances'), {
          familyId: child.familyId,
          childId: child.id,
          taskId: task.id,
          dateKey,
          scheduledFor,
          dueAt,
          status: 'pending',
          createdAt: serverTimestamp(),
        })

        existingSignatures.add(signature)
      }
    }
  } catch (error) {
    console.error('[INSTANCES] ensure:error', error)
    throw error
  }
}

/**
 * Backwards-compatible wrapper used by current screens that only need the current date.
 */
export async function ensureDailyInstances(
  childId: string,
  _familyId: string,
  _tasks: Task[],
  dateKey?: string,
): Promise<void> {
  const targetDate = fromDateKey(dateKey ?? todayKey())
  await ensureTaskInstancesForChildPeriod(childId, targetDate, targetDate)
}

export async function ensureCurrentWeekInstancesForChild(childId: string): Promise<void> {
  const startDate = fromDateKey(startOfWeekKey())
  const endDate = fromDateKey(endOfWeekKey())
  await ensureTaskInstancesForChildPeriod(childId, startDate, endDate)
}
