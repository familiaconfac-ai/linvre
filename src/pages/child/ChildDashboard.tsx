import { useEffect, useRef, useState } from 'react'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import InlineMessage from '../../components/InlineMessage'
import { useAuth } from '../../hooks/useAuth'
import {
  providerEnsureDailyInstances,
  providerGetFamilyChildren,
  providerGetTasksByChild,
  providerGetTodayTaskInstancesByChild,
  providerMarkTaskInstanceCompleted,
  providerMarkTaskInstanceIssueReported,
  providerMarkTaskInstanceWaitingApproval,
  providerRecalculateChildAccessStatus,
} from '../../services/dataProvider'
import { computeAccessStatus } from '../../services/accessEngine'
import { calculateReward } from '../../utils/rewardCalculator'
import type { AppUser, Task, TaskInstance, AccessSummary } from '../../types'
import { uploadImage } from '../../utils/imageUpload'

export default function ChildDashboard() {
  const { appUser } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [instances, setInstances] = useState<TaskInstance[]>([])
  const [summary, setSummary] = useState<AccessSummary | null>(null)
  const [siblings, setSiblings] = useState<AppUser[]>([])
  const [selectedSiblingId, setSelectedSiblingId] = useState('')
  const [selectedSiblingTasks, setSelectedSiblingTasks] = useState<Task[]>([])
  const [selectedSiblingInstances, setSelectedSiblingInstances] = useState<TaskInstance[]>([])
  const [reportMode, setReportMode] = useState(false)
  const [selectedReportInstanceId, setSelectedReportInstanceId] = useState<string | null>(null)
  const [reportDescription, setReportDescription] = useState('')
  const [reportFile, setReportFile] = useState<File | null>(null)
  const [reportPreviewUrl, setReportPreviewUrl] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportSuccess, setReportSuccess] = useState('')
  const [reportError, setReportError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [photoFiles, setPhotoFiles] = useState<Record<string, File>>({})
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<Record<string, string>>({})
  const previewUrlsRef = useRef<Record<string, string>>({})

  useEffect(() => {
    if (!appUser) return
    load()
  }, [appUser]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    if (!appUser) return
    setLoading(true)
    setError('')
    try {
      const [taskList, familyChildren] = await Promise.all([
        providerGetTasksByChild(appUser.id, appUser.familyId),
        providerGetFamilyChildren(appUser.familyId),
      ])
      await providerEnsureDailyInstances(appUser.id, appUser.familyId, taskList)
      const instanceList = await providerGetTodayTaskInstancesByChild(appUser.id, appUser.familyId)
      setTasks(taskList)
      setInstances(instanceList)
      setSummary(computeAccessStatus(instanceList, taskList))
      setSiblings(familyChildren.filter((child) => child.id !== appUser.id))
    } catch {
      setError('Erro ao carregar suas tarefas. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function loadSiblingTasks(childId: string) {
    if (!appUser) return
    setSelectedSiblingId(childId)
    setSelectedReportInstanceId(null)
    setSelectedSiblingTasks([])
    setSelectedSiblingInstances([])
    const taskList = await providerGetTasksByChild(childId, appUser.familyId)
    await providerEnsureDailyInstances(childId, appUser.familyId, taskList)
    const instanceList = await providerGetTodayTaskInstancesByChild(childId, appUser.familyId)
    setSelectedSiblingTasks(taskList)
    setSelectedSiblingInstances(
      instanceList.filter((item) => item.status === 'pending' || item.status === 'waiting_approval'),
    )
  }

  async function handleReportSiblingIssue() {
    if (!appUser || !selectedSiblingId || !selectedReportInstanceId || !reportFile) {
      setReportError('Escolha irmão, tarefa e foto para reportar.')
      return
    }
    setReportSubmitting(true)
    setReportError('')
    try {
      const issuePhotoUrl = await uploadImage(reportFile)
      await providerMarkTaskInstanceIssueReported(
        selectedReportInstanceId,
        issuePhotoUrl,
        reportDescription,
        appUser.id,
        appUser.displayName,
        'child',
      )
      await providerRecalculateChildAccessStatus(selectedSiblingId, appUser.familyId)
      setReportSuccess('Pendência registrada com foto para o irmão.')
      setReportDescription('')
      setReportFile(null)
      if (reportPreviewUrl) {
        URL.revokeObjectURL(reportPreviewUrl)
      }
      setReportPreviewUrl('')
      setReportMode(false)
      await loadSiblingTasks(selectedSiblingId)
    } catch {
      setReportError('Erro ao registrar pendência.')
    } finally {
      setReportSubmitting(false)
    }
  }

  function handleReportFileSelected(file: File | null) {
    if (reportPreviewUrl) {
      URL.revokeObjectURL(reportPreviewUrl)
    }
    if (!file) {
      setReportPreviewUrl('')
      setReportFile(null)
      return
    }
    setReportFile(file)
    setReportPreviewUrl(URL.createObjectURL(file))
  }

  async function handleComplete(inst: TaskInstance, task: Task) {
    if (!appUser) return
    setCompletingId(inst.id)
    try {
      if (task.requiresApproval) {
        let proof: string | undefined
        const requiresCorrectionPhoto = task.type === 'photo' || Boolean(inst.issuePhotoUrl)
        if (requiresCorrectionPhoto) {
          const selectedFile = photoFiles[inst.id]
          if (!selectedFile) {
            setError('Selecione uma foto antes de enviar a prova.')
            return
          }
          proof = await uploadImage(selectedFile)
        }
        await providerMarkTaskInstanceWaitingApproval(inst.id, proof)
        if (requiresCorrectionPhoto) {
          clearPhotoState(inst.id)
        }
      } else {
        await providerMarkTaskInstanceCompleted(inst.id, appUser.id, task.points)
      }
      // Persist updated access status and reload UI
      await providerRecalculateChildAccessStatus(appUser.id, appUser.familyId)
      await load()
    } finally {
      setCompletingId(null)
    }
  }

  function handlePhotoSelected(instanceId: string, file: File | null) {
    setError('')
    const currentPreview = photoPreviewUrls[instanceId]
    if (currentPreview) {
      URL.revokeObjectURL(currentPreview)
    }

    if (!file) {
      setPhotoFiles((prev) => {
        const next = { ...prev }
        delete next[instanceId]
        return next
      })
      setPhotoPreviewUrls((prev) => {
        const next = { ...prev }
        delete next[instanceId]
        return next
      })
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setPhotoFiles((prev) => ({ ...prev, [instanceId]: file }))
    setPhotoPreviewUrls((prev) => ({ ...prev, [instanceId]: previewUrl }))
  }

  function clearPhotoState(instanceId: string) {
    const currentPreview = photoPreviewUrls[instanceId]
    if (currentPreview) {
      URL.revokeObjectURL(currentPreview)
    }
    setPhotoFiles((prev) => {
      const next = { ...prev }
      delete next[instanceId]
      return next
    })
    setPhotoPreviewUrls((prev) => {
      const next = { ...prev }
      delete next[instanceId]
      return next
    })
  }

  useEffect(() => {
    previewUrlsRef.current = photoPreviewUrls
  }, [photoPreviewUrls])

  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  const sortedInstances = [...instances].sort((a, b) => {
    const sa = taskMap.get(a.taskId)?.sortOrder ?? 0
    const sb = taskMap.get(b.taskId)?.sortOrder ?? 0
    return sa - sb
  })

  const statusBgClass = {
    released: 'bg-green-50 border-green-200',
    partial: 'bg-yellow-50 border-yellow-200',
    recovery_pending: 'bg-amber-50 border-amber-200',
    blocked: 'bg-red-50 border-red-200',
  }

  const progressBarClass = {
    released: 'bg-green-500',
    partial: 'bg-yellow-500',
    recovery_pending: 'bg-amber-500',
    blocked: 'bg-red-400',
  }

  const selectedSiblingTaskMap = new Map(selectedSiblingTasks.map((t) => [t.id, t]))

  return (
    <Layout title="Missão do dia">
      {loading && <LoadingSpinner />}

      {error && <InlineMessage variant="error" message={error} className="mb-4" />}

      {!loading && !error && appUser && summary && (
        <>
          {/* ─── Child name + big status banner ─── */}
          <div
            className={`rounded-xl p-5 mb-5 border ${statusBgClass[summary.accessStatus]}`}
          >
            <p className="text-sm text-gray-500 mb-1">Olá,</p>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">{appUser.displayName}! 👋</h2>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Status de hoje</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {summary.completedMandatory} de {summary.totalMandatory} tarefas obrigatórias aprovadas
                </p>
              </div>
              <StatusBadge status={summary.accessStatus} />
            </div>

            {/* Access released banner */}
            {summary.accessStatus === 'released' && summary.totalMandatory > 0 && (
              <p className="mt-3 text-sm font-semibold text-green-700 bg-green-100 rounded-lg px-3 py-1.5 inline-block">
                🎉 Acesso liberado! Parabéns!
              </p>
            )}
          </div>

          {/* ─── Daily reward card ─── */}
          <div className="mb-6 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
            <p className="text-sm opacity-90">Recompensa acumulada hoje</p>
            <p className="text-3xl font-bold">
              {sortedInstances.reduce((sum, inst) => {
                const task = taskMap.get(inst.taskId)
                if (!task || inst.status !== 'completed') return sum
                return sum + calculateReward(task, inst).rewardEarned
              }, 0)} pontos
            </p>
          </div>

          {siblings.length > 0 && (
            <div className="mb-6 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Reportar pendência para outro filho</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Abra um relatório simples, escolha o irmão, a tarefa e envie uma foto.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReportMode((prev) => !prev)}
                  className="bg-amber-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors"
                >
                  {reportMode ? 'Fechar relatório' : 'Reportar pendência'}
                </button>
              </div>

              {reportMode && (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs text-gray-600">
                      Irmão / irmã
                      <select
                        value={selectedSiblingId}
                        onChange={async (e) => {
                          const siblingId = e.target.value
                          setSelectedSiblingId(siblingId)
                          setSelectedReportInstanceId(null)
                          if (siblingId) {
                            await loadSiblingTasks(siblingId)
                          }
                        }}
                        className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm"
                      >
                        <option value="">Selecione um irmão</option>
                        {siblings.map((child) => (
                          <option key={child.id} value={child.id}>
                            {child.displayName} {child.roleLabel ? `(${child.roleLabel})` : ''}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-xs text-gray-600">
                      Tarefa
                      <select
                        value={selectedReportInstanceId ?? ''}
                        onChange={(e) => setSelectedReportInstanceId(e.target.value)}
                        disabled={!selectedSiblingId || selectedSiblingInstances.length === 0}
                        className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm"
                      >
                        <option value="">Selecione a tarefa</option>
                        {selectedSiblingInstances.map((inst) => {
                          const task = selectedSiblingTaskMap.get(inst.taskId)
                          return (
                            <option key={inst.id} value={inst.id}>
                              {task?.title ?? 'Tarefa'} • {inst.status}
                            </option>
                          )
                        })}
                      </select>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600">Descrição</label>
                    <input
                      type="text"
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Descrição opcional da pendência"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="report-photo"
                      className="inline-flex items-center text-xs bg-gray-100 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                    >
                      Selecionar foto
                    </label>
                    <input
                      id="report-photo"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleReportFileSelected(e.target.files?.[0] ?? null)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {reportFile?.name ?? 'Nenhuma foto selecionada'}
                    </p>
                    {reportPreviewUrl && (
                      <img
                        src={reportPreviewUrl}
                        alt="Pré-visualização da foto da pendência"
                        className="mt-2 h-20 w-20 rounded-lg object-cover border border-gray-200"
                      />
                    )}
                  </div>

                  {reportError && <InlineMessage variant="error" message={reportError} />}

                  <button
                    type="button"
                    onClick={handleReportSiblingIssue}
                    disabled={reportSubmitting || !selectedSiblingId || !selectedReportInstanceId || !reportFile}
                    className="bg-amber-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                  >
                    {reportSubmitting ? 'Enviando...' : 'Registrar pendência'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── Progress bar ─── */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progresso</span>
              <span>{summary.progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${progressBarClass[summary.accessStatus]}`}
                style={{ width: `${summary.progressPercent}%` }}
              />
            </div>
          </div>

          {/* ─── Pending approval notice ─── */}
          {sortedInstances.some((i) => i.status === 'waiting_approval') && (
            <InlineMessage
              variant="warning"
              message="Algumas tarefas estão aguardando aprovação dos pais."
              className="mb-4"
            />
          )}

          {/* ─── Task list ─── */}
          <h2 className="font-semibold text-gray-800 mb-3">Suas Missões</h2>

          {sortedInstances.length === 0 && (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
              <p className="text-3xl mb-2">🎉</p>
              <p className="text-gray-600 font-medium">Nenhuma missão para hoje!</p>
              <p className="text-gray-400 text-sm mt-1">Você está livre!</p>
            </div>
          )}

          <div className="space-y-3">
            {sortedInstances.map((inst) => {
              const task = taskMap.get(inst.taskId)
              if (!task) return null

              const isDone = inst.status === 'completed'
              const isWaiting = inst.status === 'waiting_approval'
              const isCompleting = completingId === inst.id
              const proofPhotoUrl = inst.proofPhotoUrl ?? inst.proofUrl
              const requiresCorrectionPhoto = task.type === 'photo' || Boolean(inst.issuePhotoUrl)
              const reward = calculateReward(task, inst)
              const overdue =
                task.dueTime &&
                !inst.completedAt &&
                inst.status !== 'issue_reported' &&
                new Date(`${inst.dateKey}T${task.dueTime}:00`).getTime() < Date.now()

              return (
                <div
                  key={inst.id}
                  className={`bg-white rounded-xl border shadow-sm p-4 ${
                    isWaiting
                      ? 'border-yellow-300 bg-yellow-50'
                      : inst.status === 'issue_reported'
                        ? 'border-amber-300 bg-amber-50'
                        : isDone
                          ? 'border-green-100 bg-green-50'
                          : overdue
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={`font-medium text-sm ${
                            isDone ? 'text-gray-400 line-through' : 'text-gray-800'
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.category === 'mandatory' && (
                          <span className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded">
                            obrigatória
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>
                      )}

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-500">
                        <div>
                          <span className="font-medium text-gray-700">Recompensa:</span> {task.rewardValue ?? task.points} pts
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Prazo:</span> {task.dueTime ?? 'Sem prazo'}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Ganho:</span>{' '}
                          {inst.completedAt ? `${reward.rewardEarned} pts` : '—'}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {reward ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 ${
                              reward.rewardStatus === 'full'
                                ? 'bg-green-100 text-green-700'
                                : reward.rewardStatus === 'half'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {reward.rewardStatus === 'full'
                              ? 'Integral'
                              : reward.rewardStatus === 'half'
                                ? 'Metade'
                                : 'Sem recompensa'}
                          </span>
                        ) : isWaiting ? (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-700 px-2.5 py-1">
                            Aguardando aprovação
                          </span>
                        ) : inst.status === 'issue_reported' ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2.5 py-1">
                            Pendência reportada
                          </span>
                        ) : null}

                        {overdue && (
                          <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2.5 py-1">
                            Tarefa atrasada
                          </span>
                        )}
                      </div>

                      {inst.reportedByName || inst.reportedByRole ? (
                        <p className="text-xs text-gray-600 mt-2">
                          {inst.reportedByName
                            ? `Pendência reportada por ${inst.reportedByName}`
                            : inst.reportedByRole === 'child'
                              ? 'Reportada por irmão/irmã'
                              : 'Reportada pelos pais'}
                        </p>
                      ) : null}

                      {inst.issuePhotoUrl && (
                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
                          <p className="text-xs font-semibold text-amber-800">Foto da pendência</p>
                          <img
                            src={inst.issuePhotoUrl}
                            alt="Foto da pendência registrada pelos responsáveis"
                            className="mt-1 h-20 w-20 rounded-lg object-cover border border-amber-200"
                          />
                          {inst.issueDescription && (
                            <p className="text-xs text-amber-700 mt-1">{inst.issueDescription}</p>
                          )}
                        </div>
                      )}

                      {requiresCorrectionPhoto && !isDone && !isWaiting && (
                        <div className="mt-2">
                          <label
                            htmlFor={`photo-${inst.id}`}
                            className="inline-flex items-center text-xs bg-gray-100 border border-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                          >
                            Selecionar foto
                          </label>
                          <input
                            id={`photo-${inst.id}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoSelected(inst.id, e.target.files?.[0] ?? null)}
                            className="hidden"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {photoFiles[inst.id]?.name ?? 'Nenhuma foto selecionada'}
                          </p>
                          {photoPreviewUrls[inst.id] && (
                            <img
                              src={photoPreviewUrls[inst.id]}
                              alt="Pré-visualização da prova"
                              className="mt-2 h-20 w-20 rounded-lg object-cover border border-gray-200"
                            />
                          )}
                        </div>
                      )}

                      {proofPhotoUrl && (
                        <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 p-2">
                          <p className="text-xs font-semibold text-indigo-700">Foto enviada para correção</p>
                          <img
                            src={proofPhotoUrl}
                            alt="Foto enviada como prova da correção"
                            className="mt-1 h-20 w-20 rounded-lg object-cover border border-indigo-200"
                          />
                        </div>
                      )}

                      {isWaiting && (
                        <p className="text-xs text-yellow-700 font-medium mt-1">
                          ⏳ Aguardando aprovação dos pais
                        </p>
                      )}
                    </div>

                    {!isDone && !isWaiting && (
                      <button
                        onClick={() => handleComplete(inst, task)}
                        disabled={
                          isCompleting ||
                          (requiresCorrectionPhoto && task.requiresApproval && !photoFiles[inst.id])
                        }
                        className="shrink-0 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
                      >
                        {isCompleting
                          ? '...'
                          : task.requiresApproval
                            ? 'Enviar'
                            : 'Concluir'}
                      </button>
                    )}

                    {isDone && (
                      <span className="shrink-0 text-green-500 text-xl leading-none">✓</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </Layout>
  )
}
