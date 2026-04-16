import Layout from '../../components/Layout'
import InlineMessage from '../../components/InlineMessage'
import { useAuth } from '../../hooks/useAuth'

export default function ChildBlockedPage() {
  const { appUser } = useAuth()

  return (
    <Layout title="Acesso bloqueado">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso bloqueado</h2>
          <p className="text-sm text-gray-600 mb-4">
            {appUser?.displayName ?? 'Este perfil'} ainda nao pode entrar na area do filho.
          </p>

          <InlineMessage
            variant="warning"
            message={appUser?.blockedReason ?? 'O status atual do perfil esta bloqueado.'}
            className="mb-4"
          />

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
            <p>Status salvo: {appUser?.accessStatus ?? 'blocked'}</p>
            <p>Modo de acesso: {appUser?.accessMode ?? 'manual_block'}</p>
            {appUser?.releaseReason && <p>Liberacao prevista: {appUser.releaseReason}</p>}
          </div>
        </div>
      </div>
    </Layout>
  )
}
