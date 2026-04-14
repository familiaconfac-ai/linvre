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
import type { AccessSummary, AppUser } from '../../types'
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
  const [cards, setCards] = useState<ChildCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
      setCards([])
      setLoading(false)
      return
    }

    if (!appUser.familyId) {
      console.log('[PARENT_DASHBOARD] effect:fallback-without-family -> stop-local-loading')
      setCards([])
      setLoading(false)
      return
    }

    if (appUser.role !== 'parent') {
      console.log('[PARENT_DASHBOARD] effect:wrong-role -> stop-local-loading')
      setCards([])
      setLoading(false)
      return
    }

    void loadChildren(appUser)
  }, [appUser, authLoading, profileLoadError])

  async function loadChildren(currentUser: AppUser) {
    console.log('[PARENT_DASHBOARD] loadChildren:start', {
      familyId: currentUser.familyId,
      role: currentUser.role,
      profileLoadError,
    })
    setLoading(true)
    setError('')

    try {
      const weekStart = startOfWeekKey()
      const weekEnd = endOfWeekKey()
      const children = await providerGetFamilyChildren(currentUser.familyId)
      const cardData = await Promise.all(
        children.map(async (child) => {
          const tasks = await providerGetTasksByChild(child.id, currentUser.familyId)
          await providerEnsureDailyInstances(child.id, currentUser.familyId, tasks)
          const instances = await providerGetTodayTaskInstancesByChild(child.id, currentUser.familyId)
          const weekInstances = await providerGetWeekTaskInstancesByChild(
            child.id,
            currentUser.familyId,
            weekStart,
            weekEnd,
          )
          const summary = computeAccessStatus(instances, tasks)

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
        }),
      )

      console.log('[PARENT_DASHBOARD] loadChildren:success', {
        childCount: cardData.length,
      })
      setCards(cardData)
    } catch (loadError) {
      console.log('[PARENT_DASHBOARD] loadChildren:error', loadError)
      setError('Erro ao carregar filhos.')
    } finally {
      console.log('[PARENT_DASHBOARD] loadChildren:end -> loading:false')
      setLoading(false)
    }
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
          const statusLabel =
            pendingApprovalCount > 0
              ? 'Aguardando aprovacao'
              : summary.accessStatus === 'released'
                ? 'Em dia'
                : summary.accessStatus === 'partial'
                  ? 'Em andamento'
                  : 'Com atraso'

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
                  <p className="text-indigo-600 font-semibold text-sm">{totalRewardToday} pts</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                  <p className="text-gray-500">Total semana</p>
                  <p className="text-gray-800 font-semibold text-sm">{totalRewardWeek} pts</p>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                <p>
                  Status: <span className="font-medium text-gray-700">{statusLabel}</span>
                </p>
                <p>
                  Progresso: {summary.completedMandatory}/{summary.totalMandatory}
                </p>
                {pendingApprovalCount > 0 && <p>Aguardando aprovacao: {pendingApprovalCount}</p>}
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Progresso hoje</span>
                  <span>{summary.progressPercent}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      summary.accessStatus === 'released'
                        ? 'bg-green-500'
                        : summary.accessStatus === 'partial'
                          ? 'bg-yellow-500'
                          : 'bg-red-400'
                    }`}
                    style={{ width: `${summary.progressPercent}%` }}
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
