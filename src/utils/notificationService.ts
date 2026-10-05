/**
 * Daily Notification Engine for ApexPulse
 * Uses the clean title "ApexPulse" on all notifications and routes notification clicks directly to the Dashboard.
 */

import { WEEKLY_SCHEDULE } from '../data/workoutPlan';
import { soundEngine } from './audioNotification';

const NOTIF_SETTINGS_KEY = 'apex_notif_settings';
const LAST_NOTIF_DATE_KEY = 'apex_last_notif_date';

export interface NotificationSettings {
  enabled: boolean;
  time: string; // "HH:MM" e.g. "08:00"
  notifyOnRestDays: boolean;
  soundChimeEnabled: boolean;
}

export interface InAppNotificationPayload {
  id: string;
  title: string;
  body: string;
  timestamp: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  time: '08:00',
  notifyOnRestDays: true,
  soundChimeEnabled: true,
};

class NotificationService {
  private settings: NotificationSettings = DEFAULT_SETTINGS;
  private intervalId: number | null = null;
  private inAppListeners: Array<(payload: InAppNotificationPayload) => void> = [];
  private clickListeners: Array<() => void> = [];

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined') {
      this.startScheduler();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'NAVIGATE_DASHBOARD') {
            this.triggerNavigateDashboard();
          }
        });
      }
    }
  }

  public loadSettings(): NotificationSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem(NOTIF_SETTINGS_KEY);
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      this.settings = DEFAULT_SETTINGS;
    }
    return this.settings;
  }

  public saveSettings(newSettings: Partial<NotificationSettings>): NotificationSettings {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      // ignore
    }
    return this.settings;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public isInIframe(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }

  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'default';
    return Notification.permission;
  }

  public subscribeInAppAlert(listener: (payload: InAppNotificationPayload) => void) {
    this.inAppListeners.push(listener);
    return () => {
      this.inAppListeners = this.inAppListeners.filter((l) => l !== listener);
    };
  }

  public subscribeNotificationClick(listener: () => void) {
    this.clickListeners.push(listener);
    return () => {
      this.clickListeners = this.clickListeners.filter((l) => l !== listener);
    };
  }

  public triggerNavigateDashboard() {
    this.clickListeners.forEach((cb) => cb());
  }

  private emitInAppAlert(title: string, body: string) {
    const payload: InAppNotificationPayload = {
      id: `notif-${Date.now()}`,
      title: 'ApexPulse',
      body,
      timestamp: Date.now(),
    };
    this.inAppListeners.forEach((cb) => cb(payload));
  }

  public async enableReminders(): Promise<{
    enabled: boolean;
    osPermission: NotificationPermission;
    usedInAppFallback: boolean;
  }> {
    this.saveSettings({ enabled: true });

    let osPermission: NotificationPermission = this.getPermission();
    let usedInAppFallback = true;

    if (this.isSupported() && osPermission !== 'denied') {
      try {
        const result = await Notification.requestPermission();
        osPermission = result;
        if (result === 'granted') {
          usedInAppFallback = false;
        }
      } catch {
        // Cross-origin iframe blocked OS prompt; in-app + sound reminders remain active
      }
    }

    this.sendImmediateNotification(
      'ApexPulse',
      `Daily workout reminders active for ${this.settings.time}. Tap to open Dashboard.`
    );

    return {
      enabled: true,
      osPermission,
      usedInAppFallback,
    };
  }

  public sendImmediateNotification(_title: string, body: string, data?: unknown) {
    const cleanTitle = 'ApexPulse';

    // 1. Trigger in-app notification banner & sound chime
    this.emitInAppAlert(cleanTitle, body);
    if (this.settings.soundChimeEnabled) {
      try {
        soundEngine.playRestEndSound();
      } catch {}
    }

    // 2. Also fire OS / Browser system notification with clean "ApexPulse" title
    if (this.isSupported() && this.getPermission() === 'granted') {
      try {
        const notification = new Notification(cleanTitle, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'apex-daily-reminder',
          data: data || { url: '/?tab=dashboard' },
        });

        notification.onclick = () => {
          window.focus();
          this.triggerNavigateDashboard();
          notification.close();
        };
      } catch {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready
            .then((reg) => {
              reg.showNotification(cleanTitle, {
                body,
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: 'apex-daily-reminder',
                data: { url: '/?tab=dashboard' },
              });
            })
            .catch(() => {});
        }
      }
    }
  }

  public sendTodayWorkoutNotification() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const schedule = WEEKLY_SCHEDULE[dayOfWeek];

    if (schedule.isRestDay || schedule.plannedRoutines.length === 0) {
      const body = `${schedule.dayName} Rest & Recovery Day! Tap to open your Workout Dashboard.`;
      this.sendImmediateNotification('ApexPulse', body);
      return;
    }

    const routineNames = schedule.plannedRoutines.map((r) => r.routineTitle).join(' + ');
    const totalMins = schedule.plannedRoutines.reduce((acc, r) => acc + r.durationMinutes, 0);

    const body = `Today's ${schedule.dayName} Split: ${routineNames} (~${totalMins} mins). Tap to open Dashboard!`;

    this.sendImmediateNotification('ApexPulse', body);
  }

  private startScheduler() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = window.setInterval(() => {
      if (!this.settings.enabled) return;

      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(now.getDate()).padStart(2, '0')}`;

      const lastSentDate = localStorage.getItem(LAST_NOTIF_DATE_KEY);

      if (currentTimeStr === this.settings.time && lastSentDate !== todayDateStr) {
        this.sendTodayWorkoutNotification();
        localStorage.setItem(LAST_NOTIF_DATE_KEY, todayDateStr);
      }
    }, 30000);
  }
}

export const notificationService = new NotificationService();
