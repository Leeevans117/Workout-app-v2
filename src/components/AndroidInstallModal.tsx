import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Smartphone,
  Download,
  CheckCircle2,
  X,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Share2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, isInIframe, swRegistered, install } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [diagStatus, setDiagStatus] = useState<{
    manifestOk: boolean;
    icon192Ok: boolean;
    icon512Ok: boolean;
    checked: boolean;
  }>({ manifestOk: false, icon192Ok: false, icon512Ok: false, checked: false });

  const devAppUrl =
    'https://ais-dev-u23icjbq4xwgv2zrwb7mxi-167838209171.europe-west2.run.app';
  const directAppUrl =
    typeof window !== 'undefined' && window.location.origin.includes('run.app')
      ? window.location.origin
      : devAppUrl;

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    (async () => {
      try {
        const [mRes, i192Res, i512Res] = await Promise.all([
          fetch('/manifest.webmanifest', { credentials: 'include' }),
          fetch('/pwa-192x192.png', { credentials: 'include' }),
          fetch('/pwa-512x512.png', { credentials: 'include' }),
        ]);
        const mJson = mRes.ok ? await mRes.json() : null;
        if (active) {
          setDiagStatus({
            manifestOk: Boolean(mJson && mJson.short_name === 'ApexPulse'),
            icon192Ok: i192Res.ok,
            icon512Ok: i512Res.ok,
            checked: true,
          });
        }
      } catch {
        if (active) {
          setDiagStatus({ manifestOk: false, icon192Ok: false, icon512Ok: false, checked: true });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(
    directAppUrl
  )}`;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        onClose();
      }
    } else if (isInIframe) {
      window.open(directAppUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(directAppUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0F131D] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Install ApexPulse App</h3>
              <p className="text-xs text-slate-400">
                Verified Credentialed Manifest &amp; Native Android Install
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="my-5 space-y-4">
          {/* Live PWA Self-Test Status */}
          {diagStatus.checked && (
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>PWA Install Self-Test:</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className={diagStatus.manifestOk ? 'text-emerald-400' : 'text-red-400'}>
                  Manifest {diagStatus.manifestOk ? '✓' : '✗'}
                </span>
                <span className={diagStatus.icon512Ok ? 'text-emerald-400' : 'text-red-400'}>
                  Icons {diagStatus.icon512Ok ? '✓' : '✗'}
                </span>
                <span className={swRegistered ? 'text-emerald-400' : 'text-amber-400'}>
                  SW {swRegistered ? '✓' : '…'}
                </span>
              </div>
            </div>
          )}

          {isInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                <strong>ApexPulse is Installed!</strong> You can launch it directly from your phone&apos;s home screen or app drawer.
              </span>
            </div>
          ) : isInstallable ? (
            <button
              onClick={handleInstallClick}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
            >
              <Download className="w-5 h-5" />
              <span>1-Click Install App Now</span>
            </button>
          ) : isInIframe ? (
            <button
              onClick={handleInstallClick}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
            >
              <ExternalLink className="w-5 h-5" />
              <span>Open Standalone URL to Install</span>
            </button>
          ) : null}

          {isInIframe && (
            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-100 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <strong className="text-amber-300 block">
                  Step 1: Open Outside the AI Studio Preview Frame
                </strong>
                <span>
                  Click the green button above (or copy the link below into Chrome on your phone) so you are not inside an iframe.
                </span>
              </div>
            </div>
          )}

          {/* Direct Launch & QR Code for Android Phone */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-blue-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                Direct App Link (Chrome on Android)
              </span>
            </div>

            {/* Copy URL Bar */}
            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-[11px] font-mono text-blue-200 truncate flex-1">
                {directAppUrl}
              </span>
              <button
                onClick={handleCopyUrl}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            {/* QR Code for scanning from desktop to Android phone */}
            <div className="pt-1 flex items-center gap-3.5 bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
              <img
                src={qrCodeImageUrl}
                alt="Scan with Android Phone to Install"
                className="w-20 h-20 rounded-xl bg-white p-1 shrink-0"
              />
              <div className="space-y-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                  Scan with Android Camera
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Point your phone&apos;s camera at this QR code to open ApexPulse directly in Chrome on your phone.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: Android Chrome Menu Steps */}
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              <span>How to Install in Chrome on Android</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-200 leading-relaxed">
              <li>
                Open the link above in Chrome on your Android phone and <strong>refresh the page once</strong>.
              </li>
              <li>
                Tap the green <strong>1-Click Install App Now</strong> button when it appears (or tap Chrome&apos;s <strong>⋮ menu</strong> → <strong>&quot;Add to Home screen&quot;</strong> → <strong>&quot;Install&quot;</strong>).
              </li>
            </ol>
          </div>

          {/* iOS Note */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
            <Share2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-200">On iPhone (Safari):</strong> Open the link in Safari, tap the <strong>Share</strong> icon at the bottom, and tap <strong>Add to Home Screen</strong>.
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 px-4 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
