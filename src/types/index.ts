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

export interface AppUser {
  id: string;
  displayName: string;
  email: string;
  role: 'parent' | 'child';
  age?: number;
  notes?: string;
  familyId: string;
  points: number;
  accessStatus: 'blocked' | 'partial' | 'released';
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
  category: 'mandatory' | 'bonus';
  type: 'checkbox' | 'photo' | 'timer';
  frequency: 'daily' | 'weekly';
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
  status: 'pending' | 'issue_reported' | 'waiting_approval' | 'completed' | 'skipped';
  proofUrl?: string;
  issuePhotoUrl?: string;
  proofPhotoUrl?: string;
  issueDescription?: string;
  createdByParent?: boolean;
  isManualIssue?: boolean;
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
