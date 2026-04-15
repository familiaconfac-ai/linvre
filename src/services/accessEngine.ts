import type { Task, TaskInstance, AppUser, AccessSummary, ResolvedAccessStatus } from '../types'
import { endOfMonthKey, fromDateKey, startOfMonthKey, todayKey } from '../utils/dateUtils'
import {
  ensureTaskInstancesForChildPeriod,
  getTaskInstancesByChildPeriod,
  getTodayTaskInstancesByChild,
} from './taskInstances'
import { getTasksByChild } from './tasks'
import { getCurrentUserProfile, updateUserAccessStatus } from './users'

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
    return ((value as { toDate: () => Date }).toDate())
  }
  return null
}

function getTaskDueDate(task: Task, instance: TaskInstance | undefined): Date {
  const instanceDueAt = toDate(instance?.dueAt)
  if (instanceDueAt) {
    return instanceDueAt
  }

  const dueTime = task.dueTime ?? '23:59'
  const dueDateKey =
    instance?.dateKey ?? todayKey()

  return new Date(`${dueDateKey}T${dueTime}:00`)
}

function compareInstances(a: TaskInstance, b: TaskInstance): number {
  if (a.dateKey !== b.dateKey) {
    return a.dateKey.localeCompare(b.dateKey)
  }

  const aCreatedAt =
    a.createdAt instanceof Date ? a.createdAt.getTime() : a.completedAt instanceof Date ? a.completedAt.getTime() : 0
  const bCreatedAt =
    b.createdAt instanceof Date ? b.createdAt.getTime() : b.completedAt instanceof Date ? b.completedAt.getTime() : 0

  return aCreatedAt - bCreatedAt
}

function mapLatestInstancesByTask(instances: TaskInstance[]): Map<string, TaskInstance> {
  const latestByTask = new Map<string, TaskInstance>()

  instances.forEach((instance) => {
    const previous = latestByTask.get(instance.taskId)
    if (!previous || compareInstances(previous, instance) < 0) {
      latestByTask.set(instance.taskId, instance)
    }
  })

  return latestByTask
}

function dedupeInstances(instances: TaskInstance[]): TaskInstance[] {
  const byId = new Map<string, TaskInstance>()

  instances.forEach((instance) => {
    if (!byId.has(instance.id)) {
      byId.set(instance.id, instance)
    }
  })

  return [...byId.values()]
}

function summarizeAccess(tasks: Task[], instances: TaskInstance[]): AccessSummary {
  const mandatoryTasks = tasks.filter((task) => task.active && task.category === 'mandatory')
  const latestInstancesByTask = mapLatestInstancesByTask(instances)

  const completedMandatory = mandatoryTasks.filter(
    (task) => latestInstancesByTask.get(task.id)?.status === 'completed',
  ).length

  const openRecovery = mandatoryTasks.some((task) => {
    const instance = latestInstancesByTask.get(task.id)
    if (!instance) return false

    const isRecoveryTask = Boolean(task.isManualIssue || instance.isManualIssue || instance.status === 'issue_reported')
    const isOpen = instance.status !== 'completed' && instance.status !== 'skipped'

    return isRecoveryTask && isOpen
  })

  const hasOverdueMandatory = mandatoryTasks.some((task) => {
    const instance = latestInstancesByTask.get(task.id)
    if (instance?.status === 'completed') return false
    return getTaskDueDate(task, instance).getTime() <= Date.now()
  })

  let accessStatus: AppUser['accessStatus']
  if (openRecovery) {
    accessStatus = 'recovery_pending'
  } else if (mandatoryTasks.length === 0 || completedMandatory === mandatoryTasks.length) {
    accessStatus = 'released'
  } else if (hasOverdueMandatory) {
    accessStatus = 'blocked'
  } else {
    accessStatus = 'released'
  }

  const pendingMandatory = Math.max(mandatoryTasks.length - completedMandatory, 0)
  const progressPercent =
    mandatoryTasks.length > 0 ? Math.round((completedMandatory / mandatoryTasks.length) * 100) : 100

  return {
    totalMandatory: mandatoryTasks.length,
    completedMandatory,
    pendingMandatory,
    progressPercent,
    accessStatus,
  }
}

async function loadAccessInputs(childId: string) {
  const child = await getCurrentUserProfile(childId)

  if (!child) {
    throw new Error(`Child profile not found for "${childId}"`)
  }

  if (child.role !== 'child') {
    throw new Error(`User "${childId}" is not a child profile`)
  }

  const monthStart = startOfMonthKey()
  const monthEnd = endOfMonthKey()

  await ensureTaskInstancesForChildPeriod(child.id, fromDateKey(monthStart), fromDateKey(monthEnd))

  const [tasks, todayInstances, periodInstances] = await Promise.all([
    getTasksByChild(child.id, child.familyId),
    getTodayTaskInstancesByChild(child.id, child.familyId),
    getTaskInstancesByChildPeriod(child.id, child.familyId, monthStart, monthEnd),
  ])

  const relevantInstances = dedupeInstances([...periodInstances, ...todayInstances])
  const summary = summarizeAccess(tasks, relevantInstances)

  return {
    child,
    tasks,
    relevantInstances,
    summary,
  }
}

// Core calculation used by current UI summary cards.
export function computeAccessStatus(
  instances: TaskInstance[],
  tasks: Task[],
): AccessSummary {
  return summarizeAccess(tasks, instances)
}

export async function recalculateChildAccess(
  childId: string,
): Promise<ResolvedAccessStatus> {
  console.log('[ACCESS] recalculate:start', { childId })

  try {
    const { child, tasks, relevantInstances, summary } = await loadAccessInputs(childId)

    console.log('[ACCESS] recalculate:instances', {
      childId,
      familyId: child.familyId,
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        category: task.category,
        frequency: task.frequency,
        isManualIssue: task.isManualIssue ?? false,
      })),
      instances: relevantInstances.map((instance) => ({
        id: instance.id,
        taskId: instance.taskId,
        dateKey: instance.dateKey,
        status: instance.status,
        isManualIssue: instance.isManualIssue ?? false,
      })),
    })

    console.log('[ACCESS] recalculate:result', {
      childId,
      familyId: child.familyId,
      status: summary.accessStatus,
      totalMandatory: summary.totalMandatory,
      completedMandatory: summary.completedMandatory,
      pendingMandatory: summary.pendingMandatory,
      progressPercent: summary.progressPercent,
    })

    console.log('[ACCESS] recalculate:update-user', {
      childId,
      accessStatus: summary.accessStatus,
    })
    await updateUserAccessStatus(childId, summary.accessStatus)

    return summary.accessStatus as ResolvedAccessStatus
  } catch (error) {
    console.error('[ACCESS] recalculate:error', error)
    throw error
  }
}

/**
 * Backwards-compatible wrapper used by the current UI.
 * Keeps returning a summary while delegating the canonical status calculation to recalculateChildAccess.
 */
export async function recalculateChildAccessStatus(
  childId: string,
  _familyId: string,
): Promise<AccessSummary> {
  const { summary } = await loadAccessInputs(childId)
  await updateUserAccessStatus(childId, summary.accessStatus)
  return summary
}
