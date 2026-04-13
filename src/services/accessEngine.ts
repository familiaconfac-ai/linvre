import type { Task, TaskInstance, AppUser, AccessSummary } from '../types'
import { updateUserAccessStatus } from './users'
import { getTodayTaskInstancesByChild } from './taskInstances'
import { getTasksByChild } from './tasks'

// ─── Core calculation (pure, no side effects) ─────────────────────────────────

export function computeAccessStatus(
  instances: TaskInstance[],
  tasks: Task[],
): AccessSummary {
  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  // Only count instances whose task is active AND mandatory
  const mandatoryInstances = instances.filter(
    (i) => taskMap.get(i.taskId)?.category === 'mandatory',
  )

  const totalMandatory = mandatoryInstances.length
  // Formally approved/completed only
  const completedMandatory = mandatoryInstances.filter(
    (i) => i.status === 'completed',
  ).length
  // Child submitted, waiting parent approval
  const waitingApprovalMandatory = mandatoryInstances.filter(
    (i) => i.status === 'waiting_approval',
  ).length
  // Truly not yet submitted
  const pendingMandatory = totalMandatory - completedMandatory - waitingApprovalMandatory

  // Progress bar counts both completed and waiting_approval (child did their part)
  const doneForProgress = completedMandatory + waitingApprovalMandatory
  const progressPercent =
    totalMandatory > 0
      ? Math.round((doneForProgress / totalMandatory) * 100)
      : 100

  // Access release requires formal parent approval (completed status only)
  let accessStatus: AppUser['accessStatus']
  if (totalMandatory === 0) {
    // No mandatory tasks → child is free
    accessStatus = 'released'
  } else if (completedMandatory === totalMandatory) {
    // All mandatory tasks approved
    accessStatus = 'released'
  } else if (doneForProgress === 0) {
    // Nothing done yet
    accessStatus = 'blocked'
  } else {
    // Some done or waiting approval
    accessStatus = 'partial'
  }

  return { totalMandatory, completedMandatory, pendingMandatory, progressPercent, accessStatus }
}

// ─── Firestore recalculation ──────────────────────────────────────────────────

/**
 * Reads current task instances + tasks, computes the access status,
 * and persists it to the user document.
 */
export async function recalculateChildAccessStatus(
  childId: string,
  familyId: string,
): Promise<AccessSummary> {
  const [instances, tasks] = await Promise.all([
    getTodayTaskInstancesByChild(childId, familyId),
    getTasksByChild(childId, familyId),
  ])

  const summary = computeAccessStatus(instances, tasks)
  await updateUserAccessStatus(childId, summary.accessStatus)

  return summary
}
