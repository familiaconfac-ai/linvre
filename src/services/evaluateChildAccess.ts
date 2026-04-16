import type { AppUser, ChildAccessEvaluation, Family } from '../types'

interface EvaluateChildAccessParams {
  child: AppUser
  pendingMandatory: number
  family?: Family | null
  now?: Date
}

function getHourInTimezone(date: Date, timezone?: string): number {
  if (!timezone) {
    return date.getHours()
  }

  try {
    const formattedHour = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    }).format(date)

    return Number.parseInt(formattedHour, 10)
  } catch {
    return date.getHours()
  }
}

function isOutsideAllowedHours(
  currentHour: number,
  allowedStartHour?: number,
  allowedEndHour?: number,
): boolean {
  if (allowedStartHour === undefined || allowedEndHour === undefined) {
    return false
  }

  if (allowedStartHour === allowedEndHour) {
    return false
  }

  if (allowedStartHour < allowedEndHour) {
    return currentHour < allowedStartHour || currentHour >= allowedEndHour
  }

  return currentHour < allowedStartHour && currentHour >= allowedEndHour
}

export function evaluateChildAccess({
  child,
  pendingMandatory,
  family,
  now = new Date(),
}: EvaluateChildAccessParams): ChildAccessEvaluation {
  const timezone = family?.timezone
  const allowedStartHour = child.allowedStartHour ?? family?.allowedStartHour
  const allowedEndHour = child.allowedEndHour ?? family?.allowedEndHour
  const currentHour = getHourInTimezone(now, timezone)

  console.log('[ACCESS] evaluation:start', {
    childId: child.id,
    accessStatus: child.accessStatus,
    manualBlock: child.manualBlock ?? false,
    manualRelease: child.manualRelease ?? false,
    pendingMandatory,
    timezone: timezone ?? null,
    allowedStartHour: allowedStartHour ?? null,
    allowedEndHour: allowedEndHour ?? null,
    currentHour,
  })

  let result: ChildAccessEvaluation

  if (child.manualBlock) {
    result = {
      accessStatus: 'blocked',
      accessMode: 'manual_block',
      blockedReason: 'Bloqueio manual ativo.',
      releaseReason: null,
    }
  } else if (child.manualRelease) {
    result = {
      accessStatus: 'released',
      accessMode: 'manual_release',
      blockedReason: null,
      releaseReason: 'Liberacao manual ativa.',
    }
  } else if (isOutsideAllowedHours(currentHour, allowedStartHour, allowedEndHour)) {
    result = {
      accessStatus: 'blocked',
      accessMode: 'outside_allowed_hours',
      blockedReason: 'Fora do horario permitido.',
      releaseReason: null,
    }
  } else if (pendingMandatory > 0) {
    result = {
      accessStatus: 'blocked',
      accessMode: 'pending_mandatory',
      blockedReason: 'Existem tarefas obrigatorias pendentes.',
      releaseReason: null,
    }
  } else {
    result = {
      accessStatus: 'released',
      accessMode: 'released',
      blockedReason: null,
      releaseReason: 'Nenhum bloqueio ativo.',
    }
  }

  console.log('[ACCESS] evaluation:result', {
    childId: child.id,
    accessStatus: result.accessStatus,
    accessMode: result.accessMode,
    blockedReason: result.blockedReason,
    releaseReason: result.releaseReason,
  })

  return result
}
