import type { Task, TaskInstance } from '../types'

export interface RewardCalculation {
  rewardEarned: number
  rewardStatus: 'full' | 'half' | 'zero'
}

export function calculateReward(
  task: Task,
  instance: TaskInstance,
): RewardCalculation {
  // Se não tem dados de recompensa, retorna tudo zero
  if (!task.rewardValue || !instance.completedAt) {
    return { rewardEarned: 0, rewardStatus: 'zero' }
  }

  const rewardValue = task.rewardValue
  
  // Se não tem prazo, assume 100% (full reward)
  if (!task.dueTime) {
    return { rewardEarned: rewardValue, rewardStatus: 'full' }
  }

  // Parse dueTime como "HH:MM"
  const [dueHour, dueMinute] = task.dueTime.split(':').map(Number)
  if (isNaN(dueHour) || isNaN(dueMinute)) {
    // prazo inválido, retorna full reward
    return { rewardEarned: rewardValue, rewardStatus: 'full' }
  }

  // Criar data de prazo para hoje
  const today = new Date(instance.dateKey)
  const dueDate = new Date(today)
  dueDate.setHours(dueHour, dueMinute, 0, 0)

  const completedTime = new Date(instance.completedAt)

  // Calcular minutos de atraso
  const delayMs = completedTime.getTime() - dueDate.getTime()
  const delayMinutes = delayMs / (1000 * 60)

  // Aplicar política de recompensa
  const halfRewardUntilMinutes = task.halfRewardUntilMinutes ?? 120 // 2 horas por padrão
  const zeroRewardAfterMinutes = task.zeroRewardAfterMinutes ?? 1440 // 24 horas por padrão

  if (delayMinutes <= 0) {
    // No prazo = 100%
    return { rewardEarned: rewardValue, rewardStatus: 'full' }
  } else if (delayMinutes <= halfRewardUntilMinutes) {
    // Após prazo, mas dentro da janela de 50% = 50%
    return { rewardEarned: Math.floor(rewardValue * 0.5), rewardStatus: 'half' }
  } else if (delayMinutes <= zeroRewardAfterMinutes) {
    // Muito atrasado = 0%
    return { rewardEarned: 0, rewardStatus: 'zero' }
  } else {
    // Além do limiteextendido = 0%
    return { rewardEarned: 0, rewardStatus: 'zero' }
  }
}
