import { useAuth } from '../hooks/useAuth'
import AppLogo from '../components/AppLogo'

export default function LocalModePage() {
  const { localMode } = useAuth()

  if (!localMode) return null

  return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8 text-center">
        <div className="flex justify-center mb-4">
          <AppLogo size="lg" />
        </div>

        <h1 className="text-2xl font-bold text-indigo-600 mb-2">Link Livre</h1>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">Modo Demo Ativo</span>
            <br />
            Firebase ainda não está configurado.
          </p>
        </div>

        <p className="text-gray-600 text-sm mb-6">
          Para usar autenticação e sincronização em nuvem, configure as variáveis de ambiente do Firebase.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
          <p className="text-xs font-mono text-gray-500 mb-2">Próximos passos:</p>
          <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
            <li>Crie um arquivo <code className="bg-white px-1 py-0.5 rounded">.env</code> na raiz</li>
            <li>Copie as variáveis de <code className="bg-white px-1 py-0.5 rounded">.env.example</code></li>
            <li>Preencha com credenciais Firebase</li>
            <li>Reinicie o servidor de desenvolvimento</li>
          </ol>
        </div>

        <p className="text-xs text-gray-400">
          Enquanto isso, você pode explorar a interface do app.
        </p>
      </div>
    </div>
  )
}
