import type { AppUser } from '../types'

interface Props {
  status: AppUser['accessStatus']
  size?: 'sm' | 'md'
}

const labels: Record<AppUser['accessStatus'], string> = {
  blocked: 'Bloqueado',
  partial: 'Parcial',
  recovery_pending: 'Recuperacao',
  released: 'Liberado',
}

const colors: Record<AppUser['accessStatus'], string> = {
  blocked: 'bg-red-100 text-red-700 border border-red-300',
  partial: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  recovery_pending: 'bg-amber-100 text-amber-800 border border-amber-300',
  released: 'bg-green-100 text-green-700 border border-green-300',
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colors[status]} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {labels[status]}
    </span>
  )
}
