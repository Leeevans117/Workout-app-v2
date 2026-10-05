import React, { useState } from 'react';
import { WorkoutRoutine, Exercise, AnimationType } from '../types/workout';
import {
  X,
  Trash2,
  Plus,
  CheckCircle2,
  Dumbbell,
  Clock,
  Layers,
  Sparkles,
  RotateCcw
} from 'lucide-react';

interface EditRoutineModalProps {
  routine: WorkoutRoutine | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveRoutine: (updatedRoutine: WorkoutRoutine) => void;
  onResetToDefault: () => void;
}

export const EditRoutineModal: React.FC<EditRoutineModalProps> = ({
  routine,
  isOpen,
  onClose,
  onSaveRoutine,
  onResetToDefault,
}) => {
  const [exercises, setExercises] = useState<Exercise[]>(routine?.exercises || []);
  const [isAdding, setIsAdding] = useState(false);
  const [isPastingPlan, setIsPastingPlan] = useState(false);
  const [pastedPlanText, setPastedPlanText] = useState('');

  React.useEffect(() => {
    if (routine?.exercises) {
      setExercises(routine.exercises);
    }
  }, [routine]);

  // New exercise form state
  const [newName, setNewName] = useState('');
  const [newSets, setNewSets] = useState(3);
  const [newReps, setNewReps] = useState(10);
  const [newHold, setNewHold] = useState(30);
  const [newRest, setNewRest] = useState(45);
  const [newMuscles, setNewMuscles] = useState('Core, Full Body');
  const [newAnimation, setNewAnimation] = useState<AnimationType>('pushup');

  if (!isOpen || !routine) return null;

  const inferAnimationType = (name: string): AnimationType => {
    const lower = name.toLowerCase();
    if (lower.includes('rdl') || lower.includes('deadlift') || lower.includes('hinge')) return 'rdl';
    if (lower.includes('lunge') || lower.includes('split squat') || lower.includes('step')) return 'lunge';
    if (lower.includes('bridge') || lower.includes('thrust')) return 'glute-bridge';
    if (lower.includes('squat')) return 'squat';
    if (lower.includes('row') || lower.includes('pull')) return 'row';
    if (lower.includes('plank') || lower.includes('pallof') || lower.includes('hold')) return 'plank';
    return 'pushup';
  };

  const handleBulkPasteImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedPlanText.trim()) return;

    const lines = pastedPlanText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const parsedExercises: Exercise[] = [];

    for (const line of lines) {
      // Explicitly exclude Suitcase Carries
      if (/suitcase\s*carr/i.test(line)) continue;
      // Skip McGill Big 3 or headers if pasted from a full sheet
      if (/^(exercise|movement|day|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(line) && line.length < 25) {
        continue;
      }

      // Extract sets x reps if present (e.g. "Goblet Squats - 3x12" or "3 sets x 10 reps")
      const setsRepsMatch = line.match(/(\d+)\s*[x×]\s*(\d+)/i);
      const sets = setsRepsMatch ? parseInt(setsRepsMatch[1], 10) : 3;
      const reps = setsRepsMatch ? parseInt(setsRepsMatch[2], 10) : 10;

      const cleanName = line
        .replace(/(\d+)\s*[x×]\s*(\d+).*/i, '')
        .replace(/^[\d.\-*•\s]+/, '')
        .replace(/[-–—:|]+$/, '')
        .trim();

      if (!cleanName || /suitcase\s*carr/i.test(cleanName)) continue;

      parsedExercises.push({
        id: `plan-${Date.now()}-${parsedExercises.length}`,
        name: cleanName,
        category: routine.category,
        animationType: inferAnimationType(cleanName),
        defaultSets: sets,
        defaultReps: reps,
        defaultHoldSeconds: 35,
        defaultRestSeconds: 45,
        prepCountdownSeconds: 10,
        description: `Strength training movement from your training plan (${sets} sets × ${reps} reps).`,
        formCues: [
          'Maintain abdominal cylinder brace throughout movement',
          'Controlled eccentric and concentric tempo',
          'Ensure joint alignment and neutral spine posture',
        ],
        targetedMuscles: ['Full Body Strength', 'Core Stabilizers'],
      });
    }

    if (parsedExercises.length > 0) {
      setExercises((prev) => [...prev, ...parsedExercises]);
      setPastedPlanText('');
      setIsPastingPlan(false);
    }
  };

  const handleRemoveExercise = (id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newEx: Exercise = {
      id: `ex-${Date.now()}`,
      name: newName.trim(),
      category: routine.category,
      animationType: newAnimation,
      defaultSets: Number(newSets) || 3,
      defaultReps: Number(newReps) || 10,
      defaultHoldSeconds: Number(newHold) || 30,
      defaultRestSeconds: Number(newRest) || 45,
      prepCountdownSeconds: 10,
      description: `Targeted resistance exercise for ${newMuscles}.`,
      formCues: [
        'Maintain abdominal cylinder brace throughout movement',
        'Controlled eccentric and concentric tempo',
        'Ensure joint alignment and neutral spine posture',
      ],
      targetedMuscles: newMuscles.split(',').map((m) => m.trim()).filter(Boolean),
    };

    setExercises((prev) => [...prev, newEx]);
    setNewName('');
    setIsAdding(false);
  };

  const handleSave = () => {
    onSaveRoutine({
      ...routine,
      exercises,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0F131D] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Manage {routine.title} Exercises</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                  {exercises.length} Exercises
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Remove any exercises not on your spreadsheet, or add custom ones
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {exercises.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 text-sm">
              All exercises removed. Add exercises from your spreadsheet below.
            </div>
          ) : (
            exercises.map((ex, idx) => (
              <div
                key={ex.id}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 group transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-400 shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 truncate">
                    <h4 className="text-sm font-bold text-white truncate">{ex.name}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                      <span>{ex.defaultSets} Sets</span>
                      <span>•</span>
                      <span>{ex.defaultReps} Reps</span>
                      <span>•</span>
                      <span>{ex.defaultHoldSeconds ?? 30}s Duration</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveExercise(ex.id)}
                  className="w-8 h-8 rounded-xl bg-slate-800/60 hover:bg-rose-950/50 hover:border hover:border-rose-500/50 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors shrink-0"
                  title="Remove exercise"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}

          {/* Add Exercise Section */}
          {isAdding ? (
            <form onSubmit={handleAddExercise} className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3 mt-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold text-emerald-400">
                <span>Add Exercise From Spreadsheet</span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Exercise Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Romanian Deadlift, Dumbbell Press..."
                  required
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Sets</label>
                  <input
                    type="number"
                    value={newSets}
                    onChange={(e) => setNewSets(Number(e.target.value))}
                    min="1"
                    max="10"
                    className="w-full py-1.5 px-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Reps</label>
                  <input
                    type="number"
                    value={newReps}
                    onChange={(e) => setNewReps(Number(e.target.value))}
                    min="1"
                    max="50"
                    className="w-full py-1.5 px-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Duration (s)</label>
                  <input
                    type="number"
                    value={newHold}
                    onChange={(e) => setNewHold(Number(e.target.value))}
                    min="5"
                    max="300"
                    className="w-full py-1.5 px-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Targeted Muscles
                </label>
                <input
                  type="text"
                  value={newMuscles}
                  onChange={(e) => setNewMuscles(e.target.value)}
                  placeholder="e.g. Quadriceps, Gluteus, Core"
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Strength Routine</span>
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setIsAdding(true);
                  setIsPastingPlan(false);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-dashed border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Single Exercise</span>
              </button>
              <button
                onClick={() => {
                  setIsPastingPlan(!isPastingPlan);
                  setIsAdding(false);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-950/30 hover:bg-emerald-950/50 border border-dashed border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Paste Training Plan List</span>
              </button>
            </div>
          )}

          {isPastingPlan && (
            <form
              onSubmit={handleBulkPasteImport}
              className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3 mt-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold text-emerald-400">
                <span>Paste Exercises From Your Training Plan (Suitcase Carries Auto-Excluded)</span>
                <button
                  type="button"
                  onClick={() => setIsPastingPlan(false)}
                  className="text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
              <textarea
                rows={4}
                value={pastedPlanText}
                onChange={(e) => setPastedPlanText(e.target.value)}
                placeholder={'Goblet Squats 3x12\nRomanian Deadlift 3x10\nPush-Ups 3x10\nDumbbell Rows 3x12'}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="w-full py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Import Exercises (Excluding Suitcase Carries)</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onResetToDefault();
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
