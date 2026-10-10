import React, { useState, useEffect, useCallback } from 'react';
import { WorkoutLogEntry } from '../types/workout';
import {
  initGoogleHealthAuth,
  googleHealthSignIn,
  getGoogleHealthAccessToken,
  getOrRefreshGoogleHealthToken,
  clearSavedAccessToken,
  getCurrentGoogleUser,
  logoutGoogleHealth,
} from '../utils/googleHealthAuth';
import {
  Watch,
  RefreshCw,
  CheckCircle2,
  X,
  AlertCircle,
  Flame,
  Clock,
  Activity,
  Unplug,
  Zap,
  ShieldCheck,
  Dumbbell,
  ExternalLink,
} from 'lucide-react';

interface FitbitSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingLogs: WorkoutLogEntry[];
  onSyncLogs: (fitbitLogs: WorkoutLogEntry[]) => number;
  onSyncTodaySteps?: (todaySteps: number | null, dateStr: string, syncTime: string) => void;
  onStatusChange?: (connected: boolean, lastSyncTime: string | null) => void;
  syncTrigger?: number;
}

const HEALTH_LAST_SYNC_KEY = 'apex_fitbit_last_sync';
const HEALTH_AUTO_SYNC_KEY = 'apex_fitbit_auto_sync';
const STEPS_STORAGE_KEY = 'apex_fitbit_daily_steps_v2';

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function parseTimestampMs(raw: any): number | null {
  if (!raw) return null;
  if (typeof raw === 'number' && !isNaN(raw)) {
    if (raw > 1e16) return Math.round(raw / 1e6); // nanoseconds
    if (raw > 1e13) return Math.round(raw / 1e3); // microseconds
    if (raw < 1e11) return Math.round(raw * 1000); // seconds
    return raw;
  }
  if (typeof raw === 'string') {
    if (/^\d{13,}$/.test(raw)) {
      const n = Number(raw);
      if (raw.length >= 18) return Math.round(n / 1e6);
      if (raw.length >= 15) return Math.round(n / 1e3);
      return n;
    }
    const parsed = new Date(raw).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

function extractPointLocalDate(pt: any, fallbackDateStr: string): string {
  // 1. Check civilEndTime / civilStartTime / date object ({ year, month, day } OR { date: { year, month, day } }) or string
  const civilCandidates = [
    pt?.civilStartTime?.date,
    pt?.civilStartTime,
    pt?.civilEndTime?.date,
    pt?.civilEndTime,
    pt?.steps?.interval?.civilStartTime?.date,
    pt?.steps?.interval?.civilStartTime,
    pt?.steps?.interval?.civilEndTime?.date,
    pt?.steps?.interval?.civilEndTime,
    pt?.dailySteps?.date,
    pt?.dailySteps?.interval?.civilStartTime?.date,
    pt?.dailySteps?.interval?.civilStartTime,
    pt?.exercise?.interval?.civilStartTime?.date,
    pt?.exercise?.interval?.civilStartTime,
    pt?.interval?.civilStartTime?.date,
    pt?.interval?.civilStartTime,
    pt?.interval?.civilEndTime?.date,
    pt?.interval?.civilEndTime,
    pt?.civilDate,
    pt?.date,
  ];

  for (const civil of civilCandidates) {
    if (!civil) continue;
    const obj = civil.date && typeof civil.date === 'object' ? civil.date : civil;
    if (typeof obj === 'object' && obj.year && obj.month && obj.day) {
      return `${obj.year}-${String(obj.month).padStart(2, '0')}-${String(obj.day).padStart(
        2,
        '0'
      )}`;
    }
    if (typeof civil === 'string' && /^\d{4}-\d{2}-\d{2}/.test(civil)) {
      return civil.slice(0, 10);
    }
  }

  // 2. Check ISO or epoch start/end time and convert to user's LOCAL calendar date
  const timeCandidates = [
    pt?.steps?.interval?.startTime,
    pt?.steps?.interval?.endTime,
    pt?.dailySteps?.interval?.startTime,
    pt?.dailySteps?.interval?.endTime,
    pt?.exercise?.interval?.startTime,
    pt?.interval?.startTime,
    pt?.interval?.endTime,
    pt?.startTime,
    pt?.endTime,
    pt?.startTimeNanos,
    pt?.endTimeNanos,
    pt?.startTimeMillis,
  ];

  for (const rawTime of timeCandidates) {
    const ms = parseTimestampMs(rawTime);
    if (ms !== null) {
      return toLocalDateStr(new Date(ms));
    }
  }

  return fallbackDateStr;
}

function extractStepCountFromPoint(pt: any): number {
  const candidates = [
    pt?.steps?.countSum,
    pt?.steps?.count,
    pt?.steps?.value,
    pt?.steps?.steps,
    pt?.steps?.totalSteps,
    pt?.rollupValue?.steps?.countSum,
    pt?.rollupValue?.countSum,
    pt?.countSum,
    pt?.dailySteps?.countSum,
    pt?.dailySteps?.count,
    pt?.dailySteps?.steps,
    pt?.dailySteps?.totalSteps,
    pt?.dailySteps?.value,
    pt?.metricsSummary?.steps,
    pt?.exercise?.metricsSummary?.steps,
    pt?.count,
    pt?.steps,
    pt?.totalSteps,
    pt?.value?.intVal,
    pt?.value?.[0]?.intVal,
    pt?.value?.[0]?.fpVal,
    pt?.value,
  ];
  for (const c of candidates) {
    if (typeof c === 'number' && !isNaN(c) && c > 0) return Math.round(c);
    if (typeof c === 'string' && c.trim() !== '' && !isNaN(Number(c)) && Number(c) > 0) {
      return Math.round(Number(c));
    }
  }
  return 0;
}

function extractAverageHeartRateFromPoint(pt: any): number | undefined {
  const ex = pt?.exercise || pt;
  const metrics =
    ex?.metricsSummary ||
    pt?.metricsSummary ||
    ex?.heartRateSummary ||
    pt?.heartRateSummary ||
    ex?.heartRate ||
    pt?.heartRate ||
    {};

  const directCandidates = [
    metrics?.averageHeartRateBeatsPerMinute,
    metrics?.averageHeartRate,
    metrics?.avgHeartRateBpm,
    metrics?.avgHeartRate,
    metrics?.averageBpm,
    metrics?.beatsPerMinute,
    metrics?.bpm,
    ex?.averageHeartRateBeatsPerMinute,
    ex?.averageHeartRate,
    ex?.avgHeartRate,
    pt?.averageHeartRateBeatsPerMinute,
    pt?.averageHeartRate,
    pt?.heartRate?.beatsPerMinute,
    pt?.heartRate?.averageBeatsPerMinute,
    pt?.value?.fpVal,
    pt?.value?.intVal,
    pt?.value?.[0]?.fpVal,
    pt?.value?.[0]?.intVal,
  ];

  for (const c of directCandidates) {
    const num = typeof c === 'number' ? c : typeof c === 'string' ? Number(c) : NaN;
    if (!isNaN(num) && num >= 35 && num <= 230) {
      return Math.round(num);
    }
  }

  // Also check if heartRateSamples or samples array is embedded inside the exercise point
  const samples =
    ex?.heartRateSamples ||
    pt?.heartRateSamples ||
    metrics?.samples ||
    ex?.samples ||
    pt?.samples;
  if (Array.isArray(samples) && samples.length > 0) {
    let sum = 0;
    let count = 0;
    for (const s of samples) {
      const bpm = Number(s?.beatsPerMinute ?? s?.bpm ?? s?.value ?? 0);
      if (!isNaN(bpm) && bpm >= 35 && bpm <= 230) {
        sum += bpm;
        count++;
      }
    }
    if (count > 0) return Math.round(sum / count);
  }

  // Also check heartRateZones weighted average if zones are present
  const zones = ex?.heartRateZones || metrics?.heartRateZones || pt?.heartRateZones;
  if (Array.isArray(zones) && zones.length > 0) {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const z of zones) {
      const minBpm = Number(z?.minBeatsPerMinute ?? z?.min ?? 0);
      const maxBpm = Number(z?.maxBeatsPerMinute ?? z?.max ?? 0);
      const mins = Number(z?.minutes ?? z?.durationMinutes ?? 1);
      if (minBpm > 0 && maxBpm > 0 && mins > 0) {
        weightedSum += ((minBpm + maxBpm) / 2) * mins;
        totalWeight += mins;
      }
    }
    if (totalWeight > 0) {
      const est = Math.round(weightedSum / totalWeight);
      if (est >= 35 && est <= 230) return est;
    }
  }

  return undefined;
}

export const FitbitSyncModal: React.FC<FitbitSyncModalProps> = ({
  isOpen,
  onClose,
  existingLogs,
  onSyncLogs,
  onSyncTodaySteps,
  onStatusChange,
  syncTrigger,
}) => {
  const [connected, setConnected] = useState<boolean>(
    () => Boolean(getGoogleHealthAccessToken())
  );
  const [userName, setUserName] = useState<string | null>(
    () => getCurrentGoogleUser()?.displayName || getCurrentGoogleUser()?.email || null
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enableApiUrl, setEnableApiUrl] = useState<string | null>(null);
  const [syncResultMessage, setSyncResultMessage] = useState<string | null>(null);
  const [apiDiagnostics, setApiDiagnostics] = useState<string[]>([]);

  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HEALTH_AUTO_SYNC_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem(HEALTH_LAST_SYNC_KEY);
    } catch {
      return null;
    }
  });

  const googleHealthApiLibraryUrl =
    'https://console.cloud.google.com/apis/library/health.googleapis.com?project=gen-lang-client-0999957009';

  // Fetch workouts & today's live steps from Google Health API v4 (Fitbit Versa 4) + Fitness API v1
  const syncGoogleHealthWorkouts = useCallback(
    async (accessToken: string, silent = false) => {
      if (!silent) {
        setIsSyncing(true);
        setErrorMessage(null);
        setEnableApiUrl(null);
        setSyncResultMessage(null);
      }

      const diagLog: string[] = [];
      const syncedLogs: WorkoutLogEntry[] = [];
      const now = new Date();
      const todayDateStr = toLocalDateStr(now);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const startOfTodayIso = startOfToday.toISOString();
      let syncedTodaySteps: number | null = null;
      let tokenExpired401 = false;

      try {
        const startMs = Date.now() - 45 * 86400000; // Last 45 days
        const startTimeIso = new Date(startMs).toISOString();

        // =========================================================================
        // 0A. LIVE READING OF TODAY'S STEPS FROM GOOGLE HEALTH API v4
        // Clean & Correct Daily Step Extraction:
        // - Take MAXIMUM from rollUp/dailyRollUp points (never sum pre-aggregated rollup points)
        // - Prioritize :reconcile endpoint with civil_start_time filter (deduplicated by Google),
        //   taking the HIGHEST single point value (never summing across points)
        // - Only fall back to raw dataPoints or Fitness v1 aggregate if :reconcile returns 0 steps
        // - Validate extracted dates against todayDateStr and log to console
        // =========================================================================
        try {
          const tomorrow = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            0,
            0,
            0
          );
          const tomorrowDateStr = toLocalDateStr(tomorrow);
          const endOfTodayIso = endOfToday.toISOString();

          let maxTodayStepsFound = 0;
          let anyTodayPointSeen = false;

          // 1. Try POST /v4/users/me/dataTypes/steps/dataPoints:dailyRollUp (Official Civil-Day Total)
          const dailyRollupBodies = [
            {
              range: {
                civilStartTime: {
                  date: {
                    year: now.getFullYear(),
                    month: now.getMonth() + 1,
                    day: now.getDate(),
                  },
                  time: { hours: 0, minutes: 0, seconds: 0 },
                },
                civilEndTime: {
                  date: {
                    year: tomorrow.getFullYear(),
                    month: tomorrow.getMonth() + 1,
                    day: tomorrow.getDate(),
                  },
                  time: { hours: 0, minutes: 0, seconds: 0 },
                },
              },
              windowSizeDays: 1,
            },
            {
              range: {
                civilStartTime: {
                  year: now.getFullYear(),
                  month: now.getMonth() + 1,
                  day: now.getDate(),
                },
                civilEndTime: {
                  year: tomorrow.getFullYear(),
                  month: tomorrow.getMonth() + 1,
                  day: tomorrow.getDate(),
                },
              },
              windowSizeDays: 1,
            },
          ];

          for (const bodyPayload of dailyRollupBodies) {
            try {
              const drRes = await fetch(
                'https://health.googleapis.com/v4/users/me/dataTypes/steps/dataPoints:dailyRollUp',
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                  },
                  body: JSON.stringify(bodyPayload),
                }
              );

              if (drRes.status === 401) {
                tokenExpired401 = true;
                break;
              }

              if (drRes.ok) {
                const drData: any = await drRes.json().catch(() => ({}));
                const rPts: any[] =
                  drData?.rollupDataPoints ||
                  drData?.dailyRollupDataPoints ||
                  drData?.dataPoints ||
                  [];
                // Rollup points are pre-aggregated; take the MAXIMUM point value (not sum)
                let rollupMax = 0;
                for (const rp of rPts) {
                  const extractedDate = extractPointLocalDate(rp, todayDateStr);
                  console.log(
                    '[Steps] Extracted date from dailyRollUp point:',
                    extractedDate,
                    'Expected:',
                    todayDateStr
                  );
                  if (extractedDate !== todayDateStr) continue;
                  anyTodayPointSeen = true;
                  const c = extractStepCountFromPoint(rp);
                  if (c > rollupMax) rollupMax = c;
                }
                if (rollupMax > maxTodayStepsFound) {
                  maxTodayStepsFound = Math.round(rollupMax);
                  diagLog.push(
                    `Google Health v4 dailyRollUp (${todayDateStr}): ${maxTodayStepsFound.toLocaleString()} steps`
                  );
                }
                break;
              }
            } catch {}
          }

          // 2. Try POST /v4/users/me/dataTypes/steps/dataPoints:rollUp (Physical Window Total for Today)
          if (!tokenExpired401 && maxTodayStepsFound === 0) {
            try {
              const windowSec = Math.max(
                60,
                Math.floor((endOfToday.getTime() - startOfToday.getTime()) / 1000)
              );
              const ruRes = await fetch(
                'https://health.googleapis.com/v4/users/me/dataTypes/steps/dataPoints:rollUp',
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                  },
                  body: JSON.stringify({
                    range: {
                      startTime: startOfTodayIso,
                      endTime: endOfTodayIso,
                    },
                    windowSize: `${windowSec}s`,
                  }),
                }
              );

              if (ruRes.status === 401) {
                tokenExpired401 = true;
              } else if (ruRes.ok) {
                const ruData: any = await ruRes.json().catch(() => ({}));
                const rPts: any[] = ruData?.rollupDataPoints || ruData?.dataPoints || [];
                // Rollup points are pre-aggregated; take the MAXIMUM point value (not sum)
                let ruMax = 0;
                for (const rp of rPts) {
                  const extractedDate = extractPointLocalDate(rp, todayDateStr);
                  console.log(
                    '[Steps] Extracted date from rollUp point:',
                    extractedDate,
                    'Expected:',
                    todayDateStr
                  );
                  if (extractedDate !== todayDateStr) continue;
                  anyTodayPointSeen = true;
                  const c = extractStepCountFromPoint(rp);
                  if (c > ruMax) ruMax = c;
                }
                if (ruMax > maxTodayStepsFound) {
                  maxTodayStepsFound = Math.round(ruMax);
                  diagLog.push(
                    `Google Health v4 rollUp (${todayDateStr}): ${maxTodayStepsFound.toLocaleString()} steps`
                  );
                }
              }
            } catch {}
          }

          // 3. Query Google Health v4 :reconcile endpoint FIRST (deduplicated by Google)
          // Use filter: steps.interval.civil_start_time >= "{today}" AND steps.interval.civil_start_time < "{tomorrow}"
          // Take the HIGHEST single point value (not sum). If this returns > 0 steps, use this value and STOP.
          // Only fall back to raw dataPoints if :reconcile returns 0 steps.
          const civilFilter = `steps.interval.civil_start_time >= "${todayDateStr}T00:00:00" AND steps.interval.civil_start_time < "${tomorrowDateStr}T00:00:00"`;
          const reconcileUrl = `https://health.googleapis.com/v4/users/me/dataTypes/steps/dataPoints:reconcile?filter=${encodeURIComponent(
            civilFilter
          )}&pageSize=10000`;
          const rawFallbackUrl = `https://health.googleapis.com/v4/users/me/dataTypes/steps/dataPoints?filter=${encodeURIComponent(
            civilFilter
          )}&pageSize=10000`;

          const queryStepEndpointMaxPoint = async (
            baseUrl: string,
            label: string
          ): Promise<number> => {
            let pageToken = '';
            let pageCount = 0;
            // Total steps for the day = SUM of every unique step point that falls on today.
            // (Previously this took the single largest interval, which is why the total was always too low.)
            let sumTodaySteps = 0;
            const seenStepPointKeys = new Set<string>();

            while (pageCount < 10) {
              pageCount++;
              const sUrl = pageToken
                ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}pageToken=${encodeURIComponent(
                    pageToken
                  )}`
                : baseUrl;

              const sRes = await fetch(sUrl, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  Accept: 'application/json',
                },
              });

              if (sRes.status === 401) {
                tokenExpired401 = true;
                break;
              }

              if (!sRes.ok) break;

              const sData: any = await sRes.json().catch(() => ({}));
              const pts: any[] =
                sData?.dataPoints ||
                sData?.reconciledDataPoints ||
                sData?.stepsDataPoints ||
                sData?.dailyStepsDataPoints ||
                sData?.steps ||
                sData?.data ||
                [];

              for (const pt of pts) {
                const extractedDate = extractPointLocalDate(pt, todayDateStr);
                const count = extractStepCountFromPoint(pt);
                console.log(
                  '[Steps] Extracted date from point:',
                  extractedDate,
                  'Expected:',
                  todayDateStr,
                  'Steps:',
                  count,
                  'Endpoint:',
                  label
                );

                // Validate extracted date matches TODAY before including in count
                if (extractedDate === todayDateStr) {
                  anyTodayPointSeen = true;
                  // De-duplicate by point name so the same reading is never added twice across pages/endpoints
                  const pointKey = String(pt?.name || pt?.id || `${pt?.interval?.startTime || ''}|${count}`);
                  if (count > 0 && !seenStepPointKeys.has(pointKey)) {
                    seenStepPointKeys.add(pointKey);
                    sumTodaySteps += count;
                  }
                }
              }

              const nextToken = sData?.nextPageToken || '';
              if (!nextToken) break;
              pageToken = String(nextToken);
            }

            return sumTodaySteps;
          };

          if (!tokenExpired401 && maxTodayStepsFound === 0) {
            const reconcileMax = await queryStepEndpointMaxPoint(reconcileUrl, ':reconcile');
            if (reconcileMax > 0) {
              maxTodayStepsFound = Math.round(reconcileMax);
              console.log(
                `[Steps] Using Google Health v4 :reconcile daily sum for ${todayDateStr}:`,
                maxTodayStepsFound
              );
              diagLog.push(
                `Google Health v4 :reconcile (${todayDateStr}): ${maxTodayStepsFound.toLocaleString()} steps`
              );
            } else if (!tokenExpired401) {
              // Fallback to raw dataPoints ONLY if :reconcile returned 0 steps
              const rawMax = await queryStepEndpointMaxPoint(rawFallbackUrl, 'raw dataPoints');
              if (rawMax > 0) {
                maxTodayStepsFound = Math.round(rawMax);
                console.log(
                  `[Steps] :reconcile returned 0; using raw dataPoints max single point for ${todayDateStr}:`,
                  maxTodayStepsFound
                );
                diagLog.push(
                  `Google Health v4 dataPoints fallback (${todayDateStr}): ${maxTodayStepsFound.toLocaleString()} steps`
                );
              }
            }
          }

          if (maxTodayStepsFound > 0) {
            syncedTodaySteps = maxTodayStepsFound;
            diagLog.push(
              `Google Health API v4 Live Steps (${todayDateStr}): ${syncedTodaySteps.toLocaleString()} steps synced`
            );
          } else if (anyTodayPointSeen) {
            diagLog.push(
              `Google Health API v4 Steps (${todayDateStr}): 0 steps in v4 endpoint, checking Fitness API fallback...`
            );
          }
        } catch {
          // Continue to Fitness v1 fallback & exercise sync
        }

        // =========================================================================
        // 0B. FALLBACK TO GOOGLE FITNESS API v1 AGGREGATE ONLY IF v4 RETURNED 0 STEPS
        // Takes the MAXIMUM point value from the daily bucket (does NOT sum points)
        // =========================================================================
        if (!tokenExpired401 && (syncedTodaySteps === null || syncedTodaySteps === 0)) {
          try {
            const fitAggRes = await fetch(
              'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  aggregateBy: [
                    {
                      dataTypeName: 'com.google.step_count.delta',
                      dataSourceId:
                        'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
                    },
                  ],
                  bucketByTime: { durationMillis: 86400000 },
                  startTimeMillis: startOfToday.getTime(),
                  endTimeMillis: endOfToday.getTime(),
                }),
              }
            );

            if (fitAggRes.ok) {
              const fitAggData: any = await fitAggRes.json().catch(() => ({}));
              const buckets: any[] = fitAggData?.bucket || [];
              let fitTodayMax = 0;
              for (const b of buckets) {
                for (const ds of b.dataset || []) {
                  for (const p of ds.point || []) {
                    const extractedDate = extractPointLocalDate(p, todayDateStr);
                    const c = extractStepCountFromPoint(p);
                    console.log(
                      '[Steps] Extracted date from Fitness v1 aggregate point:',
                      extractedDate,
                      'Expected:',
                      todayDateStr,
                      'Steps:',
                      c
                    );
                    if (extractedDate === todayDateStr && c > fitTodayMax) {
                      fitTodayMax = c;
                    }
                  }
                }
              }
              if (fitTodayMax > 0) {
                syncedTodaySteps = Math.round(fitTodayMax);
                console.log(
                  `[Steps] Using Google Fitness v1 aggregate max point for ${todayDateStr}:`,
                  syncedTodaySteps
                );
                diagLog.push(
                  `Google Fit Full-Day Aggregate Steps (${todayDateStr}): ${syncedTodaySteps.toLocaleString()} steps synced`
                );
              }
            }
          } catch {
            // Ignore if token is scoped strictly to googlehealth v4
          }
        }

        // If token expired (401), clear cached token so 1-click Sync can refresh it immediately
        if (tokenExpired401) {
          clearSavedAccessToken();
          setConnected(false);
          if (onStatusChange) {
            onStatusChange(false, lastSyncTime);
          }
          if (!silent) {
            setErrorMessage(
              'Your 1-hour Google Health access token expired. Click "1-Click Sync Watch" below to refresh immediately.'
            );
          }
          return;
        }

        // =========================================================================
        // 1. NEW 2026 GOOGLE HEALTH API v4 (Fitbit Versa 4 Workouts)
        // =========================================================================
        try {
          const filterExpr = `exercise.interval.start_time >= "${startTimeIso}"`;
          const v4Urls = [
            `https://health.googleapis.com/v4/users/me/dataTypes/exercise/dataPoints?filter=${encodeURIComponent(
              filterExpr
            )}&pageSize=1000`,
            `https://health.googleapis.com/v4/users/me/dataTypes/exercise/dataPoints?pageSize=1000`,
          ];

          let v4Handled = false;
          for (const url of v4Urls) {
            if (v4Handled) break;
            const hRes = await fetch(url, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
              },
            });
            if (hRes.status === 401) {
              clearSavedAccessToken();
              setConnected(false);
              if (onStatusChange) onStatusChange(false, lastSyncTime);
              return;
            }
            const hData: any = await hRes.json().catch(() => ({}));

            if (hRes.ok) {
              v4Handled = true;
              // Collect every page of workouts. Previously only the first page was read,
              // so newer sessions (e.g. a swim) could be silently dropped.
              const pickPoints = (d: any): any[] =>
                d?.dataPoints || d?.exerciseDataPoints || d?.exercises || d?.data || [];
              const points: any[] = [...pickPoints(hData)];
              let exPageToken: string = hData?.nextPageToken ? String(hData.nextPageToken) : '';
              let exPageCount = 1;
              while (exPageToken && exPageCount < 20) {
                exPageCount++;
                const pageRes = await fetch(
                  `${url}&pageToken=${encodeURIComponent(exPageToken)}`,
                  { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }
                );
                if (!pageRes.ok) break;
                const pageData: any = await pageRes.json().catch(() => ({}));
                points.push(...pickPoints(pageData));
                exPageToken = pageData?.nextPageToken ? String(pageData.nextPageToken) : '';
              }
              diagLog.push(
                `Google Health API v4 (health.googleapis.com): OK (${points.length} exercise points)`
              );

              for (const pt of points) {
                const ex = pt.exercise || pt;
                const rawType = String(ex.exerciseType || ex.activityType || 'WORKOUT');
                const title = String(
                  ex.displayName ||
                    ex.name ||
                    rawType
                      .replace(/_/g, ' ')
                      .toLowerCase()
                      .replace(/\b\w/g, (c) => c.toUpperCase())
                );
                const titleLower = title.toLowerCase();
                const typeLower = rawType.toLowerCase();

                const isCardio =
                  typeLower.includes('bik') ||
                  typeLower.includes('cycl') ||
                  typeLower.includes('spin') ||
                  typeLower.includes('run') ||
                  typeLower.includes('walk') ||
                  typeLower.includes('aerobic') ||
                  typeLower.includes('cardio') ||
                  titleLower.includes('bike') ||
                  titleLower.includes('spin') ||
                  titleLower.includes('cycle') ||
                  titleLower.includes('run');

                const isMcGill =
                  typeLower.includes('yoga') ||
                  typeLower.includes('pilates') ||
                  typeLower.includes('core') ||
                  typeLower.includes('stretch') ||
                  titleLower.includes('mcgill') ||
                  titleLower.includes('core') ||
                  titleLower.includes('yoga');

                const category = isMcGill ? 'mcgill' : isCardio ? 'cardio' : 'strength';
                const routineId = isMcGill
                  ? 'mcgill-big-3'
                  : isCardio
                  ? 'cardio-session'
                  : 'strength';
                const cardioMode = isCardio
                  ? titleLower.includes('spin') ||
                    typeLower.includes('indoor') ||
                    typeLower.includes('stationary')
                    ? 'spinning'
                    : 'ebike'
                  : undefined;

                const startStr =
                  ex.interval?.startTime ||
                  pt.interval?.startTime ||
                  pt.startTime ||
                  new Date().toISOString();
                const endStr =
                  ex.interval?.endTime ||
                  pt.interval?.endTime ||
                  pt.endTime;

                const sTime = new Date(startStr).getTime() || Date.now();
                const eTime = endStr ? new Date(endStr).getTime() : sTime + 1800000;
                const activeDurSecs = ex.activeDuration
                  ? parseInt(String(ex.activeDuration).replace('s', ''), 10)
                  : Math.round((eTime - sTime) / 1000);
                const durationSeconds = Math.max(60, activeDurSecs || 1800);
                const dateStr = extractPointLocalDate(pt, toLocalDateStr(new Date(sTime)));

                const metrics = ex.metricsSummary || pt.metricsSummary || {};
                const calories = Number(metrics.caloriesKcal || metrics.calories || 0) || undefined;
                const avgHr = extractAverageHeartRateFromPoint(pt);
                const steps =
                  Number(metrics.steps || metrics.stepCount || ex.steps || 0) || undefined;

                syncedLogs.push({
                  id: `ghealth-v4-${pt.name || pt.id || sTime}`,
                  fitbitLogId: String(pt.name || pt.id || sTime),
                  source: 'fitbit',
                  date: dateStr,
                  routineId,
                  routineTitle: title,
                  category,
                  durationSeconds,
                  completedExercisesCount: isCardio ? 1 : 5,
                  cardioMode,
                  caloriesBurned: calories ? Math.round(calories) : undefined,
                  averageHeartRate: avgHr,
                  steps,
                  timestamp: sTime,
                });
              }
            } else {
              const errMsg = String(hData?.error?.message || `HTTP ${hRes.status}`);
              diagLog.push(`Google Health API v4: ${errMsg}`);
              const lowerErr = errMsg.toLowerCase();
              if (
                lowerErr.includes('has not been used in project') ||
                lowerErr.includes('it is disabled') ||
                lowerErr.includes('health.googleapis.com')
              ) {
                setEnableApiUrl(googleHealthApiLibraryUrl);
              }
            }
          }
        } catch (v4Err: any) {
          diagLog.push(`Google Health API v4 network check: ${v4Err?.message || 'skipped'}`);
        }

        // =========================================================================
        // 1B. ENRICH WORKOUTS WITH AVERAGE HEART RATE FROM GOOGLE HEALTH v4 HEARTRATE DATAPOINTS
        // =========================================================================
        const logsMissingHr = syncedLogs.filter((l) => !l.averageHeartRate);
        if (logsMissingHr.length > 0 && !tokenExpired401) {
          try {
            const hrUrls = [
              `https://health.googleapis.com/v4/users/me/dataTypes/heartRate/dataPoints?filter=${encodeURIComponent(
                `heart_rate.interval.start_time >= "${startTimeIso}"`
              )}&pageSize=1000`,
              `https://health.googleapis.com/v4/users/me/dataTypes/heartRate/dataPoints?pageSize=1000`,
              `https://health.googleapis.com/v4/users/me/dataTypes/dailyHeartRate/dataPoints?pageSize=100`,
            ];

            const hrByDate: Record<string, { sum: number; count: number }> = {};
            const hrSamplesWithTime: Array<{ timeMs: number; bpm: number }> = [];

            for (const hrUrl of hrUrls) {
              const hrRes = await fetch(hrUrl, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  Accept: 'application/json',
                },
              });
              if (!hrRes.ok) continue;

              const hrData: any = await hrRes.json().catch(() => ({}));
              const hrPts: any[] =
                hrData?.dataPoints ||
                hrData?.heartRateDataPoints ||
                hrData?.heartRate ||
                hrData?.data ||
                [];

              for (const hPt of hrPts) {
                const bpm = extractAverageHeartRateFromPoint(hPt);
                if (!bpm) continue;

                const dStr = extractPointLocalDate(hPt, '');
                if (dStr) {
                  if (!hrByDate[dStr]) hrByDate[dStr] = { sum: 0, count: 0 };
                  hrByDate[dStr].sum += bpm;
                  hrByDate[dStr].count += 1;
                }

                const rawT =
                  hPt?.heartRate?.interval?.startTime ||
                  hPt?.interval?.startTime ||
                  hPt?.startTime ||
                  hPt?.sampleTime;
                const tMs = parseTimestampMs(rawT);
                if (tMs) {
                  hrSamplesWithTime.push({ timeMs: tMs, bpm });
                }
              }

              if (Object.keys(hrByDate).length > 0) break;
            }

            let enrichedCount = 0;
            for (const log of syncedLogs) {
              if (log.averageHeartRate) continue;

              // First try matching heart rate samples recorded during the workout window (+/- 15 mins)
              const wStart = log.timestamp - 15 * 60000;
              const wEnd = log.timestamp + log.durationSeconds * 1000 + 15 * 60000;
              const windowSamples = hrSamplesWithTime.filter(
                (s) => s.timeMs >= wStart && s.timeMs <= wEnd
              );

              if (windowSamples.length > 0) {
                const avg = Math.round(
                  windowSamples.reduce((acc, s) => acc + s.bpm, 0) / windowSamples.length
                );
                log.averageHeartRate = avg;
                enrichedCount++;
              } else if (hrByDate[log.date] && hrByDate[log.date].count > 0) {
                log.averageHeartRate = Math.round(
                  hrByDate[log.date].sum / hrByDate[log.date].count
                );
                enrichedCount++;
              }
            }

            if (enrichedCount > 0) {
              diagLog.push(
                `Google Health API v4 Heart Rate: Enriched ${enrichedCount} workout session(s) with average BPM`
              );
            }
          } catch {
            // Continue if heartRate endpoint is unavailable
          }
        }

        const nowLabel = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        // Daily steps come exclusively from dedicated step datasources (do NOT combine with workout step estimates)
        let finalTodaySteps: number | null = syncedTodaySteps;
        if (finalTodaySteps !== null && finalTodaySteps > 0) {
          console.log(
            `[Steps] Final daily step count for ${todayDateStr}:`,
            finalTodaySteps
          );
        } else {
          finalTodaySteps = null;
          diagLog.push(`Watch Sync (${todayDateStr}): No new step data in response.`);
        }

        try {
          const rawSaved = localStorage.getItem(STEPS_STORAGE_KEY);
          const map = rawSaved ? JSON.parse(rawSaved) : {};
          const existingToday = map[todayDateStr];
          const existingStepsNum =
            typeof existingToday?.steps === 'number' ? existingToday.steps : 0;

          if (finalTodaySteps !== null && finalTodaySteps > 0) {
            const highestTodaySteps = Math.max(finalTodaySteps, existingStepsNum);
            finalTodaySteps = highestTodaySteps;
            map[todayDateStr] = {
              steps: highestTodaySteps,
              syncedAt: nowLabel,
              hasData: true,
              manualOverride: Boolean(existingToday?.manualOverride && existingStepsNum > finalTodaySteps),
            };
          } else if (!existingToday?.hasData && !existingToday?.manualOverride) {
            map[todayDateStr] = {
              steps: null,
              syncedAt: nowLabel,
              hasData: false,
            };
          }
          localStorage.setItem(STEPS_STORAGE_KEY, JSON.stringify(map));
        } catch {}

        if (onSyncTodaySteps) {
          onSyncTodaySteps(finalTodaySteps, todayDateStr, nowLabel);
        }

        setApiDiagnostics(diagLog);

        const newlyAddedCount = onSyncLogs(syncedLogs);
        setLastSyncTime(nowLabel);
        try {
          localStorage.setItem(HEALTH_LAST_SYNC_KEY, nowLabel);
        } catch {}

        if (onStatusChange) {
          onStatusChange(true, nowLabel);
        }

        if (!silent) {
          if (finalTodaySteps && finalTodaySteps > 0) {
            setSyncResultMessage(
              `Live Sync Complete! Today's Fitbit Steps: ${finalTodaySteps.toLocaleString()} steps (${syncedLogs.length} total watch workouts synced).`
            );
          } else if (syncedLogs.length > 0) {
            setSyncResultMessage(
              `Synced ${newlyAddedCount} new workout${
                newlyAddedCount === 1 ? '' : 's'
              } (${syncedLogs.length} total Fitbit Versa 4 sessions verified). No step data reported by Google Health for today (${todayDateStr}) yet.`
            );
          } else {
            setSyncResultMessage(
              'Checked Google Health API v4 (health.googleapis.com). See live API status below.'
            );
          }
        }
      } catch (err: any) {
        if (!silent) {
          setErrorMessage(err?.message || 'Error communicating with Google Health API.');
        }
      } finally {
        if (!silent) {
          setIsSyncing(false);
        }
      }
    },
    [lastSyncTime, onStatusChange, onSyncLogs, onSyncTodaySteps]
  );

  // 1-Click Automated Sync Handler (uses active token or 1-click silent token refresh)
  const handleOneClickSync = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setIsSyncing(true);
        const token = await getOrRefreshGoogleHealthToken();
        if (token) {
          setConnected(true);
          await syncGoogleHealthWorkouts(token, silent);
        }
      } catch (err: any) {
        if (!silent) {
          setErrorMessage(
            err?.message || 'Click "1-Click Sync Watch" to authorize and sync your Fitbit data.'
          );
        }
      } finally {
        if (!silent) setIsSyncing(false);
      }
    },
    [syncGoogleHealthWorkouts]
  );

  useEffect(() => {
    const unsub = initGoogleHealthAuth(
      (user, token) => {
        setConnected(true);
        setUserName(user.displayName || user.email || 'Google Health User');
        if (onStatusChange) {
          onStatusChange(true, lastSyncTime);
        }
        if (autoSyncEnabled) {
          syncGoogleHealthWorkouts(token, true);
        }
      },
      () => {
        setConnected(false);
      }
    );

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && autoSyncEnabled) {
        const token = getGoogleHealthAccessToken();
        if (token) {
          syncGoogleHealthWorkouts(token, true);
        }
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      unsub();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [autoSyncEnabled, lastSyncTime, onStatusChange, syncGoogleHealthWorkouts]);

  // Triggered on app open, foreground return, or when user clicks "1-Click Sync Watch" on the Dashboard
  // LOCKED: Do not modify this Fitbit step sync handler on other feature changes
  useEffect(() => {
    if (!syncTrigger) return;
    handleOneClickSync(false);
  }, [syncTrigger, handleOneClickSync]);

  const handleGoogleSignIn = async (forceConsent = false) => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    setEnableApiUrl(null);
    setSyncResultMessage(null);
    try {
      const result = await googleHealthSignIn(forceConsent);
      if (result) {
        setUserName(result.user.displayName || result.user.email || 'Google Health User');
        setConnected(true);
        await syncGoogleHealthWorkouts(result.accessToken, false);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Google Sign-In was cancelled or blocked by a popup blocker.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await logoutGoogleHealth();
      setConnected(false);
      setUserName(null);
      setSyncResultMessage(null);
      if (onStatusChange) {
        onStatusChange(false, lastSyncTime);
      }
    } catch {}
  };

  const handleToggleAutoSync = () => {
    const next = !autoSyncEnabled;
    setAutoSyncEnabled(next);
    try {
      localStorage.setItem(HEALTH_AUTO_SYNC_KEY, String(next));
    } catch {}
  };

  if (!isOpen) return null;

  const syncedLogs = existingLogs.filter((l) => l.source === 'fitbit');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0E131F] border border-teal-500/40 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0">
              <Watch className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  1-Click Fitbit Watch Sync
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    connected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                  }`}
                >
                  {connected ? 'Active Session' : '1-Click Ready'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically reuses your token or performs a 1-click refresh so you don&apos;t have
                to manually sign in every time.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main 1-Click Sync Connection Card */}
        <div className="p-5 rounded-2xl bg-[#131A2A] border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-teal-400" />
                <span>
                  {connected
                    ? `Connected (${userName || 'leeevans117@gmail.com'})`
                    : '1-Click Sync with Google Health (Fitbit Versa 4)'}
                </span>
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">
                Syncs live today steps &amp; workouts via{' '}
                <code className="text-teal-300">health.googleapis.com/v4</code>
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleOneClickSync(false)}
                disabled={isSyncing || isLoggingIn}
                className="py-2.5 px-5 rounded-full bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-teal-500/20 transition-all"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSyncing || isLoggingIn ? 'animate-spin' : ''}`}
                />
                <span>
                  {isSyncing || isLoggingIn ? 'Syncing Live...' : '1-Click Sync Now'}
                </span>
              </button>

              {connected && (
                <button
                  onClick={handleDisconnect}
                  className="p-2.5 rounded-full bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 transition-colors"
                  title="Sign Out"
                >
                  <Unplug className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">
              Automatically sync watch data every time you open ApexPulse
            </span>
            <button
              onClick={handleToggleAutoSync}
              className={`px-3 py-1 rounded-full font-bold text-[11px] border transition-colors ${
                autoSyncEnabled
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              {autoSyncEnabled ? 'Auto-Sync ON' : 'Auto-Sync OFF'}
            </button>
          </div>
        </div>

        {/* Status / Error Alerts */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/50 text-xs text-rose-200 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="font-semibold leading-relaxed">{errorMessage}</p>
            </div>
            {enableApiUrl && (
              <a
                href={enableApiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow transition-all"
              >
                <span>Enable Google Health API in Project gen-lang-client-0999957009</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {syncResultMessage && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{syncResultMessage}</p>
            </div>
            {apiDiagnostics.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1 font-mono text-[10px] text-teal-300">
                {apiDiagnostics.map((line, idx) => (
                  <div key={idx}>• {line}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Synced Sessions List */}
        {syncedLogs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Fitbit Versa 4 Sessions Synced to Progress ({syncedLogs.length})
              </h3>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {syncedLogs.slice(0, 8).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-slate-900/90 border border-teal-500/20 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                      {log.category === 'cardio' ? (
                        <Zap className="w-4 h-4 text-blue-400" />
                      ) : log.category === 'mcgill' ? (
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Dumbbell className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          {log.routineTitle}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[9px] font-bold uppercase">
                          Versa 4
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>{log.date}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {Math.round(log.durationSeconds / 60)}m
                        </span>
                        {log.caloriesBurned ? (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-orange-300">
                              <Flame className="w-2.5 h-2.5" />
                              {log.caloriesBurned} kcal
                            </span>
                          </>
                        ) : null}
                        {log.averageHeartRate ? (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-rose-300 font-bold">
                              <Activity className="w-2.5 h-2.5 text-rose-400" />
                              {log.averageHeartRate} bpm
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
