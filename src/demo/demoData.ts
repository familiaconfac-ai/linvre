import type { AppUser, Family, Task, TaskInstance } from '../types'
import { todayKey } from '../utils/dateUtils'
import { computeAccessStatus } from '../services/accessEngine'
import { evaluateChildAccess } from '../services/evaluateChildAccess'

export interface DemoStoreData {
  family: Family
  users: AppUser[]
  tasks: Task[]
  taskInstances: TaskInstance[]
}

const CHILD_IDS = ['demo-laura', 'demo-arthur', 'demo-eric', 'demo-levi']

function seedUsers(familyId: string): AppUser[] {
  return [
    {
      id: 'demo-marcio',
      displayName: 'Márcio Martins',
      email: 'marcio@demo.local',
      role: 'parent',
      roleLabel: 'Pai',
      familyId,
      points: 0,
      accessStatus: 'released',
      isActive: true,
    },
    {
      id: 'demo-conceicao',
      displayName: 'Conceição Martins',
      email: 'conceicao@demo.local',
      role: 'parent',
      roleLabel: 'Mãe',
      familyId,
      points: 0,
      accessStatus: 'released',
      isActive: true,
    },
    {
      id: 'demo-laura',
      displayName: 'Laura Martins',
      email: 'laura@demo.local',
      role: 'child',
      roleLabel: 'Filha',
      age: 18,
      familyId,
      points: 60,
      accessStatus: 'partial',
      isActive: true,
    },
    {
      id: 'demo-arthur',
      displayName: 'Arthur Martins',
      email: 'arthur@demo.local',
      role: 'child',
      age: 17,
      notes: 'TH',
      familyId,
      points: 42,
      accessStatus: 'partial',
      isActive: true,
    },
    {
      id: 'demo-eric',
      displayName: 'Eric Martins',
      email: 'eric@demo.local',
      role: 'child',
      age: 17,
      familyId,
      points: 34,
      accessStatus: 'partial',
      isActive: true,
    },
    {
      id: 'demo-levi',
      displayName: 'Levi Martins',
      email: 'levi@demo.local',
      role: 'child',
      age: 14,
      familyId,
      points: 18,
      accessStatus: 'blocked',
      isActive: true,
    },
  ]
}

interface TaskTemplate {
  title: string
  description?: string
  points: number
  category: Task['category']
  type: Task['type']
  requiresApproval: boolean
  sortOrder: number
  isManualIssue?: boolean
}

function buildTask(
  familyId: string,
  childId: string,
  index: number,
  template: TaskTemplate,
): Task {
  return {
    id: `task-${childId}-${index}`,
    familyId,
    childId,
    appliesToAllChildren: false,
    appliesToUserIds: [childId],
    createdByParent: true,
    isManualIssue: template.isManualIssue ?? false,
    title: template.title,
    description: template.description,
    points: template.points,
    rewardType: 'points',
    rewardValue: template.points,
    dueTime: '22:00',
    halfRewardUntilMinutes: 120,
    zeroRewardAfterMinutes: 1440,
    category: template.category,
    type: template.type,
    frequency: 'daily',
    requiresApproval: template.requiresApproval,
    active: true,
    sortOrder: template.sortOrder,
    createdBy: 'demo-marcio',
  }
}

function sharedTemplates(): TaskTemplate[] {
  return [
    {
      title: 'Ler a Bíblia todos os dias',
      points: 10,
      category: 'mandatory',
      type: 'checkbox',
      requiresApproval: false,
      sortOrder: 1,
    },
    {
      title: 'Fazer pelo menos 30 minutos de exercício',
      points: 15,
      category: 'mandatory',
      type: 'timer',
      requiresApproval: false,
      sortOrder: 2,
    },
    {
      title: 'Ler 4 a 5 páginas de um bom livro',
      points: 8,
      category: 'mandatory',
      type: 'checkbox',
      requiresApproval: false,
      sortOrder: 3,
    },
    {
      title: 'Lavar a própria louça/copo após usar',
      points: 8,
      category: 'mandatory',
      type: 'checkbox',
      requiresApproval: false,
      sortOrder: 4,
    },
    {
      title: 'Limpar a mesa e deixar como estava depois de comer',
      points: 8,
      category: 'mandatory',
      type: 'checkbox',
      requiresApproval: false,
      sortOrder: 5,
    },
    {
      title: 'Não deixar coisas largadas no quarto',
      description: 'Se necessário, enviar foto para validação.',
      points: 12,
      category: 'mandatory',
      type: 'photo',
      requiresApproval: true,
      sortOrder: 6,
    },
  ]
}

