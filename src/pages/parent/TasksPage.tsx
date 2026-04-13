import { useEffect, useState, type FormEvent } from 'react'
import Layout from '../../components/Layout'
import InlineMessage from '../../components/InlineMessage'
import EmptyState from '../../components/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import {
  providerCreateTask,
  providerGetAllTasksByChild,
  providerGetFamilyChildren,
  providerUpdateTask,
} from '../../services/dataProvider'
import type { AppUser, Task } from '../../types'

const defaultForm = {
  childId: '',
  appliesToAllChildren: false,
  title: '',
  description: '',
  points: 10,
  category: 'mandatory' as Task['category'],
  type: 'checkbox' as Task['type'],
  frequency: 'daily' as Task['frequency'],
  requiresApproval: false,
  sortOrder: 0,
}

export default function TasksPage() {
  const { appUser, localMode } = useAuth()
  const [children, setChildren] = useState<AppUser[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [form, setForm] = useState(defaultForm)
  const [selectedChild, setSelectedChild] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createSuccess, setCreateSuccess] = useState('')
  const [createError, setCreateError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFields, setEditFields] = useState<Partial<Task>>({})

  useEffect(() => {
    if (!appUser) return
    loadChildren()
  }, [appUser]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!appUser || !selectedChild) return
    loadTasks(selectedChild)
  }, [selectedChild, appUser]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadChildren() {
    if (!appUser) return
    setLoadError('')
    try {
      const list = await providerGetFamilyChildren(appUser.familyId)
      setChildren(list)
      if (list.length > 0) {
        setSelectedChild(list[0].id)
        setForm((f) => ({ ...f, childId: list[0].id }))
      }
    } catch {
      setLoadError('Erro ao carregar filhos.')
    }
  }

  async function loadTasks(childId: string) {
    if (!appUser) return
    setLoadError('')
    try {
      const list = await providerGetAllTasksByChild(childId, appUser.familyId)
      setTasks(list)
    } catch {
      setLoadError('Erro ao carregar tarefas.')
    }
  }

  async function handleInlineUpdate(taskId: string, updates: Partial<Task>) {
    await providerUpdateTask(taskId, updates)
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)))
    setEditingId(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!appUser) return
    setCreateError('')
    setCreateSuccess('')

    if (!form.childId && !form.appliesToAllChildren) {
      setCreateError('Selecione um filho antes de criar a tarefa.')
      return
    }
    if (!form.title.trim()) {
      setCreateError('O título da tarefa é obrigatório.')
      return
    }
    if (form.points < 0) {
      setCreateError('Pontos não podem ser negativos.')
      return
    }

    setSubmitting(true)
    try {
      await providerCreateTask({
        ...form,
        title: form.title.trim(),
        appliesToUserIds: form.appliesToAllChildren ? [] : [form.childId],
        createdByParent: true,
        familyId: appUser.familyId,
        active: true,
        createdBy: appUser.id,
      })
      setForm({ ...defaultForm, childId: form.childId })
      setCreateSuccess('Tarefa criada com sucesso!')
      await loadTasks(form.childId)
    } catch {
      setCreateError('Erro ao criar tarefa. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout title="Tarefas">
      {loadError && (
        <InlineMessage variant="error" message={loadError} className="mb-4" />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* ─── Form ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Nova Tarefa</h2>

          {createSuccess && (
            <InlineMessage variant="success" message={createSuccess} className="mb-3" />
          )}
          {createError && (
            <InlineMessage variant="error" message={createError} className="mb-3" />
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Filho</label>
              <select
                value={form.childId}
                onChange={(e) => setForm((f) => ({ ...f, childId: e.target.value }))}
                required
                disabled={form.appliesToAllChildren}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Selecione</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>

            {localMode && (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.appliesToAllChildren}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      appliesToAllChildren: e.target.checked,
                      childId: e.target.checked ? (children[0]?.id ?? '') : f.childId,
                    }))
                  }
                  className="rounded"
                />
                Aplicar para todos os filhos (demo)
              </label>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Ex: Arrumar o quarto"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Descrição <span className="text-gray-400">(opcional)</span>
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pontos</label>
                <input
                  type="number"
                  value={form.points}
                  min={0}
                  onChange={(e) => setForm((f) => ({ ...f, points: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ordem</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  min={0}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value as Task['category'] }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="mandatory">Obrigatória</option>
                  <option value="bonus">Bônus</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value as Task['type'] }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="checkbox">Checkbox</option>
                  <option value="photo">Foto</option>
                  <option value="timer">Timer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Frequência</label>
                <select
                  value={form.frequency}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, frequency: e.target.value as Task['frequency'] }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="daily">Diária</option>
                  <option value="weekly">Semanal</option>
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.requiresApproval}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, requiresApproval: e.target.checked }))
                    }
                    className="rounded"
                  />
                  Requer aprovação
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Salvando...' : 'Criar Tarefa'}
            </button>
          </form>
        </div>

        {/* ─── Task list ─────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-semibold text-gray-800">Tarefas de</h2>
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>

          {tasks.length === 0 && (
            <EmptyState
              icon="📋"
              title="Nenhuma tarefa cadastrada"
              description="Crie a primeira tarefa no formulário ao lado."
            />
          )}

          <div className="space-y-2">
            {tasks.map((task) => {
              const isEditing = editingId === task.id
              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-xl border shadow-sm p-3 ${
                    isEditing ? 'border-indigo-200' : 'border-gray-100'
                  }`}
                >
                  {isEditing ? (
                    /* ─── Inline edit form ─── */
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editFields.title ?? task.title}
                        onChange={(e) => setEditFields((f) => ({ ...f, title: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm"
                      />
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="text-xs text-gray-600 flex items-center gap-1">
                          Pts:
                          <input
                            type="number"
                            value={editFields.points ?? task.points}
                            min={0}
                            onChange={(e) =>
                              setEditFields((f) => ({ ...f, points: Number(e.target.value) }))
                            }
                            className="w-16 border border-gray-300 rounded px-1 py-0.5 text-sm"
                          />
                        </label>
                        <label className="text-xs text-gray-700 flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editFields.active ?? task.active}
                            onChange={(e) =>
                              setEditFields((f) => ({ ...f, active: e.target.checked }))
                            }
                          />
                          Ativa
                        </label>
                        <label className="text-xs text-gray-700 flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editFields.requiresApproval ?? task.requiresApproval}
                            onChange={(e) =>
                              setEditFields((f) => ({
                                ...f,
                                requiresApproval: e.target.checked,
                              }))
                            }
                          />
                          Requer aprovação
                        </label>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleInlineUpdate(task.id, editFields)}
                          className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditFields({}) }}
                          className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ─── Normal row ─── */
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${task.active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                          {task.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {task.points} pts · {task.frequency === 'daily' ? 'diária' : 'semanal'}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            task.category === 'mandatory'
                              ? 'bg-red-50 text-red-500'
                              : 'bg-blue-50 text-blue-500'
                          }`}>
                            {task.category === 'mandatory' ? 'Obrigatória' : 'Bônus'}
                          </span>
                          {task.requiresApproval && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-600">
                              Requer aprovação
                            </span>
                          )}
                          {!task.active && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">
                              Inativa
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => { setEditingId(task.id); setEditFields({}) }}
                        className="text-xs text-indigo-500 hover:underline shrink-0"
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Layout>
  )
}
