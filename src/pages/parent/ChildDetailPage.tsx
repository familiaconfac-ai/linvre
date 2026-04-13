import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import InlineMessage from '../../components/InlineMessage'
import EmptyState from '../../components/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import {
  providerApproveTaskInstance,
  providerEnsureDailyInstances,
  providerGetCurrentUserProfile,
  providerGetTasksByChild,
  providerGetTodayTaskInstancesByChild,
  providerMarkTaskInstanceIssueReported,
  providerRecalculateChildAccessStatus,
} from '../../services/dataProvider'
import { computeAccessStatus } from '../../services/accessEngine'
import type { AppUser, Task, TaskInstance, AccessSummary } from '../../types'
import { uploadImage } from '../../utils/imageUpload'

const statusLabel: Record<TaskInstance['status'], string> = {
  pending: 'Pendente',
  issue_reported: 'Pendência registrada',
  waiting_approval: 'Aguardando aprovação',
  completed: 'Concluída',
  skipped: 'Pulada',
}

const statusColor: Record<TaskInstance['status'], string> = {
  pending: 'text-gray-400',
  issue_reported: 'text-amber-700 font-medium',
  waiting_approval: 'text-yellow-600 font-medium',
  completed: 'text-green-600 font-medium',
  skipped: 'text-gray-400',
}

export default function ChildDetailPage() {
  const { id: childId } = useParams<{ id: string }>()
  const { appUser } = useAuth()
  const [child, setChild] = useState<AppUser | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [instances, setInstances] = useState<TaskInstance[]>([])
  const [summary, setSummary] = useState<AccessSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [approveSuccess, setApproveSuccess] = useState('')
  const [error, setError] = useState('')
  const [issueTargetId, setIssueTargetId] = useState<string | null>(null)
  const [issueDescription, setIssueDescription] = useState('')
  const [issueFile, setIssueFile] = useState<File | null>(null)
  const [issuePreviewUrl, setIssuePreviewUrl] = useState('')
  const [issueSubmitting, setIssueSubmitting] = useState(false)
  const issuePreviewRef = useRef('')

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

  function handleOpenIssueForm(instanceId: string) {
    setIssueTargetId(instanceId)
    setIssueDescription('')
    if (issuePreviewUrl) {
      URL.revokeObjectURL(issuePreviewUrl)
    }
    setIssuePreviewUrl('')
    setIssueFile(null)
  }

  function handleIssueFileSelected(file: File | null) {
    if (issuePreviewUrl) {
      URL.revokeObjectURL(issuePreviewUrl)
    }
    if (!file) {
      setIssuePreviewUrl('')
      setIssueFile(null)
      return
    }
    setIssueFile(file)
    setIssuePreviewUrl(URL.createObjectURL(file))
  }

  async function handleSaveIssue() {
    if (!appUser || !childId || !child || !issueTargetId || !issueFile) return
    setIssueSubmitting(true)
    setError('')
    try {
      const issuePhotoUrl = await uploadImage(issueFile)
      await providerMarkTaskInstanceIssueReported(
        issueTargetId,
        issuePhotoUrl,
        issueDescription,
      )
      await providerRecalculateChildAccessStatus(childId, child.familyId)

      setIssueTargetId(null)
      setIssueDescription('')
      setIssueFile(null)
      if (issuePreviewUrl) {
        URL.revokeObjectURL(issuePreviewUrl)
      }
      setIssuePreviewUrl('')
      setApproveSuccess('Pendência registrada com foto do problema.')
      await load()
    } catch {
      setError('Erro ao registrar pendência com foto.')
    } finally {
      setIssueSubmitting(false)
    }
  }

  useEffect(() => {
    issuePreviewRef.current = issuePreviewUrl
  }, [issuePreviewUrl])

  useEffect(() => {
    return () => {
      if (issuePreviewRef.current) {
        URL.revokeObjectURL(issuePreviewRef.current)
      }
    }
  }, [])

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
              const canRegisterIssue =
                inst.status !== 'completed' && (Boolean(task?.requiresApproval) || task?.type === 'photo')
              const isApproving = approvingId === inst.id
              const proofPhotoUrl = inst.proofPhotoUrl ?? inst.proofUrl
              return (
                <div
                  key={inst.id}
                  className={`bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between gap-3 ${
                    isWaiting
                      ? 'border-yellow-300 bg-yellow-50'
                      : inst.status === 'issue_reported'
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-gray-100'
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
                    {inst.issuePhotoUrl && (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 inline-block">
                        <p className="text-xs font-semibold text-amber-800">Foto da pendência</p>
                        <img
                          src={inst.issuePhotoUrl}
                          alt="Foto da pendência registrada pelo responsável"
                          className="mt-1 h-20 w-20 rounded-lg object-cover border border-amber-200"
                        />
                        {inst.issueDescription && (
                          <p className="text-xs text-amber-700 mt-1">{inst.issueDescription}</p>
                        )}
                      </div>
                    )}

                    {proofPhotoUrl && (
                      <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 p-2 inline-block">
                        <p className="text-xs font-semibold text-indigo-700">
                          Foto enviada para correção
                        </p>
                        <img
                          src={proofPhotoUrl}
                          alt="Foto enviada pelo filho como prova de correção"
                          className="mt-1 h-20 w-20 rounded-lg object-cover border border-indigo-200"
                        />
                      </div>
                    )}

                    {canRegisterIssue && issueTargetId !== inst.id && (
                      <button
                        onClick={() => handleOpenIssueForm(inst.id)}
                        className="mt-2 text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-200 transition-colors"
                      >
                        Registrar pendência
                      </button>
                    )}

                    {issueTargetId === inst.id && (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                        <label
                          htmlFor={`issue-photo-${inst.id}`}
                          className="inline-flex items-center text-xs bg-white border border-amber-200 text-amber-800 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
                        >
                          Tirar foto da pendência
                        </label>
                        <input
                          id={`issue-photo-${inst.id}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleIssueFileSelected(e.target.files?.[0] ?? null)}
                          className="hidden"
                        />
                        <p className="text-xs text-amber-700">
                          {issueFile?.name ?? 'Nenhuma foto selecionada'}
                        </p>
                        {issuePreviewUrl && (
                          <img
                            src={issuePreviewUrl}
                            alt="Pré-visualização da foto da pendência"
                            className="h-20 w-20 rounded-lg object-cover border border-amber-200"
                          />
                        )}
                        <input
                          type="text"
                          value={issueDescription}
                          onChange={(e) => setIssueDescription(e.target.value)}
                          className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
                          placeholder="Descrição opcional da pendência"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSaveIssue}
                            disabled={issueSubmitting || !issueFile}
                            className="bg-amber-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-amber-700 disabled:opacity-50"
                          >
                            {issueSubmitting ? 'Salvando...' : 'Salvar pendência'}
                          </button>
                          <button
                            onClick={() => setIssueTargetId(null)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
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
