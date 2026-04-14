import type { AppUser, Task, TaskInstance } from '../types'
import { todayKey } from '../utils/dateUtils'
import { computeAccessStatus } from '../services/accessEngine'
import { createInitialDemoStore, type DemoStoreData } from './demoData'

const STORE_KEY = 'link-livre-demo-store-v1'
const SESSION_KEY = 'link-livre-demo-session-v1'

interface DemoSession {
  currentUserId: string | null
}

function saveStore(store: DemoStoreData) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

function isOutdatedSeed(store: DemoStoreData): boolean {
  const expectedFamily = 'Família Martins'
  const expectedNames = [
    'Márcio Martins',
    'Conceição Martins',
    'Laura Martins',
    'Arthur Martins',
    'Eric Martins',
    'Levi Martins',
  ]

  if (store.family?.familyName !== expectedFamily) return true

  const names = store.users.map((u) => u.displayName)
  return expectedNames.some((name) => !names.includes(name))
}

export function getDemoStore(): DemoStoreData {
  const raw = localStorage.getItem(STORE_KEY)
  if (!raw) {
    const initial = createInitialDemoStore()
    saveStore(initial)
    return initial
  }
  try {
    const parsed = JSON.parse(raw) as DemoStoreData
    if (isOutdatedSeed(parsed)) {
      const initial = createInitialDemoStore()
      saveStore(initial)
      return initial
    }
    return parsed
  } catch {
    const initial = createInitialDemoStore()
    saveStore(initial)
    return initial
  }
}

function updateStore(mutator: (store: DemoStoreData) => DemoStoreData): DemoStoreData {
  const current = getDemoStore()
  const next = mutator(current)
  saveStore(next)
  return next
}

function getSession(): DemoSession {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return { currentUserId: null }
  try {
    return JSON.parse(raw) as DemoSession
  } catch {
    return { currentUserId: null }
  }
}

