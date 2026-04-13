import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AppLogo from '../components/AppLogo'

export default function LoginPage() {
  const { signIn, appUser, loading, localMode, demoUsers, signInDemo, resetDemo } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center px-4">
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    )
  }

  // Redirect already-authenticated users
  if (appUser) {
    return <Navigate to={appUser.role === 'parent' ? '/parent' : '/child'} replace />
  }

  const handleDemoLogin = async (userId: string) => {
    setError('')
    try {
      const selectedUser = demoUsers.find((user) => user.id === userId)
      await signInDemo(userId)
      navigate(selectedUser?.role === 'parent' ? '/parent' : '/child', { replace: true })
    } catch {
      setError('Não foi possível iniciar sessão demo.')
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      // AuthProvider state change will trigger re-render → Navigate above
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer login'
      setError(msg.includes('Firebase') ? msg : 'E-mail ou senha inválidos.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <AppLogo size="lg" className="mb-3" />
          <h1 className="text-2xl font-bold text-indigo-600">LinVre</h1>
          <p className="text-gray-400 text-sm mt-1">Link Livre</p>
        </div>

        {localMode && (
          <div className="mb-5">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
              <p className="text-sm text-amber-800 font-medium">Modo Demo: Firebase ainda não configurado</p>
              <p className="text-xs text-amber-700 mt-1">
                Escolha um perfil demo para simular o fluxo completo da interface.
              </p>
            </div>

            <div className="space-y-2 mb-3">
              {demoUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => void handleDemoLogin(u.id)}
                  className="w-full text-left border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-800">
                    Entrar como {u.displayName}
                  </span>
                  <span className="block text-xs text-gray-400 mt-0.5">
                    {u.role === 'parent' ? 'Acesso ao painel da família' : 'Acesso ao painel do filho'}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={resetDemo}
              className="w-full text-xs text-amber-700 hover:text-amber-900"
            >
              Resetar dados demo
            </button>
          </div>
        )}

        {!localMode && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}

        {localMode && error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </div>
  )
}
