import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  confirmingReset: boolean;
  deleteWorkoutLogsToo: boolean;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      confirmingReset: false,
      deleteWorkoutLogsToo: false,
    };
  }

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error('[ApexPulse] Runtime render error caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleConfirmedReset = () => {
    try {
      const keysToClear = [
        'apex_routines_v6',
        'apex_custom_routines_v1',
        'apex_user_fitness_profile_v1',
      ];
      if (this.state.deleteWorkoutLogsToo) {
        keysToClear.push('apex_pulse_workout_logs');
      }
      for (const key of keysToClear) {
        localStorage.removeItem(key);
      }
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07090E] text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full rounded-3xl bg-[#0F1420] border border-slate-800 p-6 space-y-4 text-center shadow-2xl">
            <h1 className="text-xl font-extrabold text-white">Something went wrong</h1>
            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-left">
              <p className="text-xs font-mono text-rose-300 break-words leading-relaxed">
                {this.state.errorMessage || 'An unexpected error occurred while rendering ApexPulse.'}
              </p>
            </div>

            {!this.state.confirmingReset ? (
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="flex-1 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
                >
                  Reload
                </button>
                <button
                  type="button"
                  onClick={() =>
                    this.setState({ confirmingReset: true, deleteWorkoutLogsToo: false })
                  }
                  className="flex-1 py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-colors"
                >
                  Reset app data
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-3 text-left">
                <p className="text-xs font-bold text-rose-200">
                  Confirm local app data reset
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  This will clear locally cached routines and profile keys (
                  <code className="text-rose-200">apex_routines_v6</code>,{' '}
                  <code className="text-rose-200">apex_custom_routines_v1</code>,{' '}
                  <code className="text-rose-200">apex_user_fitness_profile_v1</code>) on this
                  browser. Your cloud data in Firestore will remain untouched.
                </p>
                <label className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={this.state.deleteWorkoutLogsToo}
                    onChange={(e) =>
                      this.setState({ deleteWorkoutLogsToo: e.target.checked })
                    }
                    className="mt-0.5 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500"
                  />
                  <span>
                    Also delete local workout logs (<code className="text-rose-200">apex_pulse_workout_logs</code>)
                  </span>
                </label>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={this.handleConfirmedReset}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      this.setState({ confirmingReset: false, deleteWorkoutLogsToo: false })
                    }
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
}

