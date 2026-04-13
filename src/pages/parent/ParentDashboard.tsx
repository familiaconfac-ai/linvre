import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import InlineMessage from '../../components/InlineMessage'
import EmptyState from '../../components/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import {
  providerEnsureDailyInstances,
  providerGetFamilyChildren,
  providerGetTasksByChild,
  providerGetTodayTaskInstancesByChild,
} from '../../services/dataProvider'
import { computeAccessStatus } from '../../services/accessEngine'
import type { AppUser, AccessSummary } from '../../types'

interface ChildCard {
  user: AppUser
  summary: AccessSummary
}

export default function ParentDashboard() {
  const { appUser, localMode } = useAuth()
  const [cards, setCards] = useState<ChildCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!appUser) return
    loadChildren()
  }, [appUser]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadChildren() {
    if (!appUser) return
    setLoading(true)
    setError('')
    try {
      const children = await providerGetFamilyChildren(appUser.familyId)
      const cardData = await Promise.all(
        children.map(async (child) => {
          const tasks = await providerGetTasksByChild(child.id, appUser.familyId)
          await providerEnsureDailyInstances(child.id, appUser.familyId, tasks)
          const instances = await providerGetTodayTaskInstancesByChild(child.id, appUser.familyId)
          const summary = computeAccessStatus(instances, tasks)
          return { user: child, summary }
        }),
      )
      setCards(cardData)
    } catch {
      setError('Erro ao carregar filhos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout title="Painel">
      {/* ─── Action bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-gray-800">Filhos da Família</h2>
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

      {/* ─── Empty state ─────────────────────────────────────────────── */}
      {!loading && !error && cards.length === 0 && (
        <EmptyState
          icon="👧"
          title="Nenhum filho cadastrado ainda"
          description={localMode ? 'No demo, os filhos já vêm pré-cadastrados.' : 'Comece adicionando o primeiro filho à família.'}
          action={!localMode ? (
            <Link
              to="/parent/add-child"
              className="bg-indigo-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Adicionar Filho
            </Link>
          ) : undefined}
        />
      )}

      {/* ─── Child cards ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ user: child, summary }) => (
          <div
            key={child.id}
            className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-800 text-base">{child.displayName}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {child.age ? `${child.age} anos` : '—'} · {child.points} pontos
                </p>
                {child.notes && (
                  <p className="text-xs text-amber-700 mt-0.5">Observação: {child.notes}</p>
                )}
              </div>
              <StatusBadge status={child.accessStatus} size="sm" />
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Progresso hoje</span>
                <span>
                  {summary.completedMandatory}/{summary.totalMandatory} tarefas obrigatórias
                </span>
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
              <p className="text-xs text-gray-400 mt-1 text-right">{summary.progressPercent}%</p>
            </div>

            <Link
              to={`/parent/child/${child.id}`}
              className="block text-center text-sm text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-100 rounded-lg py-1.5 hover:bg-indigo-50 transition-colors"
            >
              Ver detalhes →
            </Link>
          </div>
        ))}
      </div>
    </Layout>
  )
}
