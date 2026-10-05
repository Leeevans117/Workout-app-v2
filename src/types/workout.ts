export type ExerciseCategory = 'mcgill' | 'strength' | 'cardio' | 'mobility';

export type AnimationType =
  | 'mcgill-curlup'
  | 'mcgill-sidebridge'
  | 'mcgill-birddog'
  | 'ebike'
  | 'spinning'
  | 'pullup'
  | 'squat'
  | 'pushup'
  | 'diamond-pushup'
  | 'farmers-carry'
  | 'deadbug'
  | 'shoulder-tap'
  | 'row'
  | 'plank'
  | 'rdl'
  | 'lunge'
  | 'glute-bridge'
  | 'mobility';

export type CardioMode = 'ebike' | 'spinning';

export interface VideoReference {
  youtubeId: string;
  shortYoutubeId?: string;
  shortStartSeconds?: number;
  shortEndSeconds?: number;
  title: string;
  channelName: string;
  durationLabel?: string;
  stepByStepBreakdown: string[];
  commonMistakes: string[];
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  animationType: AnimationType;
  defaultSets: number;
  defaultReps?: number;
  repLabel?: string;
  defaultHoldSeconds?: number;
  defaultRestSeconds: number;
  prepCountdownSeconds?: number; // Mandatory 10s for McGill Big 3
  description: string;
  formCues: string[];
  targetedMuscles: string[];
  cardioChoiceRequired?: boolean;
  videoReference?: VideoReference;
}

export interface WorkoutRoutine {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  category: ExerciseCategory;
  durationMinutes: number;
  estimatedCalories: number;
  accentColor: 'blue' | 'emerald' | 'purple' | 'orange';
  isMcGillSpecial?: boolean;
  isCardioSpecial?: boolean;
  image?: string;
  exercises: Exercise[];
}

export type TimerPhase = 'prep' | 'active' | 'rest' | 'finished';

export interface WorkoutLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  routineId: string;
  routineTitle: string;
  category: ExerciseCategory;
  durationSeconds: number;
  completedExercisesCount: number;
  cardioMode?: CardioMode;
  notes?: string;
  timestamp: number;
  source?: 'manual' | 'fitbit';
  fitbitLogId?: string;
  caloriesBurned?: number;
  averageHeartRate?: number;
  steps?: number;
}
