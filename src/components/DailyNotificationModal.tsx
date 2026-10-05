import React, { useState, useEffect } from 'react';
import { notificationService, NotificationSettings } from '../utils/notificationService';
import {
  BellRing,
  Clock,
  CheckCircle2,
  X,
  Send,
  Volume2,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

interface DailyNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyNotificationModal: React.FC<DailyNotificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<NotificationSettings>(notificationService.loadSettings());
  const [permission, setPermission] = useState<NotificationPermission>(notificationService.getPermission());
  const [testSent, setTestSent] = useState(false);
  const [copiedAppUrl, setCopiedAppUrl] = useState(false);

  const isInIframe = notificationService.isInIframe();
  const standaloneAppUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-u23icjbq4xwgv2zrwb7mxi-167838209171.europe-west2.run.app';

  useEffect(() => {
    if (isOpen) {
      setSettings(notificationService.loadSettings());
      setPermission(notificationService.getPermission());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEnableToggle = async () => {
    if (!settings.enabled) {
      const res = await notificationService.enableReminders();
      setPermission(res.osPermission);
      setSettings(notificationService.loadSettings());
    } else {
      setSettings(notificationService.saveSettings({ enabled: false }));
    }
  };

  const handleSoundToggle = () => {
    setSettings(
      notificationService.saveSettings({
        soundChimeEnabled: !settings.soundChimeEnabled,
      })
    );
  };

  const handleTimeChange = (newTime: string) => {
    setSettings(notificationService.saveSettings({ time: newTime }));
  };

  const handleSendTest = () => {
    notificationService.sendTodayWorkoutNotification();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(standaloneAppUrl);
    setCopiedAppUrl(true);
    setTimeout(() => setCopiedAppUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0F131D] border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Daily Workout Reminders</h3>
              <p className="text-xs text-slate-400">Get notified what needs to be done each day</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 my-5">
          {/* Toggle Daily Reminders (Now works immediately even inside preview iframe!) */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Daily Schedule Notification</h4>
                {settings.enabled && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                In-app banner + audio chime + OS push (when installed)
              </p>
            </div>

            <button
              onClick={handleEnableToggle}
              aria-label="Toggle Daily Reminders"
              className={`w-14 h-8 rounded-full p-1 transition-colors flex items-center shrink-0 ${
                settings.enabled
                  ? 'bg-blue-600 justify-end'
                  : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Toggle Audio Chime with Reminder */}
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-900/50 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
              <Volume2 className="w-4 h-4 text-blue-400" />
              <span>Play Audio Chime at Reminder Time</span>
            </div>
            <button
              onClick={handleSoundToggle}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                settings.soundChimeEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {settings.soundChimeEnabled ? 'Sound ON' : 'Muted'}
            </button>
          </div>

          {/* Note about OS Push Notifications in Preview Iframe vs Standalone */}
          {(isInIframe || permission !== 'granted') && (
            <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200 space-y-2">
              <div className="font-bold text-blue-300 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Want Native Phone / Desktop Push Alerts?</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Browsers block OS-level push prompts inside embedded preview frames. Your <strong>in-app & audio reminders are already active</strong>! For native OS lock-screen notifications and one-tap app installation, open your direct app URL in Chrome/Safari:
              </p>
              <div className="flex items-center gap-2 bg-slate-950/90 p-2 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-300 truncate flex-1">
                  {standaloneAppUrl}
                </span>
                <button
                  onClick={handleCopyUrl}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold flex items-center gap-1 shrink-0"
                >
                  {copiedAppUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedAppUrl ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Preferred Time Selector */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Notification Delivery Time
              </span>
              <span className="text-xs font-mono text-blue-400">{settings.time}</span>
            </div>

            <div className="flex items-center gap-2">
              {['07:00', '08:00', '09:00', '18:00'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleTimeChange(preset)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-mono font-semibold transition-all border ${
                    settings.time === preset
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-600/30'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Custom Time:</span>
              <input
                type="time"
                value={settings.time}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Live Notification Preview Box */}
          <div className="p-3.5 rounded-2xl bg-[#090C13] border border-slate-800/80 space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
              Sample Notification Preview (Clicking Opens Dashboard)
            </span>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>ApexPulse</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Today&apos;s Split: Strength (~30 mins). Tap to open Dashboard!
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          {/* Test Notification Button */}
          <button
            onClick={handleSendTest}
            className="w-full py-3 px-4 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700"
          >
            <Send className="w-3.5 h-3.5 text-blue-400" />
            <span>{testSent ? 'Notification Dispatched ✓' : 'Send Test Notification Now'}</span>
          </button>

          {/* Save / Done button */}
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-transform active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
