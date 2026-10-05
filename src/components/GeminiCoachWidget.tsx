import React, { useState, useRef, useEffect } from 'react';
import { WorkoutRoutine, Exercise } from '../types/workout';
import { FULL_EXERCISE_CATALOG } from '../data/exerciseAlternatives';
import { CatalogExercise } from '../data/exerciseCatalog';
import {
  Sparkles,
  Send,
  X,
  Video,
  Bot,
  User,
  Dumbbell,
  Play,
  ExternalLink,
  Brain,
  Globe,
  ChevronDown,
  ChevronUp,
  Search,
  MessageSquarePlus,
  RotateCcw,
} from 'lucide-react';

interface ResearchSource {
  title: string;
  uri: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  thinking?: string;
  searchQueries?: string[];
  sources?: ResearchSource[];
  followUpQuestions?: string[];
  matchedExercises?: CatalogExercise[];
  exerciseRef?: Exercise;
}

interface GeminiCoachWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  routines: WorkoutRoutine[];
  initialExercise?: Exercise | null;
  onOpenVideoGuide?: (routine: WorkoutRoutine, exerciseIndex: number) => void;
}

const STARTER_PROMPTS = [
  'What are the best Pull-Up alternatives if I have NO pull-up bar?',
  'Research EMG activation: Prone Floor Lat Pull-Downs vs Kettlebell Gorilla Rows',
  'Why does Dr. Stuart McGill recommend 10-second holds for the Big 3?',
  'Compare high-bar vs goblet squats for lumbar disc shear forces',
  'How do I program rest/cool-down times for strength vs hypertrophy?',
  'Best zero-equipment posterior chain exercises I can do at home',
];

