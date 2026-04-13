import { isFirebaseConfigured } from '../lib/firebase'
import type { AppUser, Task, TaskInstance } from '../types'
import { getCurrentUserProfile, getFamilyChildren } from './users'
import { createTask, getAllTasksByChild, getTasksByChild, updateTask } from './tasks'
import {
  approveTaskInstance,
  ensureDailyInstances,
  getTodayTaskInstancesByChild,
  markTaskInstanceCompleted,
  markTaskInstanceIssueReported,
  markTaskInstanceWaitingApproval,
} from './taskInstances'
import { recalculateChildAccessStatus } from './accessEngine'
import { uploadTaskProof } from './storage'
import {
  approveTaskInstanceDemo,
  clearCurrentDemoUser,
  createTaskDemo,
  ensureDailyInstancesDemo,
  getAllTasksByChildDemo,
  getCurrentDemoUser,
  getDemoUserById,
  getDemoUsers,
  getFamilyChildrenDemo,
  getTasksByChildDemo,
  getTodayTaskInstancesByChildDemo,
  markTaskInstanceCompletedDemo,
  markTaskInstanceIssueReportedDemo,
  markTaskInstanceWaitingApprovalDemo,
  recalculateChildAccessStatusDemo,
  resetDemoData,
  setCurrentDemoUser,
  updateTaskDemo,
} from '../demo/demoStore'

export function isDemoMode() {
  return !isFirebaseConfigured()
}

export async function providerGetCurrentUserProfile(uid: string): Promise<AppUser | null> {
  if (isDemoMode()) return getDemoUserById(uid)
  return getCurrentUserProfile(uid)
}

export async function providerGetFamilyChildren(familyId: string): Promise<AppUser[]> {
  if (isDemoMode()) return getFamilyChildrenDemo(familyId)
  return getFamilyChildren(familyId)
}

export async function providerGetTasksByChild(childId: string, familyId: string): Promise<Task[]> {
  if (isDemoMode()) return getTasksByChildDemo(childId, familyId)
  return getTasksByChild(childId, familyId)
}

export async function providerGetAllTasksByChild(
  childId: string,
  familyId: string,
): Promise<Task[]> {
  if (isDemoMode()) return getAllTasksByChildDemo(childId, familyId)
  return getAllTasksByChild(childId, familyId)
}

export async function providerCreateTask(task: Omit<Task, 'id'>): Promise<string> {
  if (isDemoMode()) return createTaskDemo(task)
  return createTask(task)
}

export async function providerUpdateTask(taskId: string, updates: Partial<Task>): Promise<void> {
  if (isDemoMode()) {
    updateTaskDemo(taskId, updates)
    return
  }
  await updateTask(taskId, updates)
}

export async function providerGetTodayTaskInstancesByChild(
  childId: string,
  familyId: string,
  dateKey?: string,
): Promise<TaskInstance[]> {
  if (isDemoMode()) return getTodayTaskInstancesByChildDemo(childId, familyId, dateKey)
  return getTodayTaskInstancesByChild(childId, familyId, dateKey)
}

export async function providerEnsureDailyInstances(
  childId: string,
  familyId: string,
  tasks: Task[],
  dateKey?: string,
): Promise<void> {
  if (isDemoMode()) {
    ensureDailyInstancesDemo(childId, familyId, tasks, dateKey)
    return
  }
  await ensureDailyInstances(childId, familyId, tasks, dateKey)
}

export async function providerMarkTaskInstanceCompleted(
  instanceId: string,
  childId: string,
  pointsToAward: number,
  proofUrl?: string,
): Promise<void> {
  if (isDemoMode()) {
    markTaskInstanceCompletedDemo(instanceId, childId, pointsToAward, proofUrl)
    return
  }
  await markTaskInstanceCompleted(instanceId, childId, pointsToAward, proofUrl)
}

export async function providerMarkTaskInstanceWaitingApproval(
  instanceId: string,
  proofUrl?: string,
): Promise<void> {
  if (isDemoMode()) {
    markTaskInstanceWaitingApprovalDemo(instanceId, proofUrl)
    return
  }
  await markTaskInstanceWaitingApproval(instanceId, proofUrl)
}

export async function providerMarkTaskInstanceIssueReported(
  instanceId: string,
  issuePhotoUrl: string,
  issueDescription?: string,
): Promise<void> {
  if (isDemoMode()) {
    markTaskInstanceIssueReportedDemo(instanceId, issuePhotoUrl, issueDescription)
    return
  }
  await markTaskInstanceIssueReported(instanceId, issuePhotoUrl, issueDescription)
}

export async function providerApproveTaskInstance(
  instanceId: string,
  approvedBy: string,
  pointsAwarded: number,
  childId: string,
): Promise<void> {
  if (isDemoMode()) {
    approveTaskInstanceDemo(instanceId, approvedBy, pointsAwarded, childId)
    return
  }
  await approveTaskInstance(instanceId, approvedBy, pointsAwarded, childId)
}

export async function providerRecalculateChildAccessStatus(
  childId: string,
  familyId: string,
) {
  if (isDemoMode()) return recalculateChildAccessStatusDemo(childId, familyId)
  return recalculateChildAccessStatus(childId, familyId)
}

export function providerGetDemoUsers() {
  return getDemoUsers()
}

export function providerGetCurrentDemoUser() {
  return getCurrentDemoUser()
}

export function providerSetCurrentDemoUser(userId: string) {
  setCurrentDemoUser(userId)
}

export function providerClearCurrentDemoUser() {
  clearCurrentDemoUser()
}

export function providerResetDemoData() {
  resetDemoData()
}

export async function providerUploadTaskProof(params: {
  familyId: string
  childId: string
  taskId: string
  file: File
}) {
  if (isDemoMode()) {
    throw new Error('Upload de arquivo não está habilitado no modo demo.')
  }
  return uploadTaskProof(params)
}
