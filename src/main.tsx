import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error('[ApexPulse] Runtime render error caught:', error, errorInfo);
    try {
      const lastAutoRebuild = Number(sessionStorage.getItem('apex_boundary_autorebuild') || '0');
      if (Date.now() - lastAutoRebuild > 10000) {
        sessionStorage.setItem('apex_boundary_autorebuild', String(Date.now()));
        this.handleResetAndReload();
      }
    } catch {}
  }

  handleResetAndReload = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.register('/pwa-sw.js', {
          updateViaCache: 'none',
        });
        if (reg.active) {
          reg.active.postMessage({ type: 'PURGE_AND_REBUILD_CACHE' });
        }
      }
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07090E] text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full rounded-3xl bg-[#0F1420] border border-slate-800 p-6 space-y-4 text-center shadow-2xl">
            <h1 className="text-xl font-extrabold text-white">Rebuilding App Cache...</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {this.state.errorMessage || 'A cached state error occurred while loading the dashboard.'}
            </p>
            <button
              type="button"
              onClick={this.handleResetAndReload}
              className="w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
            >
              Reset Local Cache &amp; Reload App
            </button>
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

