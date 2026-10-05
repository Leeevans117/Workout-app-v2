import React, { useState, useEffect, useRef } from 'react';
import { Exercise, WorkoutRoutine, CardioMode, TimerPhase } from '../types/workout';
import { ExerciseAnimator } from './ExerciseAnimator';
import { WorkoutAnatomyModal } from './WorkoutAnatomyModal';
import { SkipExerciseModal } from './SkipExerciseModal';
import { YouTubeMusicBar } from './YouTubeMusicBar';
import { soundEngine } from '../utils/audioNotification';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronLeft,
  CheckCircle2,
  ArrowRight,
  Video,
  Sparkles,
  Shuffle,
  Clock,
} from 'lucide-react';

interface WorkoutTimerScreenProps {
  routine: WorkoutRoutine;
  initialExerciseIndex?: number;
  cardioMode?: CardioMode;
  onExit: () => void;
  onWorkoutComplete: (durationSeconds: number, cardioMode?: CardioMode) => void;
  onOpenCoach?: (exercise: Exercise) => void;
  onUpdateRoutine?: (updatedRoutine: WorkoutRoutine) => void;
}

const POSITION_PREP_SECONDS = 10;

/**
 * Determines whether transitioning from `currentSet` to `nextSet` within `exercise`
 * requires the user to change their body position on the floor/equipment.
 * - Between different exercises: Always a new position (handled on exercise transition).
 * - McGill Side Plank (`mcgill-side-bridge`): Reps 1–6 are on the Left Side, Reps 7–12 are on the Right Side -> Position changes going from Set 6 to Set 7!
 * - McGill Modified Curl-Up (`mcgill-curl-up`): Switch which knee is bent halfway (after Rep 6 going into Rep 7) -> Position changes going from Set 6 to Set 7!
 * - McGill Bird Dog (`mcgill-bird-dog`): Stays in quadruped position while alternating limbs during the 10s rest; same floor position.
 * - Standard single-position sets (Pull-Ups, Push-Ups, Squats, etc.): Same position across sets of the same exercise.
 */
function doesRepTransitionChangeBodyPosition(exercise: Exercise, completedSet: number): boolean {
  if (exercise.id === 'mcgill-side-bridge' && completedSet === 6) {
    return true; // Switching from Left Side Plank (Reps 1-6) to Right Side Plank (Reps 7-12)
  }
  if (exercise.id === 'mcgill-curl-up' && completedSet === 6) {
    return true; // Switching bent leg after the first 6 reps
  }
  return false;
}

