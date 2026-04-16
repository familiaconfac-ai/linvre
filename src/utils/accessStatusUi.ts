import type { AccessSummary, AppUser } from '../types'

export function getAccessStatusLabel(status: AppUser['accessStatus']): string {
  switch (status) {
    case 'released':
      return 'Liberado'
    case 'recovery_pending':
    case 'partial':
      return 'Recuperacao pendente'
    case 'blocked':
    default:
      return 'Bloqueado'
  }
}

export function getProgressSummaryLabel(summary: AccessSummary): string {
  if (summary.totalMandatory === 0) {
    return 'Sem tarefas obrigatorias hoje'
  }

  return `${summary.completedMandatory}/${summary.totalMandatory}`
}

export function getProgressBarClass(
  status: AppUser['accessStatus'],
  summary: AccessSummary,
): string {
  if (summary.totalMandatory === 0) {
    return 'bg-slate-400'
  }

  switch (status) {
    case 'released':
      return 'bg-green-500'
    case 'recovery_pending':
    case 'partial':
      return 'bg-amber-500'
    case 'blocked':
    default:
      return 'bg-red-400'
  }
}
