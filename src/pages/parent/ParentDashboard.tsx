import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import InlineMessage from '../../components/InlineMessage'
import Layout from '../../components/Layout'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import { useAuth } from '../../hooks/useAuth'
import { computeAccessStatus } from '../../services/accessEngine'
import {
  providerEnsureDailyInstances,
  providerGetFamilyChildren,
  providerGetTasksByChild,
  providerGetTodayTaskInstancesByChild,
  providerGetWeekTaskInstancesByChild,
} from '../../services/dataProvider'
import type { AccessSummary, AppUser, Task, TaskInstance } from '../../types'
import {
  getAccessStatusLabel,
  getProgressBarClass,
  getProgressSummaryLabel,
} from '../../utils/accessStatusUi'
import { endOfWeekKey, startOfWeekKey } from '../../utils/dateUtils'
import { calculateReward } from '../../utils/rewardCalculator'

interface ChildCard {
  user: AppUser
  summary: AccessSummary
  totalRewardToday: number
  totalRewardWeek: number
  pendingApprovalCount: number
}

export default function ParentDashboard() {
  const { appUser, localMode, loading: authLoading, firebaseUser, profileLoadError } = useAuth()
  const [children, setChildren] = useState<AppUser[]>([])
  const [tasksByChildId, setTasksByChildId] = useState<Record<string, Task[]>>({})
  const [todayInstancesByChildId, setTodayInstancesByChildId] = useState<Record<string, TaskInstance[]>>({})
  const [weekInstancesByChildId, setWeekInstancesByChildId] = useState<Record<string, TaskInstance[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tasksLoadError, setTasksLoadError] = useState<string | null>(null)
  const [instancesLoadError, setInstancesLoadError] = useState<string | null>(null)

  console.log('[PARENT_DASHBOARD] render', {
    loading,
    authLoading,
    firebaseUser: firebaseUser
      ? { uid: firebaseUser.uid, email: firebaseUser.email }
      : null,
    appUser: appUser
      ? {
          id: appUser.id,
          familyId: appUser.familyId,
          role: appUser.role,
        }
      : null,
    profileLoadError,
    error,
  })

  useEffect(() => {
    console.log('[PARENT_DASHBOARD] effect:start', {
      loading,
      authLoading,
      appUser: appUser
        ? {
            id: appUser.id,
            familyId: appUser.familyId,
            role: appUser.role,
          }
        : null,
      profileLoadError,
    })

    if (authLoading) return

    if (!appUser) {
      console.log('[PARENT_DASHBOARD] effect:no-app-user -> stop-local-loading')
      setChildren([])
      setTasksByChildId({})
      setTodayInstancesByChildId({})
      setWeekInstancesByChildId({})
      setTasksLoadError(null)
      setInstancesLoadError(null)
      setLoading(false)
      return
    }

    if (!appUser.familyId) {
      console.log('[PARENT_DASHBOARD] effect:fallback-without-family -> stop-local-loading')
      setChildren([])
      setTasksByChildId({})
      setTodayInstancesByChildId({})
      setWeekInstancesByChildId({})
      setTasksLoadError(null)
      setInstancesLoadError(null)
      setLoading(false)
      return
    }

    if (appUser.role !== 'parent') {
      console.log('[PARENT_DASHBOARD] effect:wrong-role -> stop-local-loading')
      setChildren([])
      setTasksByChildId({})
      setTodayInstancesByChildId({})
      setWeekInstancesByChildId({})
      setTasksLoadError(null)
      setInstancesLoadError(null)
      setLoading(false)
      return
    }

    void loadDashboardData(appUser)
  }, [appUser, authLoading, profileLoadError])

  async function loadDashboardData(currentUser: AppUser) {
    console.log('[CHILDREN] load:start', {
      firebaseUserUid: firebaseUser?.uid ?? null,
      appUserId: currentUser.id ?? null,
      familyId: currentUser.familyId ?? null,
      role: currentUser.role ?? null,
    })
    console.log('[CHILDREN] dependency-check', {
      hasAppUser: Boolean(currentUser),
      hasFamilyId: Boolean(currentUser.familyId),
      appUser: currentUser,
      profileLoadError,
    })

    if (!currentUser.familyId) {
      console.log('[CHILDREN] load:aborted-no-familyId')
      setChildren([])
      setTasksByChildId({})
      setTodayInstancesByChildId({})
      setWeekInstancesByChildId({})
      setTasksLoadError(null)
      setInstancesLoadError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    setChildren([])
    setTasksByChildId({})
    setTodayInstancesByChildId({})
    setWeekInstancesByChildId({})
    setTasksLoadError(null)
    setInstancesLoadError(null)

    const weekStart = startOfWeekKey()
    const weekEnd = endOfWeekKey()
    let familyChildren: AppUser[] = []
    let nextTasksByChildId: Record<string, Task[]> = {}

    try {
      familyChildren = await providerGetFamilyChildren(currentUser.familyId)

      console.log('[CHILDREN] load:success', {
        familyId: currentUser.familyId,
        count: familyChildren.length,
        children: familyChildren.map((child) => ({
          id: child.id,
          familyId: child.familyId,
          role: child.role,
          displayName: child.displayName,
        })),
      })
      setChildren(familyChildren)
      setLoading(false)
    } catch (error) {
      console.error('[CHILDREN] load:error', error)
      setChildren([])
      setTasksByChildId({})
      setTodayInstancesByChildId({})
      setWeekInstancesByChildId({})
      setError('Erro ao carregar filhos.')
      setLoading(false)
      return
    }

    try {
      console.log('[TASKS] load:start', {
        familyId: currentUser.familyId,
        childIds: familyChildren.map((child) => child.id),
      })

      const taskEntries = await Promise.all(
        familyChildren.map(async (child) => {
          const tasks = await providerGetTasksByChild(child.id, currentUser.familyId)
          return [child.id, tasks] as const
        }),
      )

      nextTasksByChildId = Object.fromEntries(taskEntries)

      console.log('[TASKS] load:success', nextTasksByChildId)

      setTasksByChildId(nextTasksByChildId)
      setTasksLoadError(null)
    } catch (error) {
      console.error('[TASKS] load:error', error)
      nextTasksByChildId = {}
      setTasksByChildId({})
      setTasksLoadError('Tarefas indisponiveis no momento.')
      console.warn('[TASKS] fallback:empty')
    }

    try {
      console.log('[INSTANCES] load:start', {
        familyId: currentUser.familyId,
        childIds: familyChildren.map((child) => child.id),
      })

      const instanceEntries = await Promise.all(
        familyChildren.map(async (child) => {
          const tasks = nextTasksByChildId[child.id] ?? []

          await providerEnsureDailyInstances(child.id, currentUser.familyId, tasks)

          const [todayInstances, weekInstances] = await Promise.all([
            providerGetTodayTaskInstancesByChild(child.id, currentUser.familyId),
            providerGetWeekTaskInstancesByChild(child.id, currentUser.familyId, weekStart, weekEnd),
          ])

          return [child.id, { todayInstances, weekInstances }] as const
        }),
      )

      const nextTodayInstancesByChildId = Object.fromEntries(
        instanceEntries.map(([childId, instances]) => [childId, instances.todayInstances]),
      )
      const nextWeekInstancesByChildId = Object.fromEntries(
        instanceEntries.map(([childId, instances]) => [childId, instances.weekInstances]),
      )

      console.log('[INSTANCES] load:success', {
        today: nextTodayInstancesByChildId,
        week: nextWeekInstancesByChildId,
      })

      setTodayInstancesByChildId(nextTodayInstancesByChildId)
      setWeekInstancesByChildId(nextWeekInstancesByChildId)
      setInstancesLoadError(null)
    } catch (error) {
      console.error('[INSTANCES] load:error', error)
      setTodayInstancesByChildId({})
      setWeekInstancesByChildId({})
      setInstancesLoadError('Progresso indisponivel no momento.')
      console.warn('[INSTANCES] fallback:empty')
    }
  }

  const cards: ChildCard[] = children.map((child) => {
    const tasks = tasksByChildId[child.id] ?? []
    const instances = todayInstancesByChildId[child.id] ?? []
    const weekInstances = weekInstancesByChildId[child.id] ?? []
    const summary = computeAccessStatus(instances, tasks)

    console.log('[STATUS] derived-status:before-fix', {
      screen: 'dashboard',
      childId: child.id,
      derivedAccessStatus: summary.accessStatus,
      accessStatus: child.accessStatus,
      progressToday: summary.completedMandatory,
      totalRequiredToday: summary.totalMandatory,
    })

    console.log('[STATUS] dashboard:child-status', {
      childId: child.id,
      accessStatus: child.accessStatus,
      progressToday: summary.completedMandatory,
      totalRequiredToday: summary.totalMandatory,
    })

    const totalRewardToday = instances.reduce((sum, inst) => {
      const task = tasks.find((t) => t.id === inst.taskId)
      if (!task || inst.status === 'pending') return sum
      return sum + (inst.rewardEarned ?? calculateReward(task, inst).rewardEarned)
    }, 0)

    const totalRewardWeek = weekInstances.reduce((sum, inst) => {
      const task = tasks.find((t) => t.id === inst.taskId)
      if (!task || !inst.completedAt) return sum
      return sum + calculateReward(task, inst).rewardEarned
    }, 0)

    const pendingApprovalCount = instances.filter((i) => i.status === 'waiting_approval').length

    return {
      user: child,
      summary,
      totalRewardToday,
      totalRewardWeek,
      pendingApprovalCount,
    }
  })

  if (!loading && error) {
    console.log('[CHILDREN] load:end', {
      loading: false,
      status: 'error',
    })
  } else if (!loading) {
    console.log('[CHILDREN] load:end', {
      loading: false,
      status: 'ready',
    })
  }

  const totalToday = cards.reduce((sum, card) => sum + card.totalRewardToday, 0)
  const totalWeek = cards.reduce((sum, card) => sum + card.totalRewardWeek, 0)

  if (!authLoading && !appUser) {
    return (
      <Layout title="Painel">
        <InlineMessage
          variant="error"
          message="Perfil do usuario ainda nao foi carregado. A rota nao fica mais presa em loading."
        />
      </Layout>
    )
  }

  if (!authLoading && appUser && !appUser.familyId) {
    return (
      <Layout title="Painel">
        <InlineMessage
          variant="error"
          message="Perfil carregado sem familyId. O usuario precisa concluir o setup da familia."
        />
      </Layout>
    )
  }

  return (
    <Layout title="Painel">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-gray-800">Filhos da Familia</h2>
        <div className="flex gap-2">
          {!localMode && (
            <Link
              to="/parent/add-child"
              className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + Adicionar Filho
            </Link>
          )}
          <Link
            to="/parent/tasks"
            className="bg-white border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Gerenciar tarefas
          </Link>
        </div>
      </div>

      {loading && <LoadingSpinner />}

      {error && <InlineMessage variant="error" message={error} className="mb-4" />}

      {!loading && !error && (tasksLoadError || instancesLoadError) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {tasksLoadError && (
            <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700">
              Tarefas indisponiveis
            </div>
          )}
          {instancesLoadError && (
            <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700">
              Progresso indisponivel
            </div>
          )}
        </div>
      )}

      {!loading && !error && cards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500">Total acumulado hoje</p>
            <p className="text-2xl font-semibold text-gray-900">{totalToday} pts</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500">Total acumulado na semana</p>
            <p className="text-2xl font-semibold text-gray-900">{totalWeek} pts</p>
          </div>
        </div>
      )}

      {!loading && !error && cards.length === 0 && (
        <EmptyState
          icon="👧"
          title="Nenhum filho cadastrado ainda"
          description={
            localMode
              ? 'No demo, os filhos ja vem pre-cadastrados.'
              : 'Comece adicionando o primeiro filho a familia.'
          }
          action={
            !localMode ? (
              <Link
                to="/parent/add-child"
                className="bg-indigo-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Adicionar Filho
              </Link>
            ) : undefined
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ user: child, summary, totalRewardToday, totalRewardWeek, pendingApprovalCount }) => {
          const childTasksUnavailable = Boolean(tasksLoadError)
          const childProgressUnavailable = Boolean(instancesLoadError)
          const visualStatus = child.accessStatus
          const progressLabel = getProgressSummaryLabel(summary)

          return (
            <div
              key={child.id}
              className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-800 text-base">{child.displayName}</h3>
                  {child.roleLabel && <p className="text-xs text-gray-500 mt-0.5">{child.roleLabel}</p>}
                </div>
                <StatusBadge status={child.accessStatus} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-indigo-50 rounded-lg p-2 border border-indigo-100">
                  <p className="text-gray-500">Total hoje</p>
                  <p className="text-indigo-600 font-semibold text-sm">
                    {childProgressUnavailable ? '--' : `${totalRewardToday} pts`}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                  <p className="text-gray-500">Total semana</p>
                  <p className="text-gray-800 font-semibold text-sm">
                    {childProgressUnavailable ? '--' : `${totalRewardWeek} pts`}
                  </p>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                <p>
                  Status: <span className="font-medium text-gray-700">{getAccessStatusLabel(visualStatus)}</span>
                </p>
                <p>
                  Progresso: {childProgressUnavailable ? 'indisponivel' : progressLabel}
                </p>
                {!childProgressUnavailable && pendingApprovalCount > 0 && <p>Aguardando aprovacao: {pendingApprovalCount}</p>}
                {!childProgressUnavailable && summary.totalMandatory === 0 && (
                  <p className="text-slate-600">Sem tarefas obrigatorias hoje.</p>
                )}
                {childTasksUnavailable && <p className="text-amber-700">Tarefas indisponiveis no momento.</p>}
                {childProgressUnavailable && <p className="text-blue-700">Progresso indisponivel no momento.</p>}
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Progresso hoje</span>
                  <span>{childProgressUnavailable ? '--' : `${summary.progressPercent}%`}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      childProgressUnavailable ? 'bg-gray-300' : getProgressBarClass(visualStatus, summary)
                    }`}
                    style={{ width: childProgressUnavailable ? '100%' : `${summary.progressPercent}%` }}
                  />
                </div>
              </div>

              <Link
                to={`/parent/child/${child.id}`}
                className="block text-center text-sm text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-100 rounded-lg py-1.5 hover:bg-indigo-50 transition-colors"
              >
                Ver detalhes -&gt;
              </Link>
            </div>
          )
        })}
      </div>
    </Layout>
  )
}
