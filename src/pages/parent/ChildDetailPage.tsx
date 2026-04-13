import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import InlineMessage from '../../components/InlineMessage'
import EmptyState from '../../components/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import {
  providerApproveTaskInstance,
  providerCreateTask,
  providerEnsureDailyInstances,
  providerGetCurrentUserProfile,
  providerGetTasksByChild,
  providerGetTodayTaskInstancesByChild,
  providerRecalculateChildAccessStatus,
} from '../../services/dataProvider'
import { computeAccessStatus } from '../../services/accessEngine'
import type { AppUser, Task, TaskInstance, AccessSummary } from '../../types'

const statusLabel: Record<TaskInstance['status'], string> = {
  pending: 'Pendente',
  waiting_approval: 'Aguardando aprovação',
  completed: 'Concluída',
  skipped: 'Pulada',
}

const statusColor: Record<TaskInstance['status'], string> = {
  pending: 'text-gray-400',
  waiting_approval: 'text-yellow-600 font-medium',
  completed: 'text-green-600 font-medium',
  skipped: 'text-gray-400',
}

export default function ChildDetailPage() {
  const { id: childId } = useParams<{ id: string }>()
  const { appUser, localMode } = useAuth()
  const [child, setChild] = useState<AppUser | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [instances, setInstances] = useState<TaskInstance[]>([])
  const [summary, setSummary] = useState<AccessSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [approveSuccess, setApproveSuccess] = useState('')
  const [error, setError] = useState('')
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [issueSubmitting, setIssueSubmitting] = useState(false)
  const [issueForm, setIssueForm] = useState({
    title: 'Você deixou itens no quarto',
    description: '',
    imageUrl: '',
  })

  useEffect(() => {
    if (!appUser || !childId) return
    load()
  }, [appUser, childId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    if (!appUser || !childId) return
    setLoading(true)
    setError('')
    try {
      const [childData, taskData, instanceData] = await Promise.all([
        providerGetCurrentUserProfile(childId),
        providerGetTasksByChild(childId, appUser.familyId),
        providerGetTodayTaskInstancesByChild(childId, appUser.familyId),
      ])
      setChild(childData)
      setTasks(taskData)
      setInstances(instanceData)
      setSummary(computeAccessStatus(instanceData, taskData))
    } catch {
      setError('Erro ao carregar dados do filho.')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(instance: TaskInstance) {
    if (!appUser || !childId) return
    setApproveSuccess('')
    setApprovingId(instance.id)
    try {
      const task = tasks.find((t) => t.id === instance.taskId)
      await providerApproveTaskInstance(instance.id, appUser.id, task?.points ?? 0, childId)
      const newSummary = await providerRecalculateChildAccessStatus(childId, appUser.familyId)
      setApproveSuccess(
        `"${task?.title ?? 'Tarefa'}" aprovada! Acesso: ${
          newSummary.accessStatus === 'released'
            ? 'Liberado ✓'
            : newSummary.accessStatus === 'partial'
            ? 'Parcial'
            : 'Bloqueado'
        }`,
      )
      await load()
    } finally {
      setApprovingId(null)
    }
  }

  async function handleAddManualIssue() {
    if (!appUser || !childId || !child) return
    if (!issueForm.title.trim()) return

    setIssueSubmitting(true)
    setError('')
    try {
      const description = issueForm.imageUrl.trim()
        ? `${issueForm.description.trim()}\nFoto de referência: ${issueForm.imageUrl.trim()}`.trim()
        : issueForm.description.trim()

      await providerCreateTask({
        familyId: child.familyId,
        childId,
        appliesToAllChildren: false,
        appliesToUserIds: [childId],
        createdByParent: true,
        isManualIssue: true,
        title: issueForm.title.trim(),
        description,
        points: 10,
        category: 'mandatory',
        type: 'photo',
        frequency: 'daily',
        requiresApproval: true,
        active: true,
        sortOrder: (tasks[tasks.length - 1]?.sortOrder ?? 0) + 1,
        createdBy: appUser.id,
      })

      const updatedTasks = await providerGetTasksByChild(childId, child.familyId)
      await providerEnsureDailyInstances(childId, child.familyId, updatedTasks)
      await providerRecalculateChildAccessStatus(childId, child.familyId)

      setIssueForm({ title: 'Você deixou itens no quarto', description: '', imageUrl: '' })
      setShowIssueForm(false)
      setApproveSuccess('Pendência com foto adicionada com sucesso.')
      await load()
    } catch {
      setError('Erro ao adicionar pendência com foto.')
    } finally {
      setIssueSubmitting(false)
    }
  }

  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  return (
    <Layout title={child?.displayName ?? 'Filho'}>
      <Link to="/parent" className="text-sm text-indigo-600 hover:underline mb-4 inline-block">
        ← Voltar
      </Link>

      {loading && <LoadingSpinner />}

      {error && <InlineMessage variant="error" message={error} className="mb-4" />}

      {approveSuccess && (
        <InlineMessage variant="success" message={approveSuccess} className="mb-4" />
      )}

      {!loading && !error && child && summary && (
        <>
          {/* ─── Child summary card ─── */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 mb-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{child.displayName}</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  {child.age ? `${child.age} anos · ` : ''}{child.points} pontos acumulados
                </p>
                {child.notes && (
                  <p className="text-xs text-amber-700 mt-0.5">Observação: {child.notes}</p>
                )}
              </div>
              <StatusBadge status={summary.accessStatus} />
            </div>

            {localMode && (
              <div className="mt-3">
                <button
                  onClick={() => setShowIssueForm((s) => !s)}
                  className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  {showIssueForm ? 'Cancelar pendência' : 'Adicionar pendência com foto'}
                </button>

                {showIssueForm && (
                  <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50 space-y-2">
                    <input
                      type="text"
                      value={issueForm.title}
                      onChange={(e) => setIssueForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="Título da pendência"
                    />
                    <input
                      type="text"
                      value={issueForm.description}
                      onChange={(e) => setIssueForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="Descrição (ex.: cama desarrumada)"
                    />
                    <input
                      type="text"
                      value={issueForm.imageUrl}
                      onChange={(e) => setIssueForm((f) => ({ ...f, imageUrl: e.target.value }))}
                      className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="URL da foto (opcional)"
                    />
                    <button
                      onClick={handleAddManualIssue}
                      disabled={issueSubmitting}
                      className="bg-amber-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-amber-700 disabled:opacity-50"
                    >
                      {issueSubmitting ? 'Adicionando...' : 'Salvar pendência'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progresso hoje</span>
                <span>
                  {summary.completedMandatory}/{summary.totalMandatory} tarefas obrigatórias aprovadas
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
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
          </div>

          <h3 className="font-medium text-gray-700 mb-3">Tarefas de Hoje</h3>

          {instances.length === 0 && (
            <EmptyState icon="📅" title="Nenhuma tarefa para hoje." />
          )}

          <div className="space-y-3">
            {instances.map((inst) => {
              const task = taskMap.get(inst.taskId)
              const isWaiting = inst.status === 'waiting_approval'
              const isApproving = approvingId === inst.id
              return (
                <div
                  key={inst.id}
                  className={`bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between gap-3 ${
                    isWaiting ? 'border-yellow-300 bg-yellow-50' : 'border-gray-100'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">
                      {task?.title ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {task?.category === 'mandatory' ? 'Obrigatória' : 'Bônus'} ·{' '}
                      {task?.points ?? 0} pts
                    </p>
                    <p className={`text-xs mt-1 ${statusColor[inst.status]}`}>
                      {statusLabel[inst.status]}
                    </p>
                    {inst.proofUrl && (
                      <a
                        href={inst.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-500 underline mt-0.5 inline-block"
                      >
                        Ver prova
                      </a>
                    )}
                  </div>

                  {isWaiting && (
                    <button
                      onClick={() => handleApprove(inst)}
                      disabled={isApproving}
                      className="shrink-0 bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                    >
                      {isApproving ? 'Aprovando...' : 'Aprovar'}
                    </button>
                  )}

                  {inst.status === 'completed' && (
                    <span className="shrink-0 text-green-500 text-xl leading-none">✓</span>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </Layout>
  )
}
