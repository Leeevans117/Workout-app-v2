import React, { useState, useEffect } from 'react';
import { WorkoutRoutine, Exercise } from '../types/workout';
import { ExerciseAnimator } from './ExerciseAnimator';
import { getShortFormVideoConfig } from '../utils/videoHelpers';
import {
  X,
  Play,
  CheckCircle2,
  Activity,
  Video,
  Sparkles,
  AlertTriangle,
  ExternalLink,
  ListChecks,
  Zap,
  GraduationCap,
} from 'lucide-react';

interface WorkoutAnatomyModalProps {
  routine: WorkoutRoutine | null;
  initialExerciseIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onStartExercise: (routine: WorkoutRoutine, exerciseIndex: number) => void;
  onAskCoach?: (exercise: Exercise) => void;
}

export const WorkoutAnatomyModal: React.FC<WorkoutAnatomyModalProps> = ({
  routine,
  initialExerciseIndex = 0,
  isOpen,
  onClose,
  onStartExercise,
  onAskCoach,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(initialExerciseIndex);
  const [viewMode, setViewMode] = useState<'short-video' | 'detailed-video' | 'animation'>(
    'short-video'
  );

  useEffect(() => {
    setSelectedIndex(initialExerciseIndex);
  }, [initialExerciseIndex, routine]);

  if (!isOpen || !routine) return null;

  const exercise: Exercise = routine.exercises[selectedIndex] || routine.exercises[0];
  const videoRef = exercise.videoReference;
  const shortConfig = getShortFormVideoConfig(exercise);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0D111B] border border-slate-800 shadow-2xl p-5 sm:p-6 text-white space-y-5">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold">
                  Short-Form Shorts & Detailed Video Guide
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                {routine.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Exercise Selector Pills */}
        <div className="flex flex-wrap gap-2">
          {routine.exercises.map((ex, idx) => {
            const active = idx === selectedIndex;
            return (
              <button
                key={ex.id}
                onClick={() => setSelectedIndex(idx)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border ${
                  active
                    ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/25'
                    : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                <span className="font-mono text-[10px] opacity-75">0{idx + 1}</span>
                <span>{ex.name}</span>
              </button>
            );
          })}
        </div>

        {/* 2-Option Video Switcher: Short Form (YouTube Shorts style) vs Detailed Explanation vs 2D Kinematics */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setViewMode('short-video')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'short-video'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/25'
                  : 'text-slate-300 hover:text-white bg-slate-950/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Short Form (Shorts Style)</span>
            </button>

            <button
              onClick={() => setViewMode('detailed-video')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'detailed-video'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-slate-300 hover:text-white bg-slate-950/50'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Detailed Explanation</span>
            </button>

            <button
              onClick={() => setViewMode('animation')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'animation'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                  : 'text-slate-300 hover:text-white bg-slate-950/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>3D Human Model</span>
            </button>
          </div>

          {onAskCoach && (
            <button
              onClick={() => {
                onClose();
                onAskCoach(exercise);
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI Coach</span>
            </button>
          )}
        </div>

        {/* Video Player or Vector Animator Stage */}
        {viewMode === 'short-video' ? (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-[#101522] border border-rose-500/30 rounded-2xl p-4">
            {/* Left: Vertical YouTube Shorts-Style Frame */}
            <div className="sm:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[235px] aspect-[9/16] max-h-[340px] rounded-2xl overflow-hidden bg-black border-2 border-rose-500/40 shadow-2xl">
                <iframe
                  key={`short-${exercise.id}`}
                  src={shortConfig.embedUrl}
                  title={`${exercise.name} — Short Form Demo`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-rose-600/90 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 pointer-events-none">
                  <Zap className="w-2.5 h-2.5 fill-current" />
                  <span>{shortConfig.durationBadge}</span>
                </div>
              </div>
            </div>

            {/* Right: Rapid-Fire Shorts Summary */}
            <div className="sm:col-span-7 space-y-3">
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                  <Zap className="w-3 h-3 text-rose-400" />
                  30-Second Quick Form Summary
                </span>
                <h4 className="text-base sm:text-lg font-extrabold text-white mt-1.5">
                  {exercise.name}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {exercise.defaultSets} Sets × {exercise.repLabel || `${exercise.defaultHoldSeconds}s`} •{' '}
                  <span className="text-emerald-400 font-semibold">
                    {exercise.defaultRestSeconds}s Cool-Down
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                {shortConfig.quickBullets.map((b, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200"
                  >
                    <span className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-[10px] font-extrabold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{b}</span>
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded-xl bg-amber-950/25 border border-amber-500/30 flex items-start gap-2 text-xs text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">#1 Mistake to Avoid: </span>
                  <span>{shortConfig.mistakeCallout}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => setViewMode('detailed-video')}
                  className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-xs font-bold text-blue-300 flex items-center gap-1.5 transition-colors"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Switch to Detailed Explanation</span>
                </button>
                <a
                  href={shortConfig.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5"
                >
                  <span>Open Clip in YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        ) : viewMode === 'detailed-video' && videoRef ? (
          <div className="space-y-3">
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-xl">
              <iframe
                key={`detailed-${videoRef.youtubeId}`}
                src={`https://www.youtube-nocookie.com/embed/${videoRef.youtubeId}?rel=0&modestbranding=1`}
                title={videoRef.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div>
                <h4 className="text-sm font-bold text-white">{videoRef.title}</h4>
                <span className="text-xs text-slate-400">
                  {videoRef.channelName}{' '}
                  {videoRef.durationLabel ? `• ${videoRef.durationLabel}` : ''}
                </span>
              </div>
              <a
                href={`https://www.youtube.com/watch?v=${videoRef.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
              >
                <span>Open in YouTube</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : (
          <ExerciseAnimator
            type={exercise.animationType}
            exerciseId={exercise.id}
            exerciseName={exercise.name}
            isActive={true}
            phase="active"
          />
        )}

        {/* Step-by-Step Execution & Form Cues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1">
          {/* Left 7 Cols: Detailed Step-by-Step Movement Breakdown */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-emerald-400" />
                <span>How to Perform {exercise.name} (Step-by-Step)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {exercise.description}
              </p>
            </div>

            <div className="space-y-2">
              {(videoRef?.stepByStepBreakdown || exercise.formCues).map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-900/80 border border-slate-800/90 text-xs text-slate-200"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </div>
              ))}
            </div>

            {videoRef?.commonMistakes && videoRef.commonMistakes.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Common Mistakes to Avoid
                </span>
                <ul className="space-y-1 text-xs text-slate-300">
                  {videoRef.commonMistakes.map((mistake, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{mistake}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right 5 Cols: Prescription & Target Muscles */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-4 bg-[#111624] border border-slate-800/90 rounded-2xl p-4">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                  Target Muscle Groups
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {exercise.targetedMuscles.map((m) => (
                    <span
                      key={m}
                      className="text-xs px-2.5 py-1 rounded-xl bg-blue-950/50 border border-blue-500/30 text-blue-200 font-semibold"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Sets & Volume</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {exercise.defaultSets} Sets{' '}
                    {exercise.repLabel
                      ? `• ${exercise.repLabel}`
                      : exercise.defaultHoldSeconds
                      ? `× ${exercise.defaultHoldSeconds}s`
                      : ''}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Cool-Down Rest</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {exercise.defaultRestSeconds}s Rest
                  </span>
                </div>
              </div>

              {/* Key Form Cues */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">
                  Quick Form Cues
                </span>
                {exercise.formCues.map((cue, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{cue}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onStartExercise(routine, selectedIndex);
              }}
              className="w-full py-3 px-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-transform active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start {exercise.name} Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
