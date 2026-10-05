import React, { useState, useMemo } from 'react';
import { Exercise, WorkoutRoutine } from '../types/workout';
import { FULL_EXERCISE_CATALOG, MUSCLE_GROUP_LABELS } from '../data/exerciseAlternatives';
import { CatalogExercise } from '../data/exerciseCatalog';
import { getShortFormVideoConfig } from '../utils/videoHelpers';
import {
  Search,
  Plus,
  Trash2,
  Play,
  Save,
  Video,
  Clock,
  Dumbbell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Layers,
  Shuffle,
  Zap,
  GraduationCap,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

interface BuildYourOwnStudioProps {
  customRoutines: WorkoutRoutine[];
  onSaveCustomRoutine: (routine: WorkoutRoutine) => void;
  onDeleteCustomRoutine: (id: string) => void;
  onStartRoutine: (routine: WorkoutRoutine) => void;
  onOpenCoach?: (exercise: Exercise) => void;
}

export const BuildYourOwnStudio: React.FC<BuildYourOwnStudioProps> = ({
  customRoutines,
  onSaveCustomRoutine,
  onDeleteCustomRoutine,
  onStartRoutine,
  onOpenCoach,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<
    'all' | CatalogExercise['muscleGroupTag']
  >('all');
  const [selectedEquipment, setSelectedEquipment] = useState<
    'all' | CatalogExercise['equipmentType']
  >('all');
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const [videoOptionById, setVideoOptionById] = useState<Record<string, 'short' | 'detailed'>>({});

  // Builder State
  const [routineTitle, setRoutineTitle] = useState('My Custom Full-Body Strength');
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>(() => [
    FULL_EXERCISE_CATALOG[0],
    FULL_EXERCISE_CATALOG[22],
    FULL_EXERCISE_CATALOG[64],
    FULL_EXERCISE_CATALOG[88],
  ]);
  const [savedBanner, setSavedBanner] = useState(false);
  const [randomizerNotice, setRandomizerNotice] = useState<string | null>(null);

  const filteredCatalog = useMemo(() => {
    return FULL_EXERCISE_CATALOG.filter((ex) => {
      const matchGroup =
        selectedMuscleGroup === 'all' || ex.muscleGroupTag === selectedMuscleGroup;
      const matchEquip =
        selectedEquipment === 'all' || ex.equipmentType === selectedEquipment;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.targetedMuscles.some((m) => m.toLowerCase().includes(q)) ||
        ex.description.toLowerCase().includes(q);
      return matchGroup && matchEquip && matchQuery;
    });
  }, [searchQuery, selectedMuscleGroup, selectedEquipment]);

  const pickRandomItem = <T,>(items: T[]): T | null => {
    if (items.length === 0) return null;
    const idx = Math.floor(Math.random() * items.length);
    return items[idx];
  };

  /**
   * Randomizer that selects 1 exercise from each of the 5 core movement patterns
   * (Back/Pull, Chest/Push, Shoulders/Triceps, Legs/Glutes, Core/McGill) to build
   * a balanced Full-Body Strength Workout.
   * When `equipmentFreeOnly` is true, strictly filters out kettlebells, pull-up bars,
   * dumbbells, and barbells (`equipmentType === 'bodyweight'` and no bar requirement).
   */
  const handleRandomizeFullBody = (equipmentFreeOnly: boolean) => {
    const groups: Array<CatalogExercise['muscleGroupTag']> = [
      'back-pull',
      'chest-push',
      'triceps-shoulders',
      'legs-glutes',
      'core-grip-carries',
    ];

    const picked: Exercise[] = [];

    for (const grp of groups) {
      const pool = FULL_EXERCISE_CATALOG.filter((ex) => {
        if (ex.muscleGroupTag !== grp) return false;
        if (equipmentFreeOnly) {
          const nameLower = ex.name.toLowerCase();
          const eqLower = (ex.equipmentLabel || '').toLowerCase();
          const usesBarOrKettlebell =
            ex.equipmentType !== 'bodyweight' ||
            nameLower.includes('kettlebell') ||
            nameLower.includes('dumbbell') ||
            nameLower.includes('barbell') ||
            (nameLower.includes('pull-up') && !nameLower.includes('no bar')) ||
            (eqLower.includes('pull-up bar') && !eqLower.includes('no pull-up bar'));
          return !usesBarOrKettlebell;
        }
        return true;
      });

      const chosen = pickRandomItem(pool);
      if (chosen) {
        picked.push({
          ...chosen,
          id: `${chosen.id}-rand-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        });
      }
    }

    if (picked.length > 0) {
      setSelectedExercises(picked);
      if (equipmentFreeOnly) {
        setRoutineTitle('Equipment-Free Full-Body Strength (No Bar / No KB)');
        setRandomizerNotice(
          'Generated a 5-exercise Equipment-Free Full-Body workout (No Kettlebells & No Pull-Up Bar)!'
        );
      } else {
        setRoutineTitle('Randomized Full-Body Strength Split');
        setRandomizerNotice(
          'Generated a balanced 5-exercise Full-Body workout across all muscle groups!'
        );
      }
      setTimeout(() => setRandomizerNotice(null), 4000);
    }
  };

  const handleAddExercise = (ex: CatalogExercise) => {
    setSelectedExercises((prev) => [...prev, { ...ex, id: `${ex.id}-${Date.now()}` }]);
  };

  const handleRemoveExercise = (index: number) => {
    setSelectedExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveExercise = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= selectedExercises.length) return;
    setSelectedExercises((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const handleUpdateTiming = (
    index: number,
    field: 'defaultSets' | 'defaultHoldSeconds' | 'defaultRestSeconds',
    val: number
  ) => {
    setSelectedExercises((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: Math.max(1, val) } : item))
    );
  };

  const estimatedMinutes = Math.max(
    5,
    Math.round(
      selectedExercises.reduce(
        (acc, ex) =>
          acc +
          ex.defaultSets *
            ((ex.prepCountdownSeconds ?? 10) +
              (ex.defaultHoldSeconds ?? 35) +
              (ex.defaultRestSeconds ?? 60)),
        0
      ) / 60
    )
  );

  const buildRoutineObject = (): WorkoutRoutine => ({
    id: `custom-routine-${Date.now()}`,
    title: routineTitle.trim() || 'Custom Full-Body Workout',
    subtitle: `${selectedExercises.length} Custom Exercises • Built from 108-Exercise Catalogue`,
    tag: 'Custom Build',
    category: 'strength',
    durationMinutes: estimatedMinutes,
    estimatedCalories: estimatedMinutes * 9,
    accentColor: 'emerald',
    exercises: selectedExercises,
  });

  const handleSave = () => {
    if (selectedExercises.length === 0) return;
    onSaveCustomRoutine(buildRoutineObject());
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  const handleStartNow = () => {
    if (selectedExercises.length === 0) return;
    onStartRoutine(buildRoutineObject());
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Top Studio Banner + Full-Body Randomizer Controls */}
      <div className="rounded-3xl bg-gradient-to-br from-[#131C31] via-[#0F1524] to-[#0A0E17] border border-emerald-500/40 p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                {FULL_EXERCISE_CATALOG.length} Researched Strength Exercises
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                Shorts Style + Detailed Video Guides
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Build Your Own Workout &amp; Full-Body Randomizer
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Use the instant <strong>Full-Body Randomizer</strong> below (with a dedicated{' '}
              <strong>Equipment-Free: No Kettlebell / No Pull-Up Bar</strong> option), or pick any
              exercise from our 108-exercise catalogue with both <strong>Short-Form Shorts</strong>{' '}
              and <strong>Detailed Explanations</strong>.
            </p>
          </div>

          {/* Full-Body Workout Randomizer Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              onClick={() => handleRandomizeFullBody(true)}
              className="py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-transform active:scale-[0.98]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Randomize Equipment-Free (No KB / No Bar)</span>
            </button>

            <button
              onClick={() => handleRandomizeFullBody(false)}
              className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-transform active:scale-[0.98]"
            >
              <Shuffle className="w-4 h-4" />
              <span>Randomize Full-Body (All Gear)</span>
            </button>
          </div>
        </div>

        {randomizerNotice && (
          <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-xs font-bold text-emerald-200 flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{randomizerNotice}</span>
          </div>
        )}
      </div>

      {/* Saved Custom Routines Strip (if any) */}
      {customRoutines.length > 0 && (
        <div className="bg-[#0F131D] border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Your Saved Custom Workouts ({customRoutines.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {customRoutines.map((cr) => (
              <div
                key={cr.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between gap-3"
              >
                <div className="truncate">
                  <h4 className="text-sm font-bold text-white truncate">{cr.title}</h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {cr.exercises.length} Exercises • ~{cr.durationMinutes}m
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onStartRoutine(cr)}
                    className="py-2 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start</span>
                  </button>
                  <button
                    onClick={() => onDeleteCustomRoutine(cr.id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition-colors"
                    title="Delete Custom Routine"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Two-Column Layout: Left = Custom Routine Builder, Right = 108 Exercise Catalogue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Custom Workout Builder (5 cols) */}
        <div className="lg:col-span-5 bg-[#0F131D] border border-emerald-500/40 rounded-3xl p-5 space-y-4 lg:sticky lg:top-20">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">
                Custom Routine Builder
              </span>
              <h2 className="text-lg font-extrabold text-white">
                {selectedExercises.length} Exercises Selected (~{estimatedMinutes}m)
              </h2>
            </div>
            {savedBanner && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
          </div>

          {/* Quick Randomizer Bar inside Builder */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleRandomizeFullBody(true)}
              className="py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
              title="Build a random full-body routine with zero equipment (no kettlebell, no pull-up bar)"
            >
              <Shuffle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Random Equipment-Free</span>
            </button>
            <button
              onClick={() => handleRandomizeFullBody(false)}
              className="py-2 px-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
              title="Build a random full-body routine using all available equipment"
            >
              <Shuffle className="w-3.5 h-3.5 text-blue-400" />
              <span>Random Full-Body</span>
            </button>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Workout Name
            </label>
            <input
              type="text"
              value={routineTitle}
              onChange={(e) => setRoutineTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
              placeholder="e.g. Full-Body Kettlebell & Calisthenics"
            />
          </div>

          {/* Selected Exercises List with Editable Sets, Work & Cooldown Timers */}
          <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
            {selectedExercises.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950/70 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                Your custom workout is empty. Click <strong>Random Equipment-Free</strong> above or{' '}
                <strong>+ Add</strong> on any exercise in the 108-exercise catalogue!
              </div>
            ) : (
              selectedExercises.map((ex, idx) => (
                <div
                  key={`${ex.id}-${idx}`}
                  className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-white leading-snug">
                        {ex.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMoveExercise(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleMoveExercise(idx, 1)}
                        disabled={idx === selectedExercises.length - 1}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveExercise(idx)}
                        className="p-1 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300"
                        title="Remove"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Sets, Work Secs, and Cooldown Rest Secs */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800/80">
                      <span className="text-[9px] uppercase text-slate-400 block">Sets</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={ex.defaultSets}
                        onChange={(e) =>
                          handleUpdateTiming(idx, 'defaultSets', Number(e.target.value))
                        }
                        className="w-full bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                      />
                    </div>
                    <div className="bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800/80">
                      <span className="text-[9px] uppercase text-slate-400 block">
                        Work (s)
                      </span>
                      <input
                        type="number"
                        min={5}
                        max={300}
                        value={ex.defaultHoldSeconds ?? 35}
                        onChange={(e) =>
                          handleUpdateTiming(idx, 'defaultHoldSeconds', Number(e.target.value))
                        }
                        className="w-full bg-transparent text-xs font-mono font-bold text-emerald-400 focus:outline-none"
                      />
                    </div>
                    <div className="bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800/80">
                      <span className="text-[9px] uppercase text-slate-400 block">
                        Cooldown (s)
                      </span>
                      <input
                        type="number"
                        min={10}
                        max={300}
                        value={ex.defaultRestSeconds ?? 60}
                        onChange={(e) =>
                          handleUpdateTiming(idx, 'defaultRestSeconds', Number(e.target.value))
                        }
                        className="w-full bg-transparent text-xs font-mono font-bold text-blue-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
            <button
              onClick={handleSave}
              disabled={selectedExercises.length === 0}
              className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Save to Dashboard</span>
            </button>

            <button
              onClick={handleStartNow}
              disabled={selectedExercises.length === 0}
              className="py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-transform active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Custom Workout</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: 108-Exercise Research Catalogue (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Filters */}
          <div className="bg-[#0F131D] border border-slate-800 rounded-3xl p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 108 exercises by name, muscle (e.g. Lats, Glutes, Triceps), or cue..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Muscle Group Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: `All Muscle Groups (${FULL_EXERCISE_CATALOG.length})` },
                  { id: 'back-pull', label: 'Back, Lats & Biceps (22)' },
                  { id: 'chest-push', label: 'Chest & Push (21)' },
                  { id: 'triceps-shoulders', label: 'Shoulders & Triceps (21)' },
                  { id: 'legs-glutes', label: 'Legs, Glutes & Hamstrings (24)' },
                  { id: 'core-grip-carries', label: 'Core, McGill & Carries (20)' },
                ] as const
              ).map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedMuscleGroup(g.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                    selectedMuscleGroup === g.id
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Equipment Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mr-1">
                Equipment:
              </span>
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'bodyweight', label: 'Equipment-Free (No Bar / No KB)' },
                  { id: 'kettlebell', label: 'Kettlebells' },
                  { id: 'dumbbell', label: 'Dumbbells' },
                  { id: 'barbell', label: 'Barbell' },
                ] as const
              ).map((eq) => (
                <button
                  key={eq.id}
                  onClick={() => setSelectedEquipment(eq.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    selectedEquipment === eq.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {eq.label}
                </button>
              ))}
            </div>
          </div>

          {/* Catalogue Results List */}
          <div className="space-y-3">
            {filteredCatalog.map((ex) => {
              const isVideoOpen = expandedVideoId === ex.id;
              const vRef = ex.videoReference;
              const currentVideoMode = videoOptionById[ex.id] || 'short';
              const shortConfig = getShortFormVideoConfig(ex);

              return (
                <div
                  key={ex.id}
                  className="bg-[#0F131D] border border-slate-800 hover:border-slate-700 rounded-3xl p-4 sm:p-5 space-y-3 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-extrabold text-white">{ex.name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          {MUSCLE_GROUP_LABELS[ex.muscleGroupTag]}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-700">
                          {ex.equipmentLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{ex.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {vRef && (
                        <button
                          onClick={() => setExpandedVideoId(isVideoOpen ? null : ex.id)}
                          className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-colors ${
                            isVideoOpen
                              ? 'bg-blue-600 text-white border-blue-400'
                              : 'bg-slate-900 hover:bg-slate-800 text-blue-300 border-blue-500/40'
                          }`}
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>{isVideoOpen ? 'Hide Videos' : '2 Video Options'}</span>
                          {isVideoOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => handleAddExercise(ex)}
                        className="py-2 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20 active:scale-[0.98]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  {/* Expandable 2-Option Video Player (Short-Form Shorts Style vs Detailed Explanation) */}
                  {isVideoOpen && vRef && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-3 animate-in fade-in duration-200">
                      {/* 2-Option Switcher */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              setVideoOptionById((prev) => ({ ...prev, [ex.id]: 'short' }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                              currentVideoMode === 'short'
                                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                            <span>Short Form (Shorts Style)</span>
                          </button>

                          <button
                            onClick={() =>
                              setVideoOptionById((prev) => ({ ...prev, [ex.id]: 'detailed' }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                              currentVideoMode === 'detailed'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>Detailed Explanation</span>
                          </button>
                        </div>

                        {onOpenCoach && (
                          <button
                            onClick={() => onOpenCoach(ex)}
                            className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-[11px] font-bold text-purple-300 flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Ask AI Coach</span>
                          </button>
                        )}
                      </div>

                      {currentVideoMode === 'short' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-[#0D111B] border border-rose-500/30 rounded-xl p-3">
                          <div className="sm:col-span-5 flex justify-center">
                            <div className="relative w-full max-w-[210px] aspect-[9/16] max-h-[310px] rounded-xl overflow-hidden bg-black border-2 border-rose-500/40 shadow-xl">
                              <iframe
                                key={`short-build-${ex.id}`}
                                src={shortConfig.embedUrl}
                                title={`${ex.name} — Short Form`}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          </div>
                          <div className="sm:col-span-7 space-y-2.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                              <Zap className="w-3 h-3" /> 30s YouTube Shorts Style Summary
                            </span>
                            <div className="space-y-1.5">
                              {shortConfig.quickBullets.map((b, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 flex items-start gap-2"
                                >
                                  <span className="text-rose-400 font-mono font-bold">
                                    {idx + 1}.
                                  </span>
                                  <span>{b}</span>
                                </div>
                              ))}
                            </div>
                            <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <span>
                                <strong>Avoid:</strong> {shortConfig.mistakeCallout}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
                            <iframe
                              key={`detailed-build-${ex.id}`}
                              src={`https://www.youtube-nocookie.com/embed/${vRef.youtubeId}?rel=0&modestbranding=1`}
                              title={vRef.title}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div>
                              <span className="font-bold text-white block">{vRef.title}</span>
                              <span className="text-[11px] text-blue-300">{vRef.channelName}</span>
                            </div>
                            <a
                              href={`https://www.youtube.com/watch?v=${vRef.youtubeId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-blue-400 flex items-center gap-1"
                            >
                              <span>Watch on YouTube</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <div className="space-y-1 pt-2 border-t border-slate-800/80">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">
                              Detailed Biomechanical Form Cues:
                            </span>
                            {ex.formCues.map((cue, i) => (
                              <div key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                <span className="text-emerald-400 font-mono font-bold">
                                  {i + 1}.
                                </span>
                                <span>{cue}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Footer Meta: Sets, Work Duration, Cooldown Rest & Muscles */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                      <span className="text-slate-200 font-bold flex items-center gap-1">
                        <Dumbbell className="w-3 h-3 text-emerald-400" />
                        {ex.defaultSets} Sets × {ex.repLabel}
                      </span>
                      <span className="text-blue-300 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" />
                        {ex.defaultHoldSeconds}s Work / {ex.defaultRestSeconds}s Cooldown
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {ex.targetedMuscles.map((m) => (
                        <span
                          key={m}
                          className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800 text-[10px]"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
