import React, { useState } from 'react';
import { CardioMode } from '../types/workout';
import { Zap, Gauge, Flame, CheckCircle2, ChevronRight, X } from 'lucide-react';

interface CardioSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCardio: (mode: CardioMode) => void;
}

export const CardioSelectorModal: React.FC<CardioSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectCardio,
}) => {
  const [selected, setSelected] = useState<CardioMode>('ebike');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0F131D] border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white">Select Cardio Modality</h3>
            <p className="text-xs text-slate-400 mt-0.5">Customize your session metrics and interval visualizer</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3.5 my-5">
          {/* Option 1: E-Bike */}
          <div
            onClick={() => setSelected('ebike')}
            className={`relative rounded-2xl p-4 cursor-pointer transition-all duration-200 border-2 overflow-hidden ${
              selected === 'ebike'
                ? 'bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20 shadow-lg shadow-blue-950/50'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-white">E-Bike Outdoor Session</h4>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Road & Trail
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Dynamic pedal assist, wind velocity simulation, gradient hills & continuous speed tracking.
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                selected === 'ebike' ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-700'
              }`}>
                {selected === 'ebike' && <CheckCircle2 className="w-4 h-4 fill-current" />}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5 text-blue-400" /> Assist: Eco / Trail / Boost</span>
              <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-orange-400" /> ~360 kcal / hr</span>
            </div>
          </div>

          {/* Option 2: Spinning Indoors */}
          <div
            onClick={() => setSelected('spinning')}
            className={`relative rounded-2xl p-4 cursor-pointer transition-all duration-200 border-2 overflow-hidden ${
              selected === 'spinning'
                ? 'bg-amber-950/30 border-orange-500 ring-2 ring-orange-500/20 shadow-lg shadow-orange-950/50'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                  <Gauge className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-white">Spinning Indoors</h4>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Stationary Flywheel
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Cadence intervals (80-110 RPM), magnetic flywheel resistance stages, and sprint burst intervals.
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                selected === 'spinning' ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-700'
              }`}>
                {selected === 'spinning' && <CheckCircle2 className="w-4 h-4 fill-current" />}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5 text-orange-400" /> Cadence: 80 - 110 RPM</span>
              <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-orange-400" /> ~420 kcal / hr</span>
            </div>
          </div>
        </div>

        {/* Action Button: Heavily rounded pill-shaped button strictly following reference */}
        <button
          onClick={() => {
            onSelectCardio(selected);
            onClose();
          }}
          className={`w-full py-3.5 px-6 rounded-full font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98] ${
            selected === 'ebike'
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
              : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/30'
          }`}
        >
          <span>Launch {selected === 'ebike' ? 'E-Bike' : 'Spinning'} Session</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
