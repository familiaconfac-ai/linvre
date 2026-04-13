import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import InlineMessage from '../../components/InlineMessage'
import { useAuth } from '../../hooks/useAuth'
import { registerChildUser } from '../../services/auth'
import { addChildToFamily } from '../../services/families'

export default function AddChildPage() {
  const { appUser, localMode } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!appUser) return
    setError('')
    setSuccess('')

    if (form.password.length < 6) {
      setError('A senha do filho deve ter pelo menos 6 caracteres.')
      return
    }

    setSubmitting(true)

    try {
      const childId = await registerChildUser(
        form.email.trim(),
        form.password,
        {
          displayName: form.displayName.trim(),
          email: form.email.trim(),
          role: 'child',
          familyId: appUser.familyId,
          points: 0,
          accessStatus: 'blocked',
          isActive: true,
          createdAt: new Date(),
        },
      )

      await addChildToFamily(appUser.familyId, childId)

      setSuccess(`${form.displayName.trim()} foi adicionado(a) com sucesso!`)
      setForm({ displayName: '', email: '', password: '' })
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('email-already-in-use')) {
        setError('Este e-mail já está em uso. Escolha outro.')
      } else if (msg.includes('invalid-email')) {
        setError('E-mail inválido. Verifique o formato.')
      } else {
        setError('Erro ao cadastrar filho. Tente novamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout title="Adicionar Filho">
      <Link to="/parent" className="text-sm text-indigo-600 hover:underline mb-4 inline-block">
        ← Voltar ao painel
      </Link>

      {localMode && (
        <div className="max-w-md mb-4">
          <InlineMessage
            variant="info"
            message="No modo demo os filhos já vêm pré-cadastrados. Esta tela fica habilitada quando o Firebase estiver configurado."
          />
        </div>
      )}

      <div className="max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-1">Cadastrar Filho</h2>
          <p className="text-xs text-gray-400 mb-5">
            Crie a conta que o filho usará para fazer login no app.
          </p>

          {success && (
            <>
              <InlineMessage variant="success" message={success} className="mb-4" />
              <div className="flex gap-3">
                <button
                  onClick={() => setSuccess('')}
                  className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Adicionar outro
                </button>
                <button
                  onClick={() => navigate('/parent')}
                  className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-semibold hover:bg-gray-200 transition-colors"
                >
                  Voltar ao painel
                </button>
              </div>
            </>
          )}

          {!success && (
            <>
              <InlineMessage variant="error" message={error} className="mb-4" />

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Nome do filho
                  </label>
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Ex: Lucas"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    E-mail de login do filho
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                    autoComplete="off"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="filho@email.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Senha provisória do filho
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    O filho usará esta senha para fazer login.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || localMode}
                  className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors mt-2"
                >
                  {localMode ? 'Disponivel apenas com Firebase' : submitting ? 'Cadastrando...' : 'Cadastrar Filho'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

