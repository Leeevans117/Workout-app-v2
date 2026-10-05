import React, { useState } from 'react';
import { WorkoutRoutine, Exercise } from '../types/workout';
import { ExerciseAnimator } from './ExerciseAnimator';
import {
  ShieldCheck,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  Layers,
  HeartPulse,
  Video,
  Activity,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface McGillBig3ModuleProps {
  routine: WorkoutRoutine;
  onStartFullRoutine: () => void;
  onStartSingleExercise: (exerciseIndex: number) => void;
  onOpenCoach?: (exercise: Exercise) => void;
}

export const McGillBig3Module: React.FC<McGillBig3ModuleProps> = ({
  routine,
  onStartFullRoutine,
  onStartSingleExercise,
  onOpenCoach,
}) => {
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'video' | 'animation'>('video');
  const selectedExercise = routine.exercises[selectedExerciseIndex] || routine.exercises[0];
  const videoRef = selectedExercise.videoReference;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Top Hero Banner Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1A102E] via-[#130E24] to-[#0A0D14] border border-purple-900/40 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                Spine Hygiene Gold Standard
              </span>
              <span className="text-xs text-purple-300/80 font-mono">Dr. Stuart McGill</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              The McGill Big 3
            </h1>
            <p className="text-sm text-slate-300 mt-2.5 leading-relaxed">
              Clinically engineered to spare the lumbar spine from harmful compressive forces while maximizing circumferential torso stiffness. Includes the mandatory 10-second preparation countdown before each movement.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-5 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-purple-400" /> 10s Prep Countdown
              </span>
              <span className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800">
                <Layers className="w-3.5 h-3.5 text-blue-400" /> 10s Isometric Holds
              </span>
              <span className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800">
                <HeartPulse className="w-3.5 h-3.5 text-emerald-400" /> True Spine Neutrality
              </span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col gap-2.5">
            <button
              onClick={onStartFullRoutine}
              className="py-4 px-8 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-purple-600/30 transition-transform active:scale-[0.98]"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start All 3 Exercises</span>
            </button>
            <span className="text-[11px] text-center text-purple-300/70">
              Includes 10s prep timer before each exercise
            </span>
          </div>
        </div>
      </div>

      {/* The 3 Essential Exercises Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">The 3 Big Movements</h2>
          <span className="text-xs text-slate-400">Click to watch video & step-by-step form</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {routine.exercises.map((ex, idx) => {
            const isSelected = selectedExerciseIndex === idx;

            return (
              <div
                key={ex.id}
                onClick={() => setSelectedExerciseIndex(idx)}
                className={`relative rounded-3xl p-5 cursor-pointer transition-all duration-200 border-2 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-purple-950/25 border-purple-500 ring-2 ring-purple-500/20 shadow-xl shadow-purple-950/40'
                    : 'bg-[#10131B] border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                      Exercise 0{idx + 1}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      10s Prep • 10s Holds
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1.5">{ex.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {ex.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-purple-400 font-medium flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" />
                    <span>{isSelected ? 'Watching Guide' : 'Watch Video'}</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartSingleExercise(idx);
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Timer</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Exercise Stage with Video Reference, Step-by-Step Breakdown & Vector Animation */}
      <div className="bg-[#0E121B] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-purple-400 mb-1">
              <span>VIDEO REFERENCE & CLINICAL POSTURE</span>
            </div>
            <h3 className="text-2xl font-bold text-white">{selectedExercise.name}</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenCoach && (
              <button
                onClick={() => onOpenCoach(selectedExercise)}
                className="py-2.5 px-4 rounded-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask Gemini Coach</span>
              </button>
            )}

            <button
              onClick={() => onStartSingleExercise(selectedExerciseIndex)}
              className="py-2.5 px-5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-transform active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start with 10s Prep</span>
            </button>
          </div>
        </div>

        {/* Toggle between Video Player and 2D Joint Kinematics */}
        <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewMode('video')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'video'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video Reference</span>
            </button>
            <button
              onClick={() => setViewMode('animation')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'animation'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>2D Joint Animation</span>
            </button>
          </div>

          {videoRef && (
            <a
              href={`https://www.youtube.com/watch?v=${videoRef.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-purple-300 hover:text-white flex items-center gap-1 pr-2"
            >
              <span>Open in YouTube</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {viewMode === 'video' && videoRef ? (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-xl">
            <iframe
              key={videoRef.youtubeId}
              src={`https://www.youtube-nocookie.com/embed/${videoRef.youtubeId}?rel=0&modestbranding=1`}
              title={videoRef.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <ExerciseAnimator
            type={selectedExercise.animationType}
            isActive={true}
            phase="active"
          />
        )}

        {/* Clinical Form Guidance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Step-by-Step Execution
            </h4>
            <div className="space-y-2">
              {(videoRef?.stepByStepBreakdown || selectedExercise.formCues).map((cue, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300"
                >
                  <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-300 font-mono text-[10px] flex items-center justify-center shrink-0 border border-purple-800/60">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{cue}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {videoRef?.commonMistakes && (
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Common Mistakes to Avoid
                </h4>
                <div className="space-y-1.5 p-3 rounded-2xl bg-amber-950/20 border border-amber-900/30 text-xs text-slate-300">
                  {videoRef.commonMistakes.map((m, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
                Target Muscle Complex
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedExercise.targetedMuscles.map((muscle) => (
                  <span
                    key={muscle}
                    className="text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-medium"
                  >
                    {muscle}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
