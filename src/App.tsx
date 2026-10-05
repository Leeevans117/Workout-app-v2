import React, { useState, useEffect } from 'react';
import { WorkoutRoutine, WorkoutLogEntry, CardioMode, Exercise } from './types/workout';
import { WORKOUT_ROUTINES } from './data/workoutPlan';
import { ALTERNATIVE_EXERCISE_ARSENAL } from './data/exerciseAlternatives';
import { MainDashboard } from './components/MainDashboard';
import { BuildYourOwnStudio } from './components/BuildYourOwnStudio';
import { McGillBig3Module } from './components/McGillBig3Module';
import { CalendarDashboard } from './components/CalendarDashboard';
import { WorkoutTimerScreen } from './components/WorkoutTimerScreen';
import { CardioSelectorModal } from './components/CardioSelectorModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { FitbitSyncModal } from './components/FitbitSyncModal';
import { DailyNotificationModal } from './components/DailyNotificationModal';
import { GeminiCoachWidget } from './components/GeminiCoachWidget';
import { WorkoutAnatomyModal } from './components/WorkoutAnatomyModal';
import { soundEngine } from './utils/audioNotification';
import { notificationService, InAppNotificationPayload } from './utils/notificationService';
import { usePWAInstall } from './hooks/usePWAInstall';
import {
  Activity,
  ShieldCheck,
  Calendar as CalendarIcon,
  Volume2,
  VolumeX,
  Smartphone,
  BellRing,
  Sparkles,
  Watch,
  Layers,
  X,
  Settings,
  Bell,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

const STORAGE_KEY = 'apex_pulse_workout_logs';
const ROUTINES_STORAGE_KEY = 'apex_routines_v4';
const CUSTOM_ROUTINES_STORAGE_KEY = 'apex_custom_routines_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'builder' | 'mcgill' | 'calendar' | 'settings'
  >(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'dashboard') return 'dashboard';
    }
    return 'dashboard';
  });
  const [activeWorkoutRoutine, setActiveWorkoutRoutine] = useState<WorkoutRoutine | null>(null);
  const [initialExerciseIndex, setInitialExerciseIndex] = useState(0);
  const [isCardioModalOpen, setIsCardioModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isFitbitModalOpen, setIsFitbitModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [fitbitConnected, setFitbitConnected] = useState(false);
  const [fitbitLastSync, setFitbitLastSync] = useState<string | null>(() => {
    try {
      return localStorage.getItem('apex_fitbit_last_sync');
    } catch {
      return null;
    }
  });
  const [syncedTodaySteps, setSyncedTodaySteps] = useState<number | null | undefined>(() => {
    try {
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(now.getDate()).padStart(2, '0')}`;
      const raw = localStorage.getItem('apex_fitbit_daily_steps_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed[todayKey] && typeof parsed[todayKey].steps === 'number') {
          return parsed[todayKey].steps;
        }
      }
    } catch {}
    return undefined;
  });
  const [watchSyncTrigger, setWatchSyncTrigger] = useState(1);

  // Automatically trigger the Watch Sync button press every time the app opens or returns to foreground
  useEffect(() => {
    const triggerAutoWatchSync = () => {
      if (document.visibilityState === 'visible') {
        setWatchSyncTrigger((prev) => prev + 1);
      }
    };

    window.addEventListener('focus', triggerAutoWatchSync);
    document.addEventListener('visibilitychange', triggerAutoWatchSync);
    return () => {
      window.removeEventListener('focus', triggerAutoWatchSync);
      document.removeEventListener('visibilitychange', triggerAutoWatchSync);
    };
  }, []);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [coachExercise, setCoachExercise] = useState<Exercise | null>(null);
  const [videoGuideState, setVideoGuideState] = useState<{
    routine: WorkoutRoutine;
    exerciseIndex: number;
  } | null>(null);
  const [pendingCardioRoutine, setPendingCardioRoutine] = useState<WorkoutRoutine | null>(null);
  const [selectedCardioMode, setSelectedCardioMode] = useState<CardioMode>('ebike');
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const [activeToast, setActiveToast] = useState<InAppNotificationPayload | null>(null);
  const { isInstalled } = usePWAInstall();

  const navigateToDashboardFromNotification = () => {
    setActiveWorkoutRoutine(null);
    setIsCardioModalOpen(false);
    setIsInstallModalOpen(false);
    setIsFitbitModalOpen(false);
    setIsNotifModalOpen(false);
    setIsCoachOpen(false);
    setVideoGuideState(null);
    setActiveToast(null);
    setActiveTab('dashboard');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const unsubAlert = notificationService.subscribeInAppAlert((payload) => {
      setActiveToast(payload);
    });
    const unsubClick = notificationService.subscribeNotificationClick(() => {
      navigateToDashboardFromNotification();
    });
    return () => {
      unsubAlert();
      unsubClick();
    };
  }, []);

  // Custom Routines created in "Build Your Own" Studio
  const [customRoutines, setCustomRoutines] = useState<WorkoutRoutine[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_ROUTINES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_ROUTINES_STORAGE_KEY, JSON.stringify(customRoutines));
    } catch {}
  }, [customRoutines]);

  const handleSaveCustomRoutine = (routine: WorkoutRoutine) => {
    setCustomRoutines((prev) => {
      const exists = prev.some((r) => r.id === routine.id);
      if (exists) {
        return prev.map((r) => (r.id === routine.id ? routine : r));
      }
      return [routine, ...prev];
    });
  };

  const handleDeleteCustomRoutine = (id: string) => {
    setCustomRoutines((prev) => prev.filter((r) => r.id !== id));
  };

  // Dynamic Routines State (ensuring videoReference from WORKOUT_ROUTINES is always present)
  const [routines, setRoutines] = useState<WorkoutRoutine[]>(() => {
    try {
      const saved = localStorage.getItem(ROUTINES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return WORKOUT_ROUTINES.map((defaultRoutine) => {
            const custom = parsed.find((r: any) => r && r.id === defaultRoutine.id);
            if (!custom || !Array.isArray(custom.exercises)) return defaultRoutine;
            return {
              ...defaultRoutine,
              ...custom,
              accentColor: defaultRoutine.accentColor,
              exercises: custom.exercises
                .filter((ex: any) => ex && ex.name && !/suitcase\s*carr/i.test(ex.name))
                .map((ex: any) => {
                  const defaultEx =
                    defaultRoutine.exercises.find((de) => de.id === ex.id) ||
                    ALTERNATIVE_EXERCISE_ARSENAL.find((ae) => ae.id === ex.id);
                  return {
                    ...(defaultEx || {}),
                    ...ex,
                    targetedMuscles: Array.isArray(ex.targetedMuscles)
                      ? ex.targetedMuscles
                      : defaultEx?.targetedMuscles || ['Core'],
                    formCues: Array.isArray(ex.formCues)
                      ? ex.formCues
                      : defaultEx?.formCues || [],
                    videoReference: defaultEx?.videoReference || ex.videoReference,
                  };
                }),
            };
          });
        }
      }
    } catch {}
    return WORKOUT_ROUTINES;
  });

  const handleUpdateRoutine = (updated: WorkoutRoutine) => {
    const cleaned: WorkoutRoutine = {
      ...updated,
      exercises: updated.exercises.filter((ex) => !/suitcase\s*carr/i.test(ex.name)),
    };
    if (cleaned.id.startsWith('custom-routine-')) {
      handleSaveCustomRoutine(cleaned);
      return;
    }
    setRoutines((prev) => {
      const next = prev.map((r) => (r.id === cleaned.id ? cleaned : r));
      try {
        localStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleResetRoutines = () => {
    setRoutines(WORKOUT_ROUTINES);
    try {
      localStorage.removeItem(ROUTINES_STORAGE_KEY);
      localStorage.removeItem('apex_routines_v3');
      localStorage.removeItem('apex_routines_v2');
      localStorage.removeItem('apex_routines');
    } catch {}
  };

  // Workout Logs State
  const [logs, setLogs] = useState<WorkoutLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => item && typeof item.date === 'string');
        }
      }
    } catch {}

    const today = new Date();
    const result: WorkoutLogEntry[] = [];

    for (const offset of [1, 2, 4, 6]) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      result.push({
        id: `seed-${dateStr}`,
        date: dateStr,
        routineId: offset % 2 === 0 ? 'strength' : 'cardio-session',
        routineTitle: offset % 2 === 0 ? 'Strength' : 'E-Bike Outdoor Session',
        category: offset % 2 === 0 ? 'strength' : 'cardio',
        durationSeconds: offset % 2 === 0 ? 1800 : 2100,
        completedExercisesCount: offset % 2 === 0 ? 5 : 1,
        cardioMode: offset % 2 === 0 ? undefined : 'ebike',
        averageHeartRate: offset === 1 ? 136 : offset === 2 ? 118 : offset === 4 ? 124 : 142,
        timestamp: d.getTime(),
      });
    }

    return result;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch {}
  }, [logs]);

  const handleStartRoutine = (routine: WorkoutRoutine, exerciseIndex: number = 0) => {
    if (routine.isCardioSpecial) {
      setPendingCardioRoutine(routine);
      setIsCardioModalOpen(true);
    } else {
      setInitialExerciseIndex(exerciseIndex);
      setActiveWorkoutRoutine(routine);
    }
  };

  const handleSelectCardioMode = (mode: CardioMode) => {
    setSelectedCardioMode(mode);
    if (pendingCardioRoutine) {
      setInitialExerciseIndex(0);
      setActiveWorkoutRoutine(pendingCardioRoutine);
      setPendingCardioRoutine(null);
    }
  };

  const handleWorkoutComplete = (durationSeconds: number, cardioMode?: CardioMode) => {
    if (!activeWorkoutRoutine) return;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const newLog: WorkoutLogEntry = {
      id: `log-${Date.now()}`,
      date: todayStr,
      routineId: activeWorkoutRoutine.id,
      routineTitle: activeWorkoutRoutine.title,
      category: activeWorkoutRoutine.category,
      durationSeconds,
      completedExercisesCount: activeWorkoutRoutine.exercises.length,
      cardioMode,
      timestamp: Date.now(),
    };

    setLogs((prev) => [newLog, ...prev]);
    setActiveWorkoutRoutine(null);
    setActiveTab('calendar');
  };

  const handleToggleDateCompletion = (dateStr: string) => {
    setLogs((prev) => {
      const existing = prev.filter((l) => l.date === dateStr);
      if (existing.length > 0) {
        return prev.filter((l) => l.date !== dateStr);
      } else {
        const manualLog: WorkoutLogEntry = {
          id: `manual-${Date.now()}`,
          date: dateStr,
          routineId: 'strength',
          routineTitle: 'Strength Session',
          category: 'strength',
          durationSeconds: 1800,
          completedExercisesCount: 5,
          timestamp: Date.now(),
        };
        return [manualLog, ...prev];
      }
    });
  };

  const handleAddCustomLog = (
    dateStr: string,
    title: string,
    durationMinutes: number,
    averageHeartRate?: number
  ) => {
    const newLog: WorkoutLogEntry = {
      id: `custom-${Date.now()}`,
      date: dateStr,
      routineId: 'custom',
      routineTitle: title,
      category: 'strength',
      durationSeconds: durationMinutes * 60,
      completedExercisesCount: 3,
      averageHeartRate,
      timestamp: Date.now(),
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const handleDeleteLog = (id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSyncFitbitLogs = (incomingFitbitLogs: WorkoutLogEntry[]): number => {
    if (!Array.isArray(incomingFitbitLogs) || incomingFitbitLogs.length === 0) {
      return 0;
    }

    let addedCount = 0;
    setLogs((prev) => {
      // Merge updated metrics (like newly extracted averageHeartRate) into already-synced entries
      const incomingById = new Map<string, WorkoutLogEntry>();
      const incomingByFitbitId = new Map<string, WorkoutLogEntry>();
      for (const item of incomingFitbitLogs) {
        incomingById.set(item.id, item);
        if (item.fitbitLogId) incomingByFitbitId.set(item.fitbitLogId, item);
      }

      let updatedExisting = false;
      const mergedPrev = prev.map((existing) => {
        const match =
          incomingById.get(existing.id) ||
          (existing.fitbitLogId ? incomingByFitbitId.get(existing.fitbitLogId) : undefined);
        if (match) {
          const nextHr = match.averageHeartRate ?? existing.averageHeartRate;
          const nextCals = match.caloriesBurned ?? existing.caloriesBurned;
          const nextSteps = match.steps ?? existing.steps;
          if (
            nextHr !== existing.averageHeartRate ||
            nextCals !== existing.caloriesBurned ||
            nextSteps !== existing.steps
          ) {
            updatedExisting = true;
            return {
              ...existing,
              averageHeartRate: nextHr,
              caloriesBurned: nextCals,
              steps: nextSteps,
            };
          }
        }
        return existing;
      });

      const existingIds = new Set(mergedPrev.map((l) => l.id));
      const existingFitbitIds = new Set(
        mergedPrev.map((l) => l.fitbitLogId).filter(Boolean) as string[]
      );

      const newEntries = incomingFitbitLogs.filter((entry) => {
        if (existingIds.has(entry.id)) return false;
        if (entry.fitbitLogId && existingFitbitIds.has(entry.fitbitLogId)) return false;
        return true;
      });

      addedCount = newEntries.length;
      if (newEntries.length === 0 && !updatedExisting) return prev;

      const combined = [...newEntries, ...mergedPrev];
      return combined.sort((a, b) => b.timestamp - a.timestamp);
    });

    return addedCount;
  };

  const toggleSound = () => {
    const nextMuted = soundEngine.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleOpenCoach = (exercise?: Exercise) => {
    setCoachExercise(exercise || null);
    setIsCoachOpen(true);
  };

  // Active fullscreen Workout Timer screen
  if (activeWorkoutRoutine) {
    return (
      <>
        <WorkoutTimerScreen
          routine={activeWorkoutRoutine}
          initialExerciseIndex={initialExerciseIndex}
          cardioMode={selectedCardioMode}
          onExit={() => setActiveWorkoutRoutine(null)}
          onWorkoutComplete={handleWorkoutComplete}
          onOpenCoach={handleOpenCoach}
          onUpdateRoutine={handleUpdateRoutine}
        />
        <GeminiCoachWidget
          isOpen={isCoachOpen}
          onClose={() => setIsCoachOpen(false)}
          routines={[...routines, ...customRoutines]}
          initialExercise={coachExercise}
        />
      </>
    );
  }

  const mcgillRoutine = routines.find((r) => r.isMcGillSpecial) || routines[0];

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col font-sans">
      {/* Clean Top Bar */}
      <header className="sticky top-0 z-30 bg-[#0B0E14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 text-left"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
            <span className="text-lg font-black tracking-tight text-white uppercase font-display">
              ApexPulse
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`hover:text-white transition-colors ${
                activeTab === 'dashboard' ? 'text-blue-400' : ''
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('builder')}
              className={`hover:text-white transition-colors flex items-center gap-1.5 ${
                activeTab === 'builder' ? 'text-emerald-400' : ''
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Build Your Own</span>
            </button>
            <button
              onClick={() => setActiveTab('mcgill')}
              className={`hover:text-white transition-colors ${
                activeTab === 'mcgill' ? 'text-purple-400' : ''
              }`}
            >
              McGill Big 3
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`hover:text-white transition-colors ${
                activeTab === 'calendar' ? 'text-emerald-400' : ''
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`hover:text-white transition-colors flex items-center gap-1.5 ${
                activeTab === 'settings' ? 'text-amber-400' : ''
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>Settings</span>
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors border ${
                isMuted
                  ? 'bg-slate-900 text-slate-500 border-slate-800'
                  : 'bg-blue-600/20 text-blue-400 border-blue-500/40'
              }`}
              title={isMuted ? 'Sound Muted' : 'Sound Active'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => handleOpenCoach()}
              className="py-2 px-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/25 transition-transform active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Coach</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'dashboard' && (
          <MainDashboard
            routines={routines}
            customRoutines={customRoutines}
            logs={logs}
            onStartRoutine={handleStartRoutine}
            onSelectMcGillTab={() => setActiveTab('mcgill')}
            onSelectCalendarTab={() => setActiveTab('calendar')}
            onSelectBuilderTab={() => setActiveTab('builder')}
            onSaveCustomRoutine={handleSaveCustomRoutine}
            onDeleteCustomRoutine={handleDeleteCustomRoutine}
            onOpenCoach={handleOpenCoach}
            onOpenInstallModal={() => setIsInstallModalOpen(true)}
            onOpenFitbitModal={() => setIsFitbitModalOpen(true)}
            onRequestLiveWatchSync={() => setWatchSyncTrigger((prev) => prev + 1)}
            fitbitConnected={fitbitConnected}
            fitbitLastSync={fitbitLastSync}
            syncedTodaySteps={syncedTodaySteps}
            onUpdateRoutine={handleUpdateRoutine}
            onResetRoutines={handleResetRoutines}
          />
        )}

        {activeTab === 'builder' && (
          <BuildYourOwnStudio
            customRoutines={customRoutines}
            onSaveCustomRoutine={handleSaveCustomRoutine}
            onDeleteCustomRoutine={handleDeleteCustomRoutine}
            onStartRoutine={handleStartRoutine}
            onOpenCoach={handleOpenCoach}
          />
        )}

        {activeTab === 'mcgill' && (
          <McGillBig3Module
            routine={mcgillRoutine}
            onStartFullRoutine={() => handleStartRoutine(mcgillRoutine, 0)}
            onStartSingleExercise={(idx) => handleStartRoutine(mcgillRoutine, idx)}
            onOpenCoach={handleOpenCoach}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarDashboard
            logs={logs}
            onToggleDateCompletion={handleToggleDateCompletion}
            onAddCustomLog={handleAddCustomLog}
            onDeleteLog={handleDeleteLog}
            onOpenFitbitModal={() => setIsFitbitModalOpen(true)}
            fitbitConnected={fitbitConnected}
          />
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 pb-24 animate-in fade-in duration-300">
            <div className="rounded-3xl bg-gradient-to-br from-[#131A2B] via-[#0F1422] to-[#0A0E17] border border-slate-800 p-5 sm:p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block">
                    App &amp; Device Controls
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Settings &amp; Integrations
                  </h1>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl">
                Manage your Fitbit / Google Health automatic watch sync, install the Android app,
                configure daily ApexPulse notifications, and manage audio or workout defaults.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Sync Fitbit / Health */}
              <button
                onClick={() => setIsFitbitModalOpen(true)}
                className="text-left p-5 rounded-3xl bg-[#0F131D] hover:bg-[#141926] border border-teal-500/40 transition-all flex items-center justify-between gap-4 shadow-lg"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0">
                    <Watch className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">Sync Fitbit / Health</h3>
                      {fitbitConnected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Auto-Sync Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Automatically syncs your Fitbit Versa 4 workouts &amp; daily 8,000-step goal
                      every time you open the app.
                      {fitbitLastSync ? ` Last synced at ${fitbitLastSync}.` : ''}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </button>

              {/* 2. Install Android App */}
              <button
                onClick={() => setIsInstallModalOpen(true)}
                className="text-left p-5 rounded-3xl bg-[#0F131D] hover:bg-[#141926] border border-emerald-500/40 transition-all flex items-center justify-between gap-4 shadow-lg"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">Install Android App</h3>
                      {isInstalled && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Installed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Install ApexPulse as a standalone Android &amp; desktop app with full-screen
                      offline support.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </button>

              {/* 3. Daily Workout Reminders (Clean "ApexPulse" title + Click opens Dashboard) */}
              <button
                onClick={() => setIsNotifModalOpen(true)}
                className="text-left p-5 rounded-3xl bg-[#0F131D] hover:bg-[#141926] border border-purple-500/40 transition-all flex items-center justify-between gap-4 shadow-lg"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Daily Workout Reminders</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Clean &quot;ApexPulse&quot; notification bar alerts. Clicking any notification
                      takes you straight to the Workout Dashboard.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </button>

              {/* 4. Ask Gemini Coach */}
              <button
                onClick={() => handleOpenCoach()}
                className="text-left p-5 rounded-3xl bg-[#0F131D] hover:bg-[#141926] border border-blue-500/40 transition-all flex items-center justify-between gap-4 shadow-lg"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Interactive Gemini AI Coach</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Deep Thinking + live Google Search exercise biomechanics and recovery advisor.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </button>

              {/* 5. Timer Sound & Audio */}
              <button
                onClick={toggleSound}
                className="text-left p-5 rounded-3xl bg-[#0F131D] hover:bg-[#141926] border border-slate-800 transition-all flex items-center justify-between gap-4 shadow-lg"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 shrink-0">
                    {isMuted ? <VolumeX className="w-6 h-6 text-slate-400" /> : <Volume2 className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Workout Timer Audio: {isMuted ? 'Muted' : 'Active'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Toggle countdown beeps and rest completion chimes during workouts.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </button>

              {/* 6. Reset Default Workouts */}
              <button
                onClick={handleResetRoutines}
                className="text-left p-5 rounded-3xl bg-[#0F131D] hover:bg-[#141926] border border-slate-800 transition-all flex items-center justify-between gap-4 shadow-lg"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-rose-400 shrink-0">
                    <RotateCcw className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Reset Default Workout Splits</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Restore default exercises and cool-down timers on your built-in routines.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar (Dashboard, Build Your Own, McGill Big 3, Calendar, Settings) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0E14]/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-2">
        <div className="max-w-lg mx-auto grid grid-cols-5 items-center">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
              activeTab === 'dashboard'
                ? 'text-blue-400 font-bold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('builder')}
            className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
              activeTab === 'builder'
                ? 'text-emerald-400 font-bold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">Build Your Own</span>
          </button>

          <button
            onClick={() => setActiveTab('mcgill')}
            className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
              activeTab === 'mcgill'
                ? 'text-purple-400 font-bold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">McGill Big 3</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
              activeTab === 'calendar'
                ? 'text-emerald-400 font-bold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">Calendar</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
              activeTab === 'settings'
                ? 'text-amber-400 font-bold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">Settings</span>
          </button>
        </div>
      </nav>

      {/* Cardio Modality Selector Modal */}
      <CardioSelectorModal
        isOpen={isCardioModalOpen}
        onClose={() => {
          setIsCardioModalOpen(false);
          setPendingCardioRoutine(null);
        }}
        onSelectCardio={handleSelectCardioMode}
      />

      {/* Gemini Exercise Coach Modal */}
      <GeminiCoachWidget
        isOpen={isCoachOpen}
        onClose={() => setIsCoachOpen(false)}
        routines={[...routines, ...customRoutines]}
        initialExercise={coachExercise}
        onOpenVideoGuide={(routine, exerciseIndex) => {
          setVideoGuideState({ routine, exerciseIndex });
        }}
      />

      {/* Video Reference Modal launched from Gemini Coach */}
      <WorkoutAnatomyModal
        routine={videoGuideState?.routine || null}
        initialExerciseIndex={videoGuideState?.exerciseIndex || 0}
        isOpen={!!videoGuideState}
        onClose={() => setVideoGuideState(null)}
        onStartExercise={(routine, exIdx) => {
          handleStartRoutine(routine, exIdx);
        }}
        onAskCoach={handleOpenCoach}
      />

      {/* In-App Notification Toast — Clicking takes you directly to the Dashboard */}
      {activeToast && (
        <div
          onClick={() => navigateToDashboardFromNotification()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') navigateToDashboardFromNotification();
          }}
          className="fixed top-16 right-4 left-4 sm:left-auto sm:w-96 z-50 p-4 rounded-2xl bg-[#111625]/95 hover:bg-[#161D31] cursor-pointer backdrop-blur-md border border-blue-500/50 shadow-2xl animate-in fade-in slide-in-from-top-3 transition-colors"
          title="Click to go to Workout Dashboard"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                <BellRing className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">{activeToast.title}</h4>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  {activeToast.body}
                </p>
                <span className="inline-block mt-1 text-[10px] font-bold text-blue-400">
                  Tap notification to open Workout Dashboard →
                </span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveToast(null);
              }}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Daily Workout Reminders Modal */}
      <DailyNotificationModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
      />

      {/* PWA Install Modal */}
      <AndroidInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Fitbit Workout & Daily Steps Auto-Sync Modal */}
      <FitbitSyncModal
        isOpen={isFitbitModalOpen}
        onClose={() => setIsFitbitModalOpen(false)}
        existingLogs={logs}
        onSyncLogs={handleSyncFitbitLogs}
        syncTrigger={watchSyncTrigger}
        onSyncTodaySteps={(steps, _dateStr, syncTime) => {
          setSyncedTodaySteps(steps);
          setFitbitLastSync(syncTime);
        }}
        onStatusChange={(conn, lastSync) => {
          setFitbitConnected(conn);
          setFitbitLastSync(lastSync);
        }}
      />
    </div>
  );
}