function findRelevantCatalogExercises(queryText: string, replyText: string): CatalogExercise[] {
  const combined = `${queryText} ${replyText}`.toLowerCase();
  const scored = FULL_EXERCISE_CATALOG.map((ex) => {
    let score = 0;
    const nameLower = ex.name.toLowerCase();
    if (combined.includes(nameLower)) score += 10;

    // Check individual words in exercise name
    const words = nameLower
      .replace(/[()/-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['with', 'from', 'hold', 'reps', 'sets'].includes(w));
    for (const w of words) {
      if (combined.includes(w)) score += 2;
    }

    // Special boost if asking about pull-up alternatives without a bar
    if (
      (combined.includes('pull-up') || combined.includes('pull up') || combined.includes('lat')) &&
      (combined.includes('no bar') ||
        combined.includes('without') ||
        combined.includes('alternative') ||
        combined.includes('equipment')) &&
      ex.muscleGroupTag === 'back-pull' &&
      ex.equipmentType === 'bodyweight'
    ) {
      score += 6;
    }

    return { ex, score };
  });

  return scored
    .filter((item) => item.score >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.ex);
}

export const GeminiCoachWidget: React.FC<GeminiCoachWidgetProps> = ({
  isOpen,
  onClose,
  routines,
  initialExercise,
  onOpenVideoGuide,
}) => {
  const allExercises = routines.flatMap((r) =>
    r.exercises.map((ex, idx) => ({ exercise: ex, routine: r, index: idx }))
  );

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    initialExercise?.id || ''
  );
  const [enableResearch, setEnableResearch] = useState(true);
  const [thinkingMode, setThinkingMode] = useState<'high' | 'low'>('high');
  const [expandedThinkingIds, setExpandedThinkingIds] = useState<Record<string, boolean>>({});
  const [previewCatalogExercise, setPreviewCatalogExercise] = useState<CatalogExercise | null>(
    null
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hi! I'm your **Interactive Gemini Biomechanics & Research Coach**.\n\nI use **Deep Thinking** and **Live Google Search Research** to investigate your exact question—whether you're looking for **no-bar pull-up alternatives**, EMG muscle-activation science, injury modifications, or custom programming across our **108-exercise library**.\n\nAsk me anything below or tap a research topic to begin!",
      followUpQuestions: STARTER_PROMPTS.slice(0, 3),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>(
    'Thinking through biomechanics & researching...'
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialExercise) {
      setSelectedExerciseId(initialExercise.id);
    }
  }, [initialExercise]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  useEffect(() => {
    if (!isLoading) return;
    const stages = [
      'Formulating biomechanical hypotheses & joint torque analysis...',
      enableResearch
        ? 'Searching sports-science & EMG literature via Google Search...'
        : 'Evaluating muscle fiber recruitment & spine-sparing cues...',
      'Synthesizing actionable coaching steps & exercise recommendations...',
    ];
    let idx = 0;
    setLoadingStage(stages[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % stages.length;
      setLoadingStage(stages[idx]);
    }, 2200);
    return () => clearInterval(interval);
  }, [isLoading, enableResearch]);

  if (!isOpen) return null;

  const activeExerciseEntry = allExercises.find(
    (item) => item.exercise.id === selectedExerciseId
  );

  const toggleThinkingDrawer = (id: string) => {
    setExpandedThinkingIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSend = async (customPrompt?: string) => {
    const promptText = (customPrompt ?? input).trim();
    if (!promptText || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: promptText,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-10)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const selectedExerciseContext = activeExerciseEntry?.exercise
        ? `${activeExerciseEntry.exercise.name} (${activeExerciseEntry.exercise.description})`
        : undefined;

      const response = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          history: historyPayload,
          selectedExercise: selectedExerciseContext,
          enableResearch,
          thinkingMode,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || `Server error (${response.status})`);
      }

      const replyText: string = data.reply || '';
      const matchedExercises = findRelevantCatalogExercises(promptText, replyText);
      const msgId = `model-${Date.now()}`;

      // Auto-expand thinking if present on the newest message
      if (data.thinking) {
        setExpandedThinkingIds((prev) => ({ ...prev, [msgId]: true }));
      }

      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          role: 'model',
          text: replyText,
          thinking: data.thinking || undefined,
          searchQueries: Array.isArray(data.searchQueries) ? data.searchQueries : [],
          sources: Array.isArray(data.sources) ? data.sources : [],
          followUpQuestions: Array.isArray(data.followUpQuestions)
            ? data.followUpQuestions
            : [],
          matchedExercises,
          exerciseRef: activeExerciseEntry?.exercise,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `model-err-${Date.now()}`,
          role: 'model',
          text: `**Unable to reach live research server:** ${
            err?.message || 'Connection error'
          }. Please try asking your question again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} className="h-1" />;

          if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
            const headingText = trimmed.replace(/^#{2,3}\s+/, '').replace(/\*\*/g, '');
            return (
              <h4
                key={i}
                className="text-xs sm:text-sm font-extrabold text-blue-300 pt-2 pb-0.5 tracking-tight"
              >
                {headingText}
              </h4>
            );
          }

          const isBullet =
            trimmed.startsWith('- ') ||
            trimmed.startsWith('* ') ||
            /^\d+\.\s/.test(trimmed);
          const cleanLine = isBullet
            ? trimmed.replace(/^(-|\*|\d+\.)\s+/, '')
            : trimmed;

          const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
          const renderedParts = parts.map((part, idx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={idx} className="font-bold text-white">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={idx}>{part}</span>;
          });

          if (isBullet) {
            return (
              <div key={i} className="flex items-start gap-2 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{renderedParts}</span>
              </div>
            );
          }

          return (
            <p key={i} className="leading-relaxed">
              {renderedParts}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl h-[92vh] sm:h-[86vh] rounded-t-3xl sm:rounded-3xl bg-[#0B0F1A] border border-blue-500/35 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-[#0B0F1A] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  Gemini Research & Biomechanics Agent
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1">
                  <Brain className="w-3 h-3 text-purple-400" />
                  <span>Thinking Active</span>
                </span>
                {enableResearch && (
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                    <Globe className="w-3 h-3 text-emerald-400" />
                    <span>Live Web Research</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Interactive sports-science reasoning, live Google Search grounding & 108-exercise video matching
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setThinkingMode((prev) => (prev === 'high' ? 'low' : 'high'))
              }
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
                thinkingMode === 'high'
                  ? 'bg-purple-600/25 border-purple-500/50 text-purple-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Toggle Deep Thinking Reasoning Level"
            >
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span>{thinkingMode === 'high' ? 'Deep Think' : 'Fast Think'}</span>
            </button>

            <button
              onClick={() => setEnableResearch((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
                enableResearch
                  ? 'bg-emerald-600/25 border-emerald-500/50 text-emerald-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Toggle Live Google Search Research"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>{enableResearch ? 'Web Research ON' : 'Web Research OFF'}</span>
            </button>

            <button
              onClick={() =>
                setMessages([
                  {
                    id: 'welcome',
                    role: 'model',
                    text: "Conversation reset! Ask me any question about exercise biomechanics, **no-pull-up-bar back alternatives**, custom workout programming, or recovery science.",
                    followUpQuestions: STARTER_PROMPTS.slice(0, 3),
                  },
                ])
              }
              className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              title="Reset Conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Exercise Context Selector + Direct Video Preview Bar */}
        <div className="px-5 py-2.5 bg-[#0E1320] border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Dumbbell className="w-4 h-4 text-blue-400 shrink-0" />
            <select
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="">All Exercises (General Research & Custom Advice)</option>
              {routines.map((routine) => (
                <optgroup key={routine.id} label={routine.title}>
                  {routine.exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {activeExerciseEntry && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() =>
                  handleSend(
                    `Research the biomechanics, EMG muscle activation, common faults, and best zero-equipment alternatives for ${activeExerciseEntry.exercise.name}.`
                  )
                }
                disabled={isLoading}
                className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                <span>Deep Research This Exercise</span>
              </button>

              {onOpenVideoGuide && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenVideoGuide(
                      activeExerciseEntry.routine,
                      activeExerciseEntry.index
                    );
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Watch Video</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Inline Video Preview Modal for Matched Catalogue Exercises */}
        {previewCatalogExercise && previewCatalogExercise.videoReference && (
          <div className="px-5 py-3 bg-slate-950 border-b border-emerald-500/40 space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">
                  {previewCatalogExercise.name} — {previewCatalogExercise.equipmentLabel}
                </span>
              </div>
              <button
                onClick={() => setPreviewCatalogExercise(null)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <span>Close Video</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${previewCatalogExercise.videoReference.youtubeId}?rel=0`}
                  title={previewCatalogExercise.name}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="space-y-1.5 text-[11px] text-slate-300">
                <p className="font-semibold text-emerald-300">
                  {previewCatalogExercise.whySwap}
                </p>
                <ul className="space-y-1">
                  {previewCatalogExercise.formCues.map((cue, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">{idx + 1}.</span>
                      <span>{cue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.map((msg) => {
            const isThinkingExpanded = !!expandedThinkingIds[msg.id];
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    msg.role === 'user'
                      ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                      : 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                <div className="max-w-[88%] space-y-2.5">
                  {/* 1. Collapsible Thinking / Reasoning Trace */}
                  {msg.role === 'model' && msg.thinking && (
                    <div className="rounded-2xl bg-purple-950/25 border border-purple-500/30 overflow-hidden">
                      <button
                        onClick={() => toggleThinkingDrawer(msg.id)}
                        className="w-full px-3.5 py-2 flex items-center justify-between text-left text-[11px] font-bold text-purple-300 hover:bg-purple-900/20 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Brain className="w-3.5 h-3.5 text-purple-400" />
                          <span>Coach Thinking & Biomechanical Analysis</span>
                        </div>
                        {isThinkingExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {isThinkingExpanded && (
                        <div className="px-3.5 pb-3 pt-1 border-t border-purple-500/20 text-[11px] text-purple-200/80 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                          {msg.thinking}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Web Research Queries & Grounding Sources */}
                  {msg.role === 'model' &&
                    ((msg.searchQueries && msg.searchQueries.length > 0) ||
                      (msg.sources && msg.sources.length > 0)) && (
                      <div className="rounded-2xl bg-emerald-950/20 border border-emerald-500/30 px-3.5 py-2.5 space-y-2">
                        {msg.searchQueries && msg.searchQueries.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Search className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-bold">
                              Researched:
                            </span>
                            {msg.searchQueries.map((q, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-slate-300"
                              >
                                "{q}"
                              </span>
                            ))}
                          </div>
                        )}

                        {msg.sources && msg.sources.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <Globe className="w-3 h-3 text-blue-400 shrink-0" />
                            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-300 font-bold">
                              Sources:
                            </span>
                            {msg.sources.map((src, idx) => (
                              <a
                                key={idx}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-950/50 hover:bg-blue-900/60 border border-blue-500/30 text-blue-200 transition-colors"
                              >
                                <span className="truncate max-w-[160px]">{src.title}</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  {/* 3. Main Answer Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs ${
                      msg.role === 'user'
                        ? 'bg-emerald-950/50 border border-emerald-500/30 text-emerald-100'
                        : 'bg-[#121726] border border-slate-800 text-slate-200'
                    }`}
                  >
                    {renderFormattedText(msg.text)}
                  </div>

                  {/* 4. Interactive Matched Exercises from the 108-Exercise Catalogue */}
                  {msg.role === 'model' &&
                    msg.matchedExercises &&
                    msg.matchedExercises.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                          Matched Exercises in Your 108-Exercise Catalogue (Click to Watch Video):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {msg.matchedExercises.map((ex) => (
                            <button
                              key={ex.id}
                              onClick={() => setPreviewCatalogExercise(ex)}
                              className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-left transition-all flex flex-col justify-between gap-1.5"
                            >
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 block">
                                  {ex.equipmentLabel}
                                </span>
                                <span className="text-xs font-bold text-white line-clamp-1">
                                  {ex.name}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-blue-400 font-semibold pt-1 border-t border-slate-800/80">
                                <span className="flex items-center gap-1">
                                  <Play className="w-3 h-3 fill-current" />
                                  Watch Form Video
                                </span>
                                <span className="text-slate-400 font-mono">
                                  {ex.defaultRestSeconds}s rest
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* 5. Interactive Follow-Up Questions */}
                  {msg.role === 'model' &&
                    msg.followUpQuestions &&
                    msg.followUpQuestions.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <MessageSquarePlus className="w-3 h-3 text-blue-400" />
                          <span>Continue Exploring (Tap to Ask):</span>
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.followUpQuestions.map((q, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSend(q)}
                              disabled={isLoading}
                              className="text-left text-[11px] px-3 py-1.5 rounded-xl bg-blue-950/30 hover:bg-blue-900/40 border border-blue-500/30 text-blue-200 hover:text-white transition-colors"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                <Brain className="w-4 h-4 animate-pulse" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-[#121726] border border-purple-500/30 text-xs text-slate-200 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                  <span className="font-bold text-purple-300">
                    Gemini {thinkingMode === 'high' ? 'Deep Thinking' : 'Reasoning'}{' '}
                    {enableResearch ? '+ Google Search Research' : ''}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">{loadingStage}</p>
              </div>
            </div>
          )}

          {/* Starter Research Prompts */}
          {messages.length <= 1 && !isLoading && (
            <div className="pt-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-2">
                Popular Research & Biomechanics Questions
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="text-left text-[11px] p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-slate-300 hover:text-white transition-colors flex items-start gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 bg-[#0E1320] border-t border-slate-800/80 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeExerciseEntry
                ? `Ask anything or research ${activeExerciseEntry.exercise.name}...`
                : 'Ask a biomechanics question, request no-bar alternatives, or research an exercise...'
            }
            className="flex-1 bg-slate-950 border border-slate-800 rounded-full px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Research & Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};