function specificTemplatesByChild(childId: string): TaskTemplate[] {
  if (childId === 'demo-laura') {
    return [
      {
        title: 'Treinar piano 15 minutos por dia',
        points: 12,
        category: 'mandatory',
        type: 'timer',
        requiresApproval: false,
        sortOrder: 7,
      },
      {
        title: 'Arrumar o quarto',
        points: 10,
        category: 'mandatory',
        type: 'photo',
        requiresApproval: true,
        sortOrder: 8,
      },
    ]
  }

  if (childId === 'demo-arthur') {
    return [
      {
        title: 'Arrumar o quarto',
        points: 10,
        category: 'mandatory',
        type: 'photo',
        requiresApproval: true,
        sortOrder: 7,
      },
    ]
  }

  if (childId === 'demo-eric') {
    return [
      {
        title: 'Arrumar o quarto',
        points: 10,
        category: 'mandatory',
        type: 'photo',
        requiresApproval: true,
        sortOrder: 7,
      },
    ]
  }

  return [
    {
      title: 'Arrumar o quarto',
      points: 10,
      category: 'mandatory',
      type: 'photo',
      requiresApproval: true,
      sortOrder: 7,
    },
  ]
}

function seedTasks(familyId: string): Task[] {
  const shared = sharedTemplates()
  const tasks: Task[] = []

  CHILD_IDS.forEach((childId) => {
    const combined = [...shared, ...specificTemplatesByChild(childId)]
    combined.forEach((template, index) => {
      const task = buildTask(familyId, childId, index + 1, template)
      task.appliesToAllChildren = index < shared.length
      tasks.push(task)
    })
  })

  return tasks
}

function statusByChildAndTask(task: Task): TaskInstance['status'] {
  // Laura: quase tudo concluído, com uma pendente de aprovação
  if (task.childId === 'demo-laura') {
    if (task.sortOrder <= 5) return 'completed'
    if (task.sortOrder === 6) return 'waiting_approval'
    return 'pending'
  }

  // Arthur: parcial
  if (task.childId === 'demo-arthur') {
    if (task.sortOrder <= 2) return 'completed'
    if (task.sortOrder === 7) return 'waiting_approval'
    return 'pending'
  }

  // Eric: parcial com mais pendências
  if (task.childId === 'demo-eric') {
    if (task.sortOrder <= 1) return 'completed'
    if (task.sortOrder === 7) return 'waiting_approval'
    return 'pending'
  }

  // Levi: bloqueado (quase tudo pendente)
  if (task.childId === 'demo-levi') {
    if (task.sortOrder === 1) return 'completed'
    return 'pending'
  }

  return 'pending'
}

function seedInstances(familyId: string, tasks: Task[]): TaskInstance[] {
  const key = todayKey()

  return tasks.map((task) => {
    const status = statusByChildAndTask(task)
    const pointsAwarded = status === 'completed' ? task.points : undefined

    return {
      id: `inst-${task.id}-${key}`,
      familyId,
      childId: task.childId,
      taskId: task.id,
      dateKey: key,
      status,
      pointsAwarded,
      createdAt: new Date(),
    }
  })
}

export function createInitialDemoStore(): DemoStoreData {
  const familyId = 'demo-family-martins'
  const family: Family = {
    id: familyId,
    familyName: 'Família Martins',
    parentIds: ['demo-marcio', 'demo-conceicao'],
    childrenIds: ['demo-laura', 'demo-arthur', 'demo-eric', 'demo-levi'],
    createdAt: new Date(),
  }

  const users = seedUsers(familyId)
  const tasks = seedTasks(familyId)
  const taskInstances = seedInstances(familyId, tasks)

  const nextUsers = users.map((user) => {
    if (user.role !== 'child') return user
    const childTasks = tasks.filter((t) => t.childId === user.id && t.active)
    const childInstances = taskInstances.filter((i) => i.childId === user.id)
    const summary = computeAccessStatus(childInstances, childTasks)
    const evaluation = evaluateChildAccess({
      child: user,
      family,
      pendingMandatory: summary.pendingMandatory,
    })
    return {
      ...user,
      accessStatus: evaluation.accessStatus,
      accessMode: evaluation.accessMode,
      blockedReason: evaluation.blockedReason,
      releaseReason: evaluation.releaseReason,
    }
  })

  return {
    family,
    users: nextUsers,
    tasks,
    taskInstances,
  }
}
