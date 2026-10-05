import React, { useState, useEffect } from 'react';
import { WorkoutRoutine, WorkoutLogEntry, Exercise } from '../types/workout';
import { WEEKLY_SCHEDULE } from '../data/workoutPlan';
import { getAlternativesForExercise } from '../data/exerciseAlternatives';
import { WorkoutAnatomyModal } from './WorkoutAnatomyModal';
import { EditRoutineModal } from './EditRoutineModal';
import { SkipExerciseModal } from './SkipExerciseModal';
import { YouTubeMusicBar } from './YouTubeMusicBar';
import {
  Play,
  ShieldCheck,
  Zap,
  Flame,
  CheckCircle2,
  Calendar as CalendarIcon,
  ChevronRight,
  Dumbbell,
  Sparkles,
  Trophy,
  Target,
  Video,
  Edit3,
  Watch,
  Shuffle,
  Footprints,
  Plus,
  RotateCcw,
  Timer,
  RefreshCw,
} from 'lucide-react';

interface MainDashboardProps {
  routines: WorkoutRoutine[];
  customRoutines?: WorkoutRoutine[];
  logs: WorkoutLogEntry[];
  onStartRoutine: (routine: WorkoutRoutine, exerciseIndex?: number) => void;
  onSelectMcGillTab: () => void;
  onSelectCalendarTab: () => void;
  onSelectBuilderTab?: () => void;
  onSaveCustomRoutine?: (routine: WorkoutRoutine) => void;
  onDeleteCustomRoutine?: (id: string) => void;
  onOpenCoach: (exercise?: Exercise) => void;
  onOpenInstallModal: () => void;
  onOpenFitbitModal: () => void;
  onRequestLiveWatchSync?: () => void;
  fitbitConnected?: boolean;
  fitbitLastSync?: string | null;
  syncedTodaySteps?: number | null;
  onUpdateRoutine?: (routine: WorkoutRoutine) => void;
  onResetRoutines?: () => void;
}

const STEPS_STORAGE_KEY = 'apex_fitbit_daily_steps_v2';
const FITBIT_DAILY_STEP_GOAL = 8000;

interface DailyStepsEntry {
  steps: number | null;
  syncedAt?: string;
  hasData: boolean;
  manualOverride?: boolean;
}

function getLocalTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  routines,
  customRoutines = [],
  logs,
  onStartRoutine,
  onSelectCalendarTab,
  onOpenCoach,
  onOpenFitbitModal,
  onRequestLiveWatchSync,
  fitbitConnected,
  fitbitLastSync,
  syncedTodaySteps,
  onUpdateRoutine,
  onResetRoutines,
}) => {
  const [todayStr, setTodayStr] = useState<string>(() => getLocalTodayStr());
  const [isSyncingWatchNow, setIsSyncingWatchNow] = useState(false);
  const [videoModalState, setVideoModalState] = useState<{
    routine: WorkoutRoutine;
    exerciseIndex: number;
  } | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<WorkoutRoutine | null>(null);
  const [swappingState, setSwappingState] = useState<{
    routine: WorkoutRoutine;
    exerciseIndex: number;
  } | null>(null);

  // Automatically show brief live-syncing indicator on initial app open & foreground focus
  useEffect(() => {
    const triggerVisualAutoSync = () => {
      if (document.visibilityState === 'visible') {
        setIsSyncingWatchNow(true);
        const t = setTimeout(() => setIsSyncingWatchNow(false), 1800);
        return () => clearTimeout(t);
      }
    };
    const cleanup = triggerVisualAutoSync();
    window.addEventListener('focus', triggerVisualAutoSync);
    document.addEventListener('visibilitychange', triggerVisualAutoSync);
    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('focus', triggerVisualAutoSync);
      document.removeEventListener('visibilitychange', triggerVisualAutoSync);
    };
  }, []);

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday

  // Daily Steps State (Fitbit 8,000 steps/day goal) — strictly keyed by today's local date
  const [stepsByDate, setStepsByDate] = useState<Record<string, DailyStepsEntry>>(() => {
    try {
      // Remove any legacy v1 key that had seeded/yesterday steps
      localStorage.removeItem('apex_fitbit_daily_steps_v1');
      const saved = localStorage.getItem(STEPS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {};
  });
  const [customStepInput, setCustomStepInput] = useState('');
  const [isEditingSteps, setIsEditingSteps] = useState(false);

  // Refresh today's date & reload latest synced steps whenever app is opened or focused
  useEffect(() => {
    const refreshStepsFromStorage = () => {
      const currentDay = getLocalTodayStr();
      setTodayStr(currentDay);
      try {
        const saved = localStorage.getItem(STEPS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setStepsByDate(parsed);
          }
        }
      } catch {}
    };

    refreshStepsFromStorage();
    window.addEventListener('focus', refreshStepsFromStorage);
    document.addEventListener('visibilitychange', refreshStepsFromStorage);
    return () => {
      window.removeEventListener('focus', refreshStepsFromStorage);
      document.removeEventListener('visibilitychange', refreshStepsFromStorage);
    };
  }, []);

  // Apply live synced today steps from Fitbit/Watch every time it syncs
  useEffect(() => {
    const currentDay = getLocalTodayStr();
    setTodayStr(currentDay);
    if (syncedTodaySteps === undefined) return;

    setStepsByDate((prev) => {
      const existing = prev[currentDay];
      if (syncedTodaySteps !== null && syncedTodaySteps > 0) {
        const bestSteps = Math.max(
          typeof existing?.steps === 'number' ? existing.steps : 0,
          syncedTodaySteps
        );
        const nextEntry: DailyStepsEntry = {
          steps: bestSteps,
          syncedAt:
            fitbitLastSync ||
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hasData: true,
        };
        const nextMap = { ...prev, [currentDay]: nextEntry };
        try {
          localStorage.setItem(STEPS_STORAGE_KEY, JSON.stringify(nextMap));
        } catch {}
        return nextMap;
      } else if (
        !existing?.manualOverride &&
        !(existing?.hasData && typeof existing.steps === 'number' && existing.steps > 0)
      ) {
        const nextEntry: DailyStepsEntry = {
          steps: null,
          syncedAt:
            fitbitLastSync ||
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hasData: false,
        };
        const nextMap = { ...prev, [currentDay]: nextEntry };
        try {
          localStorage.setItem(STEPS_STORAGE_KEY, JSON.stringify(nextMap));
        } catch {}
        return nextMap;
      }
      return prev;
    });
  }, [syncedTodaySteps, fitbitLastSync]);

  // Also check if today's synced workout logs contain Fitbit step counts for TODAY only
  const todayLogsWithSteps = logs.filter(
    (l) => l.date === todayStr && typeof l.steps === 'number' && l.steps > 0
  );
  const fitbitWorkoutStepsToday = todayLogsWithSteps.reduce(
    (acc, l) => acc + (l.steps || 0),
    0
  );

  const todayEntry = stepsByDate[todayStr];
  const hasStepsDataForToday =
    (todayEntry?.hasData && typeof todayEntry.steps === 'number') ||
    todayLogsWithSteps.length > 0;

  const todaySteps = hasStepsDataForToday
    ? Math.max(todayEntry?.steps ?? 0, fitbitWorkoutStepsToday)
    : 0;
  const stepsProgressPct = hasStepsDataForToday
    ? Math.min(100, Math.round((todaySteps / FITBIT_DAILY_STEP_GOAL) * 100))
    : 0;
  const stepsRemaining = Math.max(0, FITBIT_DAILY_STEP_GOAL - todaySteps);
  const estimatedKm = (todaySteps * 0.000762).toFixed(2);
  const estimatedStepCalories = Math.round(todaySteps * 0.04);

  const updateTodaySteps = (newSteps: number | null) => {
    const currentDay = getLocalTodayStr();
    setTodayStr(currentDay);
    setStepsByDate((prev) => {
      const nextEntry: DailyStepsEntry =
        newSteps === null
          ? {
              steps: null,
              syncedAt: fitbitLastSync || undefined,
              hasData: false,
              manualOverride: false,
            }
          : {
              steps: Math.max(0, Math.min(100000, Math.round(newSteps))),
              syncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              hasData: true,
              manualOverride: true,
            };
      const next = {
        ...prev,
        [currentDay]: nextEntry,
      };
      try {
        localStorage.setItem(STEPS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const todaySchedule = WEEKLY_SCHEDULE[dayOfWeek];
  const todayLogs = logs.filter((l) => l.date === todayStr);
  const isTodayCompleted = todayLogs.length > 0;

  // Routines
  const mcgillRoutine = routines.find((r) => r.id === 'mcgill-big-3') || routines[0];
  const strengthRoutine = routines.find((r) => r.id === 'strength') || routines[1];
  const coreStabilityRoutine =
    routines.find((r) => r.id === 'core-stability-strength') || routines[2];
  const cardioRoutine =
    routines.find((r) => r.id === 'cardio-session') || routines[routines.length - 1];

  const nextRecommendedRoutine = (() => {
    for (const item of todaySchedule.plannedRoutines) {
      const alreadyDone = todayLogs.some((l) => l.routineId === item.routineId);
      if (!alreadyDone) {
        return routines.find((r) => r.id === item.routineId) || strengthRoutine;
      }
    }
    return strengthRoutine;
  })();

  // Monday-to-Sunday 7-day strip
  const currentDayIndex = today.getDay();
  const mondayOffset = currentDayIndex === 0 ? -6 : 1 - currentDayIndex;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const weekOverview = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    const dow = d.getDay();
    const sched = WEEKLY_SCHEDULE[dow];
    const isCompleted = logs.some((l) => l.date === dStr);
    const isCurrentToday = dStr === todayStr;

    return {
      dateStr: dStr,
      dayNum: d.getDate(),
      dayShort: sched.dayShort,
      isRestDay: !!sched.isRestDay,
      plannedList: sched.plannedRoutines,
      isCompleted,
      isCurrentToday,
    };
  });

  // Streak & Weekly Goal
  const calculateStreak = () => {
    let streak = 0;
    const checkDate = new Date(today);
    const logsByDate = new Set(logs.map((l) => l.date));

    while (true) {
      const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (logsByDate.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (streak === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yesterdayStr = `${checkDate.getFullYear()}-${String(
            checkDate.getMonth() + 1
          ).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
          if (logsByDate.has(yesterdayStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }
    return streak;
  };

  const currentStreak = calculateStreak();
  const weekDatesSet = new Set(weekOverview.map((w) => w.dateStr));
  const totalWorkoutsThisWeek = logs.filter((l) => weekDatesSet.has(l.date)).length;
  const weeklyTarget = 6;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* 1. Clean Top Header (Fitbit Sync, Install App, and Reminders moved to bottom Settings tab) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            {today.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Workout Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenCoach()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-xs font-bold text-blue-300 hover:text-white transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Ask Gemini Coach</span>
          </button>
        </div>
      </div>

      {/* 2. Streamlined "Today's Workout" Hero Card + Compact Streak Bar */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#121828] via-[#0E1320] to-[#0A0D14] border border-blue-500/40 p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Status & Streak Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Today • {todaySchedule.dayName}
              </span>

              {isTodayCompleted ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Done Today
                </span>
              ) : null}

              <button
                onClick={onSelectCalendarTab}
                className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/15 text-orange-300 border border-orange-500/30 flex items-center gap-1 hover:bg-orange-500/25 transition-colors"
              >
                <Flame className="w-3.5 h-3.5 text-orange-400 fill-current" />
                <span>{currentStreak}d Streak</span>
              </button>

              <button
                onClick={onSelectCalendarTab}
                className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 hover:bg-emerald-500/25 transition-colors"
              >
                <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {totalWorkoutsThisWeek}/{weeklyTarget} This Week
                </span>
              </button>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {todaySchedule.isRestDay
                ? 'Sunday Rest & Recovery'
                : todaySchedule.plannedRoutines.map((p) => p.routineTitle).join(' + ')}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {todaySchedule.isRestDay
                ? 'Active recovery day. Optional: run through the 15-minute McGill Big 3 spine hygiene protocol.'
                : todaySchedule.plannedRoutines[0]?.category === 'strength'
                ? "5×3 Pull-Ups, 4×12 Push-Ups, 3×8 Diamond Push-Ups, 4×15 Squats & 3×10m Farmer's Carries (or swap any exercise from our 108-exercise library)."
                : '35-minute low-impact interval conditioning. Choose between outdoor E-Bike or indoor Spinning.'}
            </p>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            <button
              onClick={() =>
                setVideoModalState({
                  routine: todaySchedule.isRestDay ? mcgillRoutine : nextRecommendedRoutine,
                  exerciseIndex: 0,
                })
              }
              className="py-3.5 px-5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Video className="w-4 h-4 text-blue-400" />
              <span>Watch Videos</span>
            </button>

            <button
              onClick={() =>
                onStartRoutine(todaySchedule.isRestDay ? mcgillRoutine : nextRecommendedRoutine)
              }
              className="py-3.5 px-7 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 transition-transform active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {todaySchedule.isRestDay
                  ? 'Start McGill Big 3'
                  : `Start ${nextRecommendedRoutine.title}`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 2B. Fitbit Daily Steps Goal Tracker (8,000 Steps / Day — Live Reading for Today Only) */}
      <div className="bg-gradient-to-r from-[#0D1520] via-[#0F1824] to-[#0C131E] border border-teal-500/35 rounded-3xl p-4 sm:p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Ring & Step Count */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="33"
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth="7"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="33"
                  fill="none"
                  stroke={
                    !hasStepsDataForToday
                      ? '#334155'
                      : todaySteps >= FITBIT_DAILY_STEP_GOAL
                      ? '#10B981'
                      : '#14B8A6'
                  }
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 33}
                  strokeDashoffset={
                    !hasStepsDataForToday
                      ? 2 * Math.PI * 33
                      : 2 * Math.PI * 33 * (1 - Math.min(1, todaySteps / FITBIT_DAILY_STEP_GOAL))
                  }
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Footprints
                  className={`w-4 h-4 mb-0.5 ${
                    hasStepsDataForToday ? 'text-teal-400' : 'text-slate-500'
                  }`}
                />
                <span className="text-[11px] font-black text-white">
                  {hasStepsDataForToday ? `${stepsProgressPct}%` : '—'}
                </span>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      hasStepsDataForToday
                        ? 'bg-emerald-400 animate-pulse'
                        : 'bg-amber-400'
                    }`}
                  />
                  <Watch className="w-3 h-3 text-teal-400" />
                  <span>
                    Live Fitbit Steps ({todayStr})
                    {todayEntry?.syncedAt || fitbitLastSync
                      ? ` • Synced ${todayEntry?.syncedAt || fitbitLastSync}`
                      : ''}
                  </span>
                </span>
                {hasStepsDataForToday && todaySteps >= FITBIT_DAILY_STEP_GOAL && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>8,000 Goal Reached!</span>
                  </span>
                )}
              </div>

              {hasStepsDataForToday ? (
                <>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                      {todaySteps.toLocaleString()}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-400">
                      / {FITBIT_DAILY_STEP_GOAL.toLocaleString()} steps today
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                    <span>
                      {stepsRemaining > 0
                        ? `${stepsRemaining.toLocaleString()} steps to reach 8,000 goal`
                        : 'Daily 8,000 step target complete!'}
                    </span>
                    <span>•</span>
                    <span className="text-teal-300 font-semibold">~{estimatedKm} km</span>
                    <span>•</span>
                    <span className="text-orange-300 font-semibold">
                      ~{estimatedStepCalories} kcal
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline gap-2.5 mt-1.5">
                    <span className="text-xl sm:text-2xl font-extrabold text-amber-300 tracking-tight">
                      No data for today
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      (Goal: {FITBIT_DAILY_STEP_GOAL.toLocaleString()} steps / day)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Your watch hasn&apos;t synced step data for today ({todayStr}) yet. Open the
                    Fitbit app on your phone to sync your watch, then tap{' '}
                    <strong className="text-teal-300">Live Sync Watch</strong>.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Right: Live Watch Sync & Quick Step Controls */}
          <div className="flex flex-col sm:items-end justify-center gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => {
                  if (onRequestLiveWatchSync) {
                    setIsSyncingWatchNow(true);
                    onRequestLiveWatchSync();
                    setTimeout(() => setIsSyncingWatchNow(false), 2000);
                  } else {
                    onOpenFitbitModal();
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/20 transition-all"
                title="1-Click automated sync of live steps & workouts from Fitbit / Google Health"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSyncingWatchNow ? 'animate-spin' : ''}`}
                />
                <span>{isSyncingWatchNow ? 'Syncing Live...' : '1-Click Sync Watch'}</span>
              </button>
              <button
                onClick={() => updateTodaySteps(todaySteps + 500)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-teal-300 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>500</span>
              </button>
              <button
                onClick={() => updateTodaySteps(todaySteps + 1000)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-teal-300 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>1,000</span>
              </button>
              <button
                onClick={() => updateTodaySteps(FITBIT_DAILY_STEP_GOAL)}
                className="px-3 py-1.5 rounded-xl bg-teal-600/25 hover:bg-teal-600/35 border border-teal-500/40 text-xs font-bold text-teal-200 flex items-center gap-1 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                <span>8,000 Goal</span>
              </button>
              <button
                onClick={() => setIsEditingSteps((prev) => !prev)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Set Exact
              </button>
              {hasStepsDataForToday && (
                <button
                  onClick={() => updateTodaySteps(null)}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Clear today's manual steps"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isEditingSteps && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = parseInt(customStepInput.replace(/,/g, ''), 10);
                  if (!isNaN(val)) {
                    updateTodaySteps(val);
                    setIsEditingSteps(false);
                    setCustomStepInput('');
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="number"
                  min={0}
                  max={100000}
                  placeholder="Enter today's Fitbit steps..."
                  value={customStepInput}
                  onChange={(e) => setCustomStepInput(e.target.value)}
                  className="w-44 px-3 py-1.5 rounded-xl bg-slate-950 border border-teal-500/50 text-xs text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold"
                >
                  Save
                </button>
              </form>
            )}

            {/* Progress Bar */}
            <div className="w-full sm:w-64 h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${stepsProgressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2C. Personal YouTube Music Workout Widget Bar */}
      <YouTubeMusicBar />

      {/* 3. Compact 7-Day Schedule Strip (Mon=Strength, Tue=Cardio alternating, Sun=Rest) */}
      <div className="bg-[#0F131D] border border-slate-800 rounded-3xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Weekly Split (Mon–Sat Alternating • Sun Rest)
            </h3>
          </div>
          <button
            onClick={onSelectCalendarTab}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <span>Calendar</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {weekOverview.map((item) => {
            const firstPlan = item.plannedList[0];
            return (
              <button
                key={item.dateStr}
                onClick={onSelectCalendarTab}
                className={`rounded-2xl p-2 sm:p-3 text-left transition-all border flex flex-col justify-between ${
                  item.isCurrentToday
                    ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/30'
                    : item.isCompleted
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] sm:text-xs font-bold ${
                      item.isCurrentToday ? 'text-blue-400' : 'text-slate-400'
                    }`}
                  >
                    {item.dayShort}
                  </span>
                  {item.isCompleted && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                </div>

                <div className="mt-2">
                  <span
                    className={`text-[10px] sm:text-[11px] font-bold block truncate ${
                      item.isRestDay
                        ? 'text-slate-500'
                        : firstPlan?.category === 'strength'
                        ? 'text-emerald-300'
                        : 'text-blue-300'
                    }`}
                  >
                    {item.isRestDay
                      ? 'Rest'
                      : firstPlan?.category === 'strength'
                      ? 'Strength'
                      : 'Cardio'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Workout Routines Grid with Short-Form & Detailed Video Guides, Cool-Down Timers & 20+ Exercise Replacements */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Workouts, Cool-Down Timers &amp; Exercise Video Guides
            </h3>
            <p className="text-xs text-slate-400">
              Tap any exercise for <strong>Short-Form (Shorts style)</strong> &amp;{' '}
              <strong>Detailed</strong> videos, or click{' '}
              <span className="text-emerald-400 font-bold">Replace</span> to swap from 20+ matching
              exercises per muscle group
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            strengthRoutine,
            coreStabilityRoutine,
            mcgillRoutine,
            cardioRoutine,
            ...customRoutines,
          ]
            .filter(Boolean)
            .map((routine) => {
              const themes = {
                emerald: {
                  border: 'border-emerald-900/50 hover:border-emerald-500/50',
                  badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                  btn: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20',
                  chip: 'hover:border-emerald-500/50 hover:text-emerald-200',
                  icon: <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />,
                },
                orange: {
                  border: 'border-orange-900/50 hover:border-orange-500/50',
                  badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
                  btn: 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/20',
                  chip: 'hover:border-orange-500/50 hover:text-orange-200',
                  icon: <Target className="w-3.5 h-3.5 text-orange-400" />,
                },
                purple: {
                  border: 'border-purple-900/50 hover:border-purple-500/50',
                  badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
                  btn: 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20',
                  chip: 'hover:border-purple-500/50 hover:text-purple-200',
                  icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />,
                },
                blue: {
                  border: 'border-blue-900/50 hover:border-blue-500/50',
                  badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                  btn: 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20',
                  chip: 'hover:border-blue-500/50 hover:text-blue-200',
                  icon: <Zap className="w-3.5 h-3.5 text-blue-400" />,
                },
              };
              const colorMap = themes[routine.accentColor] || themes.blue;

              return (
                <div
                  key={routine.id}
                  className={`bg-[#0F131D] border ${colorMap.border} rounded-3xl p-5 flex flex-col justify-between shadow-lg transition-all`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${colorMap.badge}`}
                      >
                        {colorMap.icon}
                        <span>{routine.tag}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        {routine.category === 'strength' && (
                          <button
                            onClick={() => setEditingRoutine(routine)}
                            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                            title="Customize sets, reps & cool-down timers"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Timers</span>
                          </button>
                        )}
                        <span className="text-xs font-mono text-slate-400">
                          {routine.durationMinutes}m
                        </span>
                      </div>
                    </div>

                    <h4 className="text-lg font-bold text-white">{routine.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5 mb-3">{routine.subtitle}</p>

                    {/* Clickable Exercise Video Chips + Replace button */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                        {routine.category === 'strength'
                          ? 'Exercises (Tap for Shorts/Detailed Video • Click Replace for 20+ Matches):'
                          : 'Exercises (Tap for Shorts/Detailed Video & Cool-Down Timing):'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {routine.exercises.map((ex, idx) => {
                          const matchCount = getAlternativesForExercise(ex).alternatives.length;
                          return (
                            <div
                              key={`${ex.id}-${idx}`}
                              className="inline-flex items-center rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden"
                            >
                              <button
                                onClick={() =>
                                  setVideoModalState({ routine, exerciseIndex: idx })
                                }
                                className={`text-left text-[11px] px-2.5 py-1.5 text-slate-200 flex items-center gap-1.5 transition-colors ${colorMap.chip}`}
                              >
                                <Video className="w-3 h-3 text-blue-400 shrink-0" />
                                <span className="font-medium">{ex.name}</span>
                                <span className="text-[9px] font-mono text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <Timer className="w-2.5 h-2.5 text-emerald-400" />
                                  {ex.defaultRestSeconds}s rest
                                </span>
                              </button>
                              {routine.category === 'strength' && (
                                <button
                                  onClick={() =>
                                    setSwappingState({ routine, exerciseIndex: idx })
                                  }
                                  className="px-2 py-1.5 border-l border-slate-800 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-200 transition-colors flex items-center gap-1 text-[10px] font-bold"
                                  title={`Replace with ${matchCount} matching exercises for this muscle group`}
                                >
                                  <Shuffle className="w-3 h-3" />
                                  <span>Replace ({matchCount})</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            setVideoModalState({ routine, exerciseIndex: 0 })
                          }
                          className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                        >
                          <Video className="w-3.5 h-3.5 text-blue-400" />
                          <span>Shorts &amp; Detailed Video</span>
                        </button>

                        <button
                          onClick={() => onOpenCoach(routine.exercises[0])}
                          className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI Tips</span>
                        </button>
                      </div>

                      <button
                        onClick={() => onStartRoutine(routine)}
                        className={`py-2 px-4 rounded-full text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-transform active:scale-[0.98] ${colorMap.btn}`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start</span>
                      </button>
                    </div>

                    {routine.category === 'strength' && (
                      <button
                        onClick={() =>
                          setSwappingState({ routine, exerciseIndex: 0 })
                        }
                        className="w-full py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Shuffle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          Replace Exercise (20+ Matches per Muscle Group)
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Video & Biomechanics Guide Modal */}
      <WorkoutAnatomyModal
        routine={videoModalState?.routine || null}
        initialExerciseIndex={videoModalState?.exerciseIndex || 0}
        isOpen={!!videoModalState}
        onClose={() => setVideoModalState(null)}
        onStartExercise={(routine, exIdx) => {
          onStartRoutine(routine, exIdx);
        }}
        onAskCoach={(exercise) => {
          onOpenCoach(exercise);
        }}
      />

      {/* Edit Routine Modal */}
      {editingRoutine && (
        <EditRoutineModal
          routine={editingRoutine}
          isOpen={!!editingRoutine}
          onClose={() => setEditingRoutine(null)}
          onSaveRoutine={(updated) => {
            if (onUpdateRoutine) onUpdateRoutine(updated);
          }}
          onResetToDefault={() => {
            if (onResetRoutines) onResetRoutines();
            setEditingRoutine(null);
          }}
        />
      )}

      {/* Replace / Swap Exercise Modal on Dashboard */}
      <SkipExerciseModal
        isOpen={!!swappingState}
        exerciseToSkip={
          swappingState
            ? swappingState.routine.exercises[swappingState.exerciseIndex] || null
            : null
        }
        onClose={() => setSwappingState(null)}
        onSelectAlternative={(replacement) => {
          if (swappingState && onUpdateRoutine) {
            const updatedExercises = swappingState.routine.exercises.map((ex, idx) =>
              idx === swappingState.exerciseIndex ? replacement : ex
            );
            onUpdateRoutine({
              ...swappingState.routine,
              exercises: updatedExercises,
            });
          }
          setSwappingState(null);
        }}
      />
    </div>
  );
};
