import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import InlineMessage from '../../components/InlineMessage'
import { useAuth } from '../../hooks/useAuth'
import {
  providerEnsureDailyInstances,
  providerGetTasksByChild,
  providerGetTodayTaskInstancesByChild,
  providerMarkTaskInstanceCompleted,
  providerMarkTaskInstanceWaitingApproval,
  providerRecalculateChildAccessStatus,
} from '../../services/dataProvider'
import { computeAccessStatus } from '../../services/accessEngine'
import type { Task, TaskInstance, AccessSummary } from '../../types'

export default function ChildDashboard() {
  const { appUser } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [instances, setInstances] = useState<TaskInstance[]>([])
  const [summary, setSummary] = useState<AccessSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completingId, setCompletingId] = useState<string | null>(null)
  // Holds temporary photo URL input per instance
  const [photoInput, setPhotoInput] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!appUser) return
    load()
  }, [appUser]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    if (!appUser) return
    setLoading(true)
    setError('')
    try {
      const taskList = await providerGetTasksByChild(appUser.id, appUser.familyId)
      await providerEnsureDailyInstances(appUser.id, appUser.familyId, taskList)
      const instanceList = await providerGetTodayTaskInstancesByChild(appUser.id, appUser.familyId)
      setTasks(taskList)
      setInstances(instanceList)
      setSummary(computeAccessStatus(instanceList, taskList))
    } catch {
      setError('Erro ao carregar suas tarefas. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleComplete(inst: TaskInstance, task: Task) {
    if (!appUser) return
    setCompletingId(inst.id)
    try {
      if (task.requiresApproval) {
        const proof = task.type === 'photo' ? photoInput[inst.id] : undefined
        await providerMarkTaskInstanceWaitingApproval(inst.id, proof)
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

  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  const sortedInstances = [...instances].sort((a, b) => {
    const sa = taskMap.get(a.taskId)?.sortOrder ?? 0
    const sb = taskMap.get(b.taskId)?.sortOrder ?? 0
    return sa - sb
  })

  const statusBgClass = {
    released: 'bg-green-50 border-green-200',
    partial: 'bg-yellow-50 border-yellow-200',
    blocked: 'bg-red-50 border-red-200',
  }

  const progressBarClass = {
    released: 'bg-green-500',
    partial: 'bg-yellow-500',
    blocked: 'bg-red-400',
  }

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

              return (
                <div
                  key={inst.id}
                  className={`bg-white rounded-xl border shadow-sm p-4 ${
                    isWaiting
                      ? 'border-yellow-300 bg-yellow-50'
                      : isDone
                      ? 'border-green-100 bg-green-50'
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

                      <p className="text-xs text-indigo-500 mt-1">+{task.points} pts</p>

                      {/* Photo type: URL input */}
                      {task.type === 'photo' && !isDone && !isWaiting && (
                        <input
                          type="text"
                          placeholder="Cole o link da foto aqui"
                          value={photoInput[inst.id] ?? ''}
                          onChange={(e) =>
                            setPhotoInput((p) => ({ ...p, [inst.id]: e.target.value }))
                          }
                          className="mt-2 w-full border border-gray-200 rounded-lg px-2 py-1 text-xs"
                        />
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
                        disabled={isCompleting}
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
