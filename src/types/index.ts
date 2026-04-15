// ─── Domain types ────────────────────────────────────────────────────────────

export interface Family {
  id: string;
  familyName: string;
  parentIds: string[];
  childrenIds: string[];
  timezone?: string;
  dayResetHour?: number; // 0-23, hour to reset daily tasks (e.g. 4 = 4:00 AM)
  createdAt?: Date;
}

export type ResolvedAccessStatus = 'blocked' | 'released' | 'recovery_pending';
export type AccessStatus = ResolvedAccessStatus | 'partial';

export interface AppUser {
  id: string;
  displayName: string;
  email: string;
  role: 'parent' | 'child';
  roleLabel?: 'Pai' | 'Mãe' | 'Filho' | 'Filha';
  age?: number;
  notes?: string;
  familyId: string;
  points: number;
  accessStatus: AccessStatus;
  isActive: boolean;
  createdAt?: Date;
}

export interface Task {
  id: string;
  familyId: string;
  childId: string;
  appliesToAllChildren?: boolean;
  appliesToUserIds?: string[];
  createdByParent?: boolean;
  isManualIssue?: boolean;
  title: string;
  description?: string;
  points: number;
  rewardType?: 'money' | 'points';
  rewardValue?: number;
  dueTime?: string;
  weeklyDays?: number[]; // 0-6 (Sunday-Saturday)
  monthlyDays?: number[]; // 1-31
  oneTimeDate?: string; // YYYY-MM-DD
  halfRewardUntilMinutes?: number;
  zeroRewardAfterMinutes?: number;
  category: 'mandatory' | 'bonus';
  type: 'checkbox' | 'photo' | 'timer';
  frequency: 'daily' | 'weekly' | 'monthly' | 'one_time';
  requiresApproval: boolean;
  active: boolean;
  sortOrder: number;
  createdBy: string;
  createdAt?: Date;
}

export interface TaskInstance {
  id: string;
  familyId: string;
  childId: string;
  taskId: string;
  dateKey: string; // YYYY-MM-DD
  scheduledFor?: Date;
  dueAt?: Date;
  status: 'pending' | 'issue_reported' | 'waiting_approval' | 'completed' | 'skipped';
  proofUrl?: string;
  issuePhotoUrl?: string;
  proofPhotoUrl?: string;
  issueDescription?: string;
  createdByParent?: boolean;
  isManualIssue?: boolean;
  reportedByUserId?: string;
  reportedByName?: string;
  reportedByRole?: 'parent' | 'child';
  rewardEarned?: number;
  rewardStatus?: 'full' | 'half' | 'zero';
  startedAt?: Date;
  completedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  pointsAwarded?: number;
  createdAt?: Date;
}

// ─── Computed / engine types ──────────────────────────────────────────────────

export interface AccessSummary {
  totalMandatory: number;
  completedMandatory: number;
  pendingMandatory: number;
  progressPercent: number;
  accessStatus: AppUser['accessStatus'];
}