export const WorkoutTimerScreen: React.FC<WorkoutTimerScreenProps> = ({
  routine,
  initialExerciseIndex = 0,
  cardioMode,
  onExit,
  onWorkoutComplete,
  onOpenCoach,
  onUpdateRoutine,
}) => {
  const [sessionExercises, setSessionExercises] = useState<Exercise[]>(routine.exercises);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(initialExerciseIndex);
  const [currentSet, setCurrentSet] = useState(1);
  // Start every session and every new exercise position with a 10-second position prep countdown
  const [phase, setPhase] = useState<TimerPhase>('prep');
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const [isVideoGuideOpen, setIsVideoGuideOpen] = useState(false);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);

  const currentExercise = sessionExercises[currentExerciseIndex] || sessionExercises[0];
  const holdDuration = currentExercise.defaultHoldSeconds ?? 35;
  const restDuration = currentExercise.defaultRestSeconds ?? 60;

  const [timeRemaining, setTimeRemaining] = useState(POSITION_PREP_SECONDS);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const timeRef = useRef(timeRemaining);
  timeRef.current = timeRemaining;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  useEffect(() => {
    const timer = setInterval(() => {
      if (isPausedRef.current || phaseRef.current === 'finished') return;

      setTotalElapsedTime((t) => t + 1);

      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handlePhaseExpiration();
          return 0;
        }

        // Play countdown beeps during the final 3 seconds of either 10s Position Prep OR Cooldown
        if ((phaseRef.current === 'prep' || phaseRef.current === 'rest') && prev <= 4 && prev > 1) {
          soundEngine.playPrepCountdownBeep(prev === 2);
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentExerciseIndex, currentSet, holdDuration, restDuration]);

  const handlePhaseExpiration = () => {
    const currentPhase = phaseRef.current;

    if (currentPhase === 'prep') {
      // 10-second position setup countdown finished -> start active work!
      soundEngine.playStartWorkBeep();
      setPhase('active');
      setTimeRemaining(holdDuration);
    } else if (currentPhase === 'active') {
      soundEngine.playExerciseEndSound();

      if (currentSet < currentExercise.defaultSets) {
        // Check if the next rep/set requires changing body position (e.g. Left Side Plank -> Right Side Plank)
        if (doesRepTransitionChangeBodyPosition(currentExercise, currentSet)) {
          soundEngine.playRestStartSound();
          setCurrentSet((prev) => prev + 1);
          setPhase('prep');
          setTimeRemaining(POSITION_PREP_SECONDS);
        } else {
          // Same body position -> standard cooldown with 3s countdown at the end
          soundEngine.playRestStartSound();
          setPhase('rest');
          setTimeRemaining(restDuration);
        }
      } else {
        // Exercise finished -> moving to the NEXT exercise always changes body position, so trigger 10s Position Prep!
        if (currentExerciseIndex < sessionExercises.length - 1) {
          soundEngine.playRestStartSound();
          setCurrentExerciseIndex((prev) => prev + 1);
          setCurrentSet(1);
          setPhase('prep');
          setTimeRemaining(POSITION_PREP_SECONDS);
        } else {
          soundEngine.playWorkoutCompleteFanfare();
          setPhase('finished');
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#3B82F6', '#10B981', '#A855F7', '#F59E0B'],
          });
        }
      }
    } else if (currentPhase === 'rest') {
      // Same-position cooldown finished (including the 3-2-1 countdown) -> go straight into the next rep/set!
      soundEngine.playStartWorkBeep();
      setCurrentSet((prev) => prev + 1);
      setPhase('active');
      setTimeRemaining(holdDuration);
    }
  };

  const handleManualSkip = () => {
    handlePhaseExpiration();
  };

  const handleSwapExercise = (replacement: Exercise, savePermanently: boolean) => {
    const nextExercises = sessionExercises.map((ex, idx) =>
      idx === currentExerciseIndex ? replacement : ex
    );
    setSessionExercises(nextExercises);
    if (savePermanently && onUpdateRoutine) {
      onUpdateRoutine({
        ...routine,
        exercises: nextExercises,
      });
    }
    setCurrentSet(1);
    setPhase('prep');
    setTimeRemaining(POSITION_PREP_SECONDS);
    setIsSkipModalOpen(false);
    setIsPaused(false);
  };

  const handleSkipEntireExercise = () => {
    setIsSkipModalOpen(false);
    setIsPaused(false);
    if (currentExerciseIndex < sessionExercises.length - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
      setCurrentSet(1);
      setPhase('prep');
      setTimeRemaining(POSITION_PREP_SECONDS);
    } else {
      soundEngine.playWorkoutCompleteFanfare();
      setPhase('finished');
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#3B82F6', '#10B981', '#A855F7', '#F59E0B'],
      });
    }
  };

  const handleResetCurrent = () => {
    if (phase === 'prep') setTimeRemaining(POSITION_PREP_SECONDS);
    else if (phase === 'active') setTimeRemaining(holdDuration);
    else if (phase === 'rest') setTimeRemaining(restDuration);
  };

  const toggleSound = () => {
    const nextMuted = soundEngine.toggleMute();
    setIsMuted(nextMuted);
  };

  const getMcGillRepContext = (): string => {
    if (currentExercise.id === 'mcgill-side-bridge') {
      const side = currentSet <= 6 ? 'LEFT SIDE' : 'RIGHT SIDE';
      const sideRep = currentSet <= 6 ? currentSet : currentSet - 6;
      return `${side} • REP ${sideRep}/6 (${currentSet}/${currentExercise.defaultSets} TOTAL)`;
    }
    if (currentExercise.id === 'mcgill-bird-dog') {
      const side = currentSet % 2 === 1 ? 'LEFT ARM / RIGHT LEG' : 'RIGHT ARM / LEFT LEG';
      const sideRep = Math.ceil(currentSet / 2);
      return `${side} • REP ${sideRep}/6 (${currentSet}/${currentExercise.defaultSets} TOTAL)`;
    }
    if (currentExercise.id === 'mcgill-curl-up') {
      const pyramidStage =
        currentSet <= 6
          ? `SET 1 (REP ${currentSet}/6)`
          : currentSet <= 10
          ? `SET 2 (REP ${currentSet - 6}/4)`
          : `SET 3 (REP ${currentSet - 10}/2)`;
      return `6-4-2 PYRAMID • ${pyramidStage} (${currentSet}/12)`;
    }
    return `${
      currentExercise.repLabel || `${currentExercise.defaultReps || 10} REPS`
    } • REP/SET ${currentSet}/${currentExercise.defaultSets}`;
  };

  const getPhaseDetails = () => {
    switch (phase) {
      case 'prep': {
        const isStartingSession = currentExerciseIndex === 0 && currentSet === 1;
        const isSideSwitch =
          currentExercise.id === 'mcgill-side-bridge' && currentSet === 7;
        const isLegSwitch =
          currentExercise.id === 'mcgill-curl-up' && currentSet === 7;

        const prepTitle = isStartingSession
          ? `SESSION START PREP • ${timeRemaining}s`
          : isSideSwitch
          ? `CHANGE POSITION (SWITCH TO RIGHT SIDE) • ${timeRemaining}s`
          : isLegSwitch
          ? `CHANGE POSITION (SWITCH BENT KNEE) • ${timeRemaining}s`
          : `NEW POSITION SETUP • ${timeRemaining}s`;

        const prepSubtitle = isSideSwitch
          ? '10s to flip onto your Right Elbow & stack hips before Rep 1/6 on Right Side'
          : isLegSwitch
          ? '10s to switch which knee is bent at 90° and reset hands under lower back'
          : `10s to get into position for ${currentExercise.name} — ${
              currentExercise.formCues[0] || 'Brace 360° core & stabilize joints'
            }`;

        return {
          title: prepTitle,
          subtitle: prepSubtitle,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          strokeColor: '#F59E0B',
          maxTime: POSITION_PREP_SECONDS,
        };
      }
      case 'active':
        return {
          title: getMcGillRepContext(),
          subtitle:
            currentExercise.formCues[1] ||
            'Maintain neutral spine & smooth continuous breathing',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          strokeColor: '#10B981',
          maxTime: holdDuration,
        };
      case 'rest': {
        const isFinal3SecCountdown = timeRemaining <= 3;
        const nextRepLabel = `Rep/Set ${currentSet + 1} of ${currentExercise.defaultSets}`;

        return {
          title: isFinal3SecCountdown
            ? `GET READY — NEXT REP IN ${timeRemaining}s!`
            : `COOLDOWN & RECOVERY (${restDuration}s)`,
          subtitle: isFinal3SecCountdown
            ? `Same Position → Starting ${nextRepLabel} in ${timeRemaining}...`
            : `Next: ${nextRepLabel} (3s countdown at end of cooldown)`,
          badgeColor: isFinal3SecCountdown
            ? 'bg-amber-500/25 text-amber-200 border-amber-400 animate-pulse'
            : 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          strokeColor: isFinal3SecCountdown ? '#F59E0B' : '#3B82F6',
          maxTime: restDuration,
        };
      }
      case 'finished':
        return {
          title: 'ROUTINE COMPLETE',
          subtitle: 'Excellent work maintaining consistency!',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          strokeColor: '#A855F7',
          maxTime: 1,
        };
    }
  };

  const phaseDetails = getPhaseDetails();
  const progressRatio = Math.max(0, Math.min(1, timeRemaining / phaseDetails.maxTime));
  const circleRadius = 54;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - progressRatio * circleCircumference;

  if (phase === 'finished') {
    return (
      <div className="h-[100dvh] bg-[#07090E] text-white flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
        <div className="pt-6 text-center max-w-md mx-auto w-full">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto mb-4 shadow-2xl shadow-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Workout Complete!</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Completed <span className="text-white font-semibold">{routine.title}</span>
          </p>

          <div className="grid grid-cols-2 gap-3 my-5">
            <div className="bg-[#121622] border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs text-slate-400 block mb-1">Time Elapsed</span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-blue-400">
                {Math.floor(totalElapsedTime / 60)}m {totalElapsedTime % 60}s
              </span>
            </div>
            <div className="bg-[#121622] border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs text-slate-400 block mb-1">Total Sets</span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                {sessionExercises.reduce((acc, ex) => acc + ex.defaultSets, 0)} Sets
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-800/40 text-left text-xs text-blue-200">
            <div className="font-semibold text-blue-300 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-400" /> Consistency Logged
            </div>
            A completion checkmark has been automatically recorded to your progress calendar for today!
          </div>
        </div>

        <div className="max-w-md mx-auto w-full pb-4 space-y-2.5">
          <YouTubeMusicBar />
          <button
            onClick={() => onWorkoutComplete(totalElapsedTime, cardioMode)}
            className="w-full py-3.5 px-6 rounded-full bg-blue-600 hover:bg-blue-500 font-bold text-sm sm:text-base shadow-xl shadow-blue-600/30 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>Save &amp; View Calendar Tracker</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#07090E] text-white flex flex-col justify-between p-3 sm:p-4 overflow-hidden select-none">
      {/* 1. Compact Header Bar */}
      <header className="flex items-center justify-between pb-2 border-b border-slate-800/80 shrink-0">
        <button
          onClick={onExit}
          className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white transition-colors px-2.5 py-1.5 rounded-full bg-slate-900 border border-slate-800"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Exit</span>
        </button>

        <div className="text-center truncate px-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
            {routine.title} • Ex {currentExerciseIndex + 1}/{sessionExercises.length}
          </span>
          <span className="text-[11px] text-blue-300 font-mono flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            10s Pos Prep • Work: {holdDuration}s • Cooldown: {restDuration}s
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setIsPaused(true);
              setIsVideoGuideOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-[11px] font-bold text-blue-300 hover:text-white transition-colors"
            title="Watch Video & Step-by-Step Form"
          >
            <Video className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Video</span>
          </button>

          {onOpenCoach && (
            <button
              onClick={() => {
                setIsPaused(true);
                onOpenCoach(currentExercise);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-[11px] font-bold text-purple-300 hover:text-white transition-colors"
              title="Ask Gemini Coach"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Coach</span>
            </button>
          )}

          <button
            onClick={toggleSound}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border ${
              isMuted
                ? 'bg-slate-900 text-slate-500 border-slate-800'
                : 'bg-blue-600/20 text-blue-400 border-blue-500/40'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* 2. Single-Window Non-Overlapping Center Stage */}
      <div className="flex-1 flex flex-col justify-evenly items-center w-full max-w-lg mx-auto min-h-0 py-1">
        {/* Title & Phase Pill */}
        <div className="text-center w-full shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${phaseDetails.badgeColor}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {phaseDetails.title}
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white mt-1 truncate">
            {currentExercise.name}
          </h2>
        </div>

        {/* Anatomically Locked Kinematic Visualizer */}
        <div className="w-full shrink-0">
          <ExerciseAnimator
            type={currentExercise.animationType}
            exerciseId={currentExercise.id}
            exerciseName={currentExercise.name}
            cardioMode={cardioMode}
            isActive={!isPaused && phase === 'active'}
            phase={phase}
            timeRemaining={timeRemaining}
          />
        </div>

        {/* Compact Side-by-Side Timer Ring + Active Muscle & Cue Readout */}
        <div className="w-full bg-[#0E1320] border border-slate-800/90 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 shrink-0">
          {/* Circular Timer Gauge */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg className="w-28 h-28 sm:w-32 sm:h-32 transform -rotate-90" viewBox="0 0 128 128">
              <circle
                cx="64"
                cy="64"
                r={circleRadius}
                stroke="#1E293B"
                strokeWidth="7"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r={circleRadius}
                stroke={phaseDetails.strokeColor}
                strokeWidth="7"
                strokeDasharray={circleCircumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-[stroke-dashoffset] duration-500 ease-linear"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white tabular-nums">
                {timeRemaining}s
              </span>
              <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">
                {phase === 'prep' ? 'Pos Prep' : phase === 'active' ? 'Work' : 'Cooldown'}
              </span>
            </div>
          </div>

          {/* Right Column: Cue & Targeted Muscles */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="text-xs text-slate-200 font-medium leading-snug line-clamp-2">
              {phaseDetails.subtitle}
            </div>
            <div className="flex flex-wrap gap-1">
              {currentExercise.targetedMuscles.slice(0, 4).map((muscle) => (
                <span
                  key={muscle}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700/80 text-blue-300 truncate"
                >
                  {muscle}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span>
                Set {currentSet} of {currentExercise.defaultSets}
              </span>
              <span>•</span>
              <span className="text-emerald-400">
                Cooldown: {restDuration}s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Control Deck + YouTube Music Bar */}
      <footer className="w-full max-w-lg mx-auto space-y-2 shrink-0 pt-1">
        <div className="flex items-center gap-2">
          {/* Timer Transport Controls */}
          <div className="flex items-center gap-2 bg-[#111624] border border-slate-800 p-1.5 rounded-2xl flex-1">
            <button
              onClick={handleResetCurrent}
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors shrink-0"
              title="Reset Phase Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`flex-1 py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow transition-transform active:scale-[0.98] ${
                isPaused
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              )}
            </button>

            <button
              onClick={handleManualSkip}
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors shrink-0"
              title="Skip Phase"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Replace Exercise Button */}
          <button
            onClick={() => {
              setIsPaused(true);
              setIsSkipModalOpen(true);
            }}
            className="py-3 px-3.5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all"
            title="Replace with 20+ Matching Muscle-Group Exercises"
          >
            <Shuffle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Replace</span>
          </button>
        </div>

        {/* Integrated YouTube Music Bar at Bottom of Exercise Timer */}
        <YouTubeMusicBar />
      </footer>

      {/* Video & Step-by-Step Guide Modal */}
      <WorkoutAnatomyModal
        routine={{ ...routine, exercises: sessionExercises }}
        initialExerciseIndex={currentExerciseIndex}
        isOpen={isVideoGuideOpen}
        onClose={() => setIsVideoGuideOpen(false)}
        onStartExercise={(_, exIdx) => {
          setCurrentExerciseIndex(exIdx);
          setCurrentSet(1);
          setPhase('prep');
          setTimeRemaining(POSITION_PREP_SECONDS);
          setIsVideoGuideOpen(false);
          setIsPaused(false);
        }}
        onAskCoach={
          onOpenCoach
            ? (ex) => {
                setIsVideoGuideOpen(false);
                onOpenCoach(ex);
              }
            : undefined
        }
      />

      {/* Replace / Swap Exercise Modal */}
      <SkipExerciseModal
        isOpen={isSkipModalOpen}
        exerciseToSkip={currentExercise}
        onClose={() => {
          setIsSkipModalOpen(false);
          setIsPaused(false);
        }}
        onSelectAlternative={handleSwapExercise}
        onSkipCompletely={handleSkipEntireExercise}
      />
    </div>
  );
};
