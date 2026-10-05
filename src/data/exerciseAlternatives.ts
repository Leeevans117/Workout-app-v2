import { Exercise } from '../types/workout';
import { CATALOG_PART_1, CatalogExercise } from './exerciseCatalog';
import { CATALOG_PART_2 } from './exerciseCatalogPart2';

export type AlternativeExerciseOption = CatalogExercise;

// Full 108-Exercise Researched Full-Body Strength Catalogue
export const FULL_EXERCISE_CATALOG: CatalogExercise[] = [
  ...CATALOG_PART_1,
  ...CATALOG_PART_2,
];

export const ALTERNATIVE_EXERCISE_ARSENAL: AlternativeExerciseOption[] = FULL_EXERCISE_CATALOG;

/**
 * Determines which muscle group bucket an exercise belongs to so the Replace/Swap modal
 * always recommends all matching muscle-group exercises (20+ per muscle group).
 */
export function detectMuscleGroupTag(
  exercise: Exercise
): AlternativeExerciseOption['muscleGroupTag'] {
  const customTag = (exercise as Partial<CatalogExercise>).muscleGroupTag;
  if (customTag) return customTag;

  const name = exercise.name.toLowerCase();
  const muscles = exercise.targetedMuscles.join(' ').toLowerCase();

  if (
    exercise.animationType === 'pullup' ||
    exercise.animationType === 'row' ||
    name.includes('pull') ||
    name.includes('chin') ||
    name.includes('row') ||
    name.includes('lat') ||
    name.includes('curl') ||
    name.includes('snow angel') ||
    muscles.includes('latissimus') ||
    muscles.includes('biceps')
  ) {
    return 'back-pull';
  }

  if (
    exercise.animationType === 'diamond-pushup' ||
    name.includes('diamond') ||
    name.includes('tricep') ||
    name.includes('pike') ||
    name.includes('halo') ||
    name.includes('sphinx') ||
    name.includes('crush') ||
    name.includes('shoulder') ||
    name.includes('lateral raise') ||
    name.includes('overhead') ||
    name.includes('military')
  ) {
    return 'triceps-shoulders';
  }

  if (
    exercise.animationType === 'pushup' ||
    name.includes('push-up') ||
    name.includes('pushup') ||
    name.includes('bench') ||
    name.includes('floor press') ||
    name.includes('archer') ||
    name.includes('chest') ||
    name.includes('fly') ||
    muscles.includes('pectoralis')
  ) {
    return 'chest-push';
  }

  if (
    exercise.animationType === 'squat' ||
    exercise.animationType === 'lunge' ||
    exercise.animationType === 'glute-bridge' ||
    exercise.animationType === 'rdl' ||
    name.includes('squat') ||
    name.includes('lunge') ||
    name.includes('bridge') ||
    name.includes('deadlift') ||
    name.includes('rdl') ||
    name.includes('swing') ||
    name.includes('hip thrust') ||
    name.includes('calf') ||
    muscles.includes('quadriceps') ||
    muscles.includes('hamstrings')
  ) {
    return 'legs-glutes';
  }

  return 'core-grip-carries';
}

export const MUSCLE_GROUP_LABELS: Record<AlternativeExerciseOption['muscleGroupTag'], string> = {
  'back-pull': 'Back, Lats & Biceps (Pulling)',
  'chest-push': 'Chest & Anterior Push',
  'triceps-shoulders': 'Triceps, Shoulders & Vertical Push',
  'legs-glutes': 'Legs, Quads, Glutes & Hamstrings',
  'core-grip-carries': 'Core Bracing, McGill Spine & Carries',
};

export function getAlternativesForExercise(exercise: Exercise): {
  muscleGroupLabel: string;
  muscleGroupTag: AlternativeExerciseOption['muscleGroupTag'];
  alternatives: AlternativeExerciseOption[];
} {
  const tag = detectMuscleGroupTag(exercise);
  const matching = FULL_EXERCISE_CATALOG.filter(
    (alt) => alt.muscleGroupTag === tag && alt.id !== exercise.id && alt.name !== exercise.name
  );
  return {
    muscleGroupLabel: MUSCLE_GROUP_LABELS[tag],
    muscleGroupTag: tag,
    alternatives: matching,
  };
}