function saveSession(session: DemoSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function getDemoUsers(): AppUser[] {
  return getDemoStore().users.filter((u) => u.isActive)
}

export function getDemoUserById(userId: string): AppUser | null {
  const store = getDemoStore()
  return store.users.find((u) => u.id === userId) ?? null
}

export function getCurrentDemoUser(): AppUser | null {
  const session = getSession()
  if (!session.currentUserId) return null
  return getDemoUserById(session.currentUserId)
}

export function setCurrentDemoUser(userId: string) {
  saveSession({ currentUserId: userId })
}

export function clearCurrentDemoUser() {
  saveSession({ currentUserId: null })
}

export function resetDemoData() {
  const initial = createInitialDemoStore()
  saveStore(initial)
  saveSession({ currentUserId: null })
}

export function getFamilyChildrenDemo(familyId: string): AppUser[] {
  const store = getDemoStore()
  return store.users.filter((u) => u.familyId === familyId && u.role === 'child' && u.isActive)
}

export function getTasksByChildDemo(childId: string, familyId: string): Task[] {
  const store = getDemoStore()
  return store.tasks
    .filter((t) => t.childId === childId && t.familyId === familyId && t.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getAllTasksByChildDemo(childId: string, familyId: string): Task[] {
  const store = getDemoStore()
  return store.tasks
    .filter((t) => t.childId === childId && t.familyId === familyId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function createTaskDemo(task: Omit<Task, 'id'>): string {
  const createdIds: string[] = []

  const updated = updateStore((store) => {
    const key = todayKey()

    const targetChildIds = task.appliesToAllChildren
      ? store.users
          .filter((u) => u.familyId === task.familyId && u.role === 'child' && u.isActive)
          .map((u) => u.id)
      : task.appliesToUserIds && task.appliesToUserIds.length > 0
      ? task.appliesToUserIds
      : [task.childId]

    const nextTasks: Task[] = []
    const nextInstances: TaskInstance[] = []

    targetChildIds.forEach((targetChildId) => {
      const id = `task-demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      createdIds.push(id)
      const nextTask: Task = {
        ...task,
        id,
        childId: targetChildId,
        appliesToUserIds: [targetChildId],
      }
      nextTasks.push(nextTask)

      if (task.active) {
        nextInstances.push({
          id: `inst-${id}-${key}`,
          familyId: task.familyId,
          childId: targetChildId,
          taskId: id,
          dateKey: key,
          status: 'pending',
          createdAt: new Date(),
        })
      }
    })

    return {
      ...store,
      tasks: [...store.tasks, ...nextTasks],
      taskInstances: [...store.taskInstances, ...nextInstances],
    }
  })

  const affectedChildren = new Set(
    updated.tasks
      .filter((t) => createdIds.includes(t.id))
      .map((t) => t.childId),
  )

  affectedChildren.forEach((childId) => {
    recalculateChildAccessStatusDemo(childId, task.familyId)
  })

  return createdIds[0]
}

export function updateTaskDemo(taskId: string, updates: Partial<Task>) {
  const updated = updateStore((store) => ({
    ...store,
    tasks: store.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
  }))

  const task = updated.tasks.find((t) => t.id === taskId)
  if (task) {
    recalculateChildAccessStatusDemo(task.childId, task.familyId)
  }
}

export function getTodayTaskInstancesByChildDemo(
  childId: string,
  familyId: string,
  dateKey?: string,
): TaskInstance[] {
  const key = dateKey ?? todayKey()
  const store = getDemoStore()
  return store.taskInstances.filter(
    (i) => i.childId === childId && i.familyId === familyId && i.dateKey === key,
  )
}

export function getWeekTaskInstancesByChildDemo(
  childId: string,
  familyId: string,
  startKey: string,
  endKey: string,
): TaskInstance[] {
  const store = getDemoStore()
  return store.taskInstances.filter(
    (i) =>
      i.childId === childId &&
      i.familyId === familyId &&
      i.dateKey >= startKey &&
      i.dateKey <= endKey,
  )
}

export function ensureDailyInstancesDemo(
  childId: string,
  familyId: string,
  tasks: Task[],
  dateKey?: string,
) {
  const key = dateKey ?? todayKey()

  updateStore((store) => {
    const existingTaskIds = new Set(
      store.taskInstances
        .filter((i) => i.childId === childId && i.familyId === familyId && i.dateKey === key)
        .map((i) => i.taskId),
    )

    const toCreate = tasks.filter((t) => t.active && !existingTaskIds.has(t.id))
    const created = toCreate.map((task) => ({
      id: `inst-${task.id}-${key}`,
      familyId,
      childId,
      taskId: task.id,
      dateKey: key,
      status: 'pending' as const,
      createdAt: new Date(),
    }))

    return {
      ...store,
      taskInstances: [...store.taskInstances, ...created],
    }
  })
}

export function markTaskInstanceWaitingApprovalDemo(instanceId: string, proofUrl?: string) {
  updateStore((store) => ({
    ...store,
    taskInstances: store.taskInstances.map((i) =>
      i.id === instanceId
        ? {
            ...i,
            status: 'waiting_approval',
            completedAt: new Date(),
            proofUrl: proofUrl ?? i.proofUrl,
            proofPhotoUrl: proofUrl ?? i.proofPhotoUrl,
          }
        : i,
    ),
  }))
}

export function markTaskInstanceIssueReportedDemo(
  instanceId: string,
  issuePhotoUrl: string,
  issueDescription?: string,
  reportedByUserId?: string,
  reportedByName?: string,
  reportedByRole?: 'parent' | 'child',
) {
  updateStore((store) => ({
    ...store,
    taskInstances: store.taskInstances.map((i) =>
      i.id === instanceId
        ? {
            ...i,
            status: 'issue_reported',
            issuePhotoUrl,
            issueDescription: issueDescription?.trim() ? issueDescription.trim() : i.issueDescription,
            createdByParent: reportedByRole !== 'child',
            isManualIssue: true,
            reportedByUserId: reportedByUserId ?? i.reportedByUserId,
            reportedByName: reportedByName ?? i.reportedByName,
            reportedByRole: reportedByRole ?? i.reportedByRole ?? 'parent',
          }
        : i,
    ),
  }))
}

export function markTaskInstanceCompletedDemo(
  instanceId: string,
  childId: string,
  pointsToAward: number,
  proofUrl?: string,
) {
  updateStore((store) => ({
    ...store,
    taskInstances: store.taskInstances.map((i) =>
      i.id === instanceId
        ? {
            ...i,
            status: 'completed',
            completedAt: new Date(),
            pointsAwarded: pointsToAward,
            proofUrl: proofUrl ?? i.proofUrl,
            proofPhotoUrl: proofUrl ?? i.proofPhotoUrl,
          }
        : i,
    ),
    users: store.users.map((u) =>
      u.id === childId ? { ...u, points: u.points + Math.max(pointsToAward, 0) } : u,
    ),
  }))
}

export function approveTaskInstanceDemo(
  instanceId: string,
  approvedBy: string,
  pointsAwarded: number,
  childId: string,
) {
  updateStore((store) => ({
    ...store,
    taskInstances: store.taskInstances.map((i) =>
      i.id === instanceId
        ? {
            ...i,
            status: 'completed',
            approvedAt: new Date(),
            approvedBy,
            pointsAwarded,
          }
        : i,
    ),
    users: store.users.map((u) =>
      u.id === childId ? { ...u, points: u.points + Math.max(pointsAwarded, 0) } : u,
    ),
  }))
}

export function recalculateChildAccessStatusDemo(childId: string, familyId: string) {
  const store = getDemoStore()
  const tasks = getTasksByChildDemo(childId, familyId)
  const instances = getTodayTaskInstancesByChildDemo(childId, familyId)
  const summary = computeAccessStatus(instances, tasks)

  updateStore((current) => ({
    ...current,
    users: current.users.map((u) =>
      u.id === childId ? { ...u, accessStatus: summary.accessStatus } : u,
    ),
  }))

  return summary
}
