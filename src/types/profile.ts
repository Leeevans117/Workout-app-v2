export type PrimaryFitnessObjective =
  | 'strength'
  | 'weight_loss'
  | 'spine_hygiene'
  | 'endurance'
  | 'athletic_hybrid';

export type StrengthTier = 'beginner' | 'intermediate' | 'advanced' | 'elite';

export interface UserFitnessProfile {
  uid: string;
  displayName: string;
  email?: string;
  primaryObjective: PrimaryFitnessObjective;
  currentWeightKg: number;
  startWeightKg: number;
  targetWeightKg: number;
  currentStrengthLevel: StrengthTier;
  targetStrengthLevel: StrengthTier;
  currentMaxPullUps: number;
  targetMaxPullUps: number;
  currentMaxPushUps: number;
  targetMaxPushUps: number;
  dailyStepGoal: number;
  weeklyWorkoutGoal: number;
  updatedAtIso?: string;
}

export interface ProgressSnapshotEntry {
  id: string;
  uid: string;
  dateStr: string;
  weightKg: number;
  maxPullUps: number;
  maxPushUps: number;
  note: string;
}

export const DEFAULT_USER_PROFILE: UserFitnessProfile = {
  uid: 'local-athlete',
  displayName: 'Apex Athlete',
  primaryObjective: 'athletic_hybrid',
  currentWeightKg: 82,
  startWeightKg: 85,
  targetWeightKg: 78,
  currentStrengthLevel: 'intermediate',
  targetStrengthLevel: 'advanced',
  currentMaxPullUps: 15,
  targetMaxPullUps: 25,
  currentMaxPushUps: 35,
  targetMaxPushUps: 50,
  dailyStepGoal: 8000,
  weeklyWorkoutGoal: 5,
};
