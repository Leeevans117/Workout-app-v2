import React, { useState } from 'react';
import { Exercise } from '../types/workout';
import {
  getAlternativesForExercise,
  AlternativeExerciseOption,
} from '../data/exerciseAlternatives';
import {
  X,
  Shuffle,
  Dumbbell,
  UserCheck,
  SkipForward,
  CheckCircle2,
  ArrowRight,
  Video,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
  Clock,
} from 'lucide-react';

interface SkipExerciseModalProps {
  isOpen: boolean;
  exerciseToSkip: Exercise | null;
  onClose: () => void;
  onSelectAlternative: (replacement: Exercise, savePermanently: boolean) => void;
  onSkipCompletely?: () => void;
}

export const SkipExerciseModal: React.FC<SkipExerciseModalProps> = ({
  isOpen,
  exerciseToSkip,
  onClose,
  onSelectAlternative,
  onSkipCompletely,
}) => {
  const [equipmentFilter, setEquipmentFilter] = useState<
    'all' | 'bodyweight' | 'kettlebell' | 'dumbbell' | 'barbell'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savePermanently, setSavePermanently] = useState(false);
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);

  if (!isOpen || !exerciseToSkip) return null;

  const { muscleGroupLabel, alternatives } = getAlternativesForExercise(exerciseToSkip);

  const filteredAlternatives = alternatives.filter((alt) => {
    const matchesEquip = equipmentFilter === 'all' || alt.equipmentType === equipmentFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      alt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alt.targetedMuscles.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase())) ||
      alt.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEquip && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0E131F] border border-emerald-500/40 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Shuffle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  Replace Exercise ({alternatives.length} Matching Options)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {muscleGroupLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Replacing <span className="text-white font-semibold">{exerciseToSkip.name}</span> with any researched exercise targeting the same muscle group.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-800 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Equipment Filter Bar */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${alternatives.length} ${muscleGroupLabel} exercises...`}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
            {(
              [
                { id: 'all', label: `All No-Bar (${alternatives.length})` },
                { id: 'bodyweight', label: 'Zero Equipment (Floor / No Bar)' },
                { id: 'kettlebell', label: 'Kettlebell' },
                { id: 'dumbbell', label: 'Dumbbell' },
                { id: 'barbell', label: 'Barbell' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setEquipmentFilter(tab.id)}
                className={`flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-colors ${
                  equipmentFilter === tab.id
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Matched Arsenal List with Embedded Spoken Video Previews */}
        <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
          {filteredAlternatives.map((alt: AlternativeExerciseOption) => {
            const isVideoOpen = expandedVideoId === alt.id;
            const vRef = alt.videoReference;

            return (
              <div
                key={alt.id}
                className="p-3.5 rounded-2xl bg-[#131A2A] hover:bg-[#172033] border border-slate-800 hover:border-emerald-500/50 transition-all space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-extrabold text-white">{alt.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          alt.equipmentType === 'bodyweight'
                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                            : alt.equipmentType === 'kettlebell'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        }`}
                      >
                        {alt.equipmentLabel}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-300/90 font-medium leading-relaxed">
                      {alt.whySwap}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {vRef && (
                      <button
                        type="button"
                        onClick={() => setExpandedVideoId(isVideoOpen ? null : alt.id)}
                        className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-colors ${
                          isVideoOpen
                            ? 'bg-blue-600 text-white border-blue-400'
                            : 'bg-slate-900 hover:bg-slate-800 text-blue-300 border-blue-500/40'
                        }`}
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>{isVideoOpen ? 'Hide Video' : 'Watch Video'}</span>
                        {isVideoOpen ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectAlternative(alt, savePermanently)}
                      className="py-2 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-transform active:scale-[0.98]"
                    >
                      <span>Replace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expandable Spoken Video Player & Step-by-Step Guide */}
                {isVideoOpen && vRef && (
                  <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-blue-500/30 space-y-3 animate-in fade-in duration-200">
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
                      <iframe
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
                        <span>Open in YouTube</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">
                        Step-by-Step Biomechanical Cues:
                      </span>
                      {vRef.stepByStepBreakdown.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
                          <span className="text-emerald-400 font-bold font-mono">{idx + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sets, Reps, Cooldown & Targeted Muscles */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div className="flex items-center gap-3 font-mono font-bold text-slate-300">
                    <span>
                      {alt.defaultSets} Sets × {alt.repLabel || `${alt.defaultReps} reps`}
                    </span>
                    <span className="text-blue-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {alt.defaultRestSeconds}s Cooldown
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {alt.targetedMuscles.slice(0, 3).map((m) => (
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

        {/* Save Option & Skip Completely Footer */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <button
              type="button"
              onClick={() => setSavePermanently(!savePermanently)}
              className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                savePermanently
                  ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                  : 'bg-slate-900 border-slate-700'
              }`}
            >
              {savePermanently && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
            <span>Keep this swap saved in my routine for future workouts</span>
          </label>

          {onSkipCompletely && (
            <button
              onClick={onSkipCompletely}
              className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5 text-amber-400" />
              <span>Skip Exercise Without Replacement</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
