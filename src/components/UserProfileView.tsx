import React, { useState, useEffect } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../utils/firebaseClient';
import {
  UserFitnessProfile,
  ProgressSnapshotEntry,
  PrimaryFitnessObjective,
  StrengthTier,
  DEFAULT_USER_PROFILE,
} from '../types/profile';
import { WorkoutRoutine, WorkoutLogEntry } from '../types/workout';
import {
  User as UserIcon,
  Target,
  Dumbbell,
  Scale,
  TrendingUp,
  Award,
  CheckCircle2,
  Play,
  Plus,
  LogOut,
  LogIn,
  Footprints,
  Flame,
  ShieldCheck,
  Zap,
  Sparkles,
  Trash2,
  Calendar,
} from 'lucide-react';

interface UserProfileViewProps {
  profile: UserFitnessProfile;
  onUpdateProfile: (next: UserFitnessProfile) => void;
  routines: WorkoutRoutine[];
  logs: WorkoutLogEntry[];
  todaySteps: number | null | undefined;
  onStartRoutine: (routine: WorkoutRoutine) => void;
}

const LOCAL_PROFILE_STORAGE_KEY = 'apex_user_fitness_profile_v1';
const LOCAL_SNAPSHOTS_STORAGE_KEY = 'apex_user_progress_snapshots_v1';

const OBJECTIVE_OPTIONS: Array<{
  id: PrimaryFitnessObjective;
  label: string;
  desc: string;
  badgeColor: string;
}> = [
  {
    id: 'strength',
    label: 'Max Calisthenic & Functional Strength',
    desc: 'Prioritizes Pull-Ups, Push-Ups, Diamond Push-Ups, Squats & Loaded Carries.',
    badgeColor: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/35',
  },
  {
    id: 'weight_loss',
    label: 'Fat Loss & Metabolic Conditioning',
    desc: 'Combines 8,000+ daily steps, 35-min E-Bike/Spinning sessions & full-body resistance.',
    badgeColor: 'text-blue-300 bg-blue-500/15 border-blue-500/35',
  },
  {
    id: 'spine_hygiene',
    label: 'Spine Resilience & Core Stability (McGill Big 3)',
    desc: 'Prioritizes Dr. Stuart McGill Big 3 (6-4-2 Curl-Up, 6/side Side Bridge & Bird Dog) + Core Alt.',
    badgeColor: 'text-purple-300 bg-purple-500/15 border-purple-500/35',
  },
  {
    id: 'endurance',
    label: 'Cardiovascular Endurance & Stamina',
    desc: 'Focuses on Zone 2/3 E-Bike & Indoor Spinning sessions + high daily step volume.',
    badgeColor: 'text-amber-300 bg-amber-500/15 border-amber-500/35',
  },
  {
    id: 'athletic_hybrid',
    label: 'Complete Hybrid Athlete (Strength + Cardio + Spine)',
    desc: 'Balanced Mon/Wed/Fri Strength, Tue/Thu/Sat Cardio & daily McGill Big 3 spine armor.',
    badgeColor: 'text-teal-300 bg-teal-500/15 border-teal-500/35',
  },
];

const STRENGTH_TIER_ORDER: StrengthTier[] = ['beginner', 'intermediate', 'advanced', 'elite'];

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  profile,
  onUpdateProfile,
  routines,
  logs,
  todaySteps,
  onStartRoutine,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Editable form state
  const [formState, setFormState] = useState<UserFitnessProfile>(profile);

  // Historical progress check-in snapshots
  const [snapshots, setSnapshots] = useState<ProgressSnapshotEntry[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_SNAPSHOTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [checkInWeight, setCheckInWeight] = useState<string>(String(profile.currentWeightKg));
  const [checkInPullUps, setCheckInPullUps] = useState<string>(String(profile.currentMaxPullUps));
  const [checkInPushUps, setCheckInPushUps] = useState<string>(String(profile.currentMaxPushUps));
  const [checkInNote, setCheckInNote] = useState<string>('');

  useEffect(() => {
    setFormState(profile);
    setCheckInWeight(String(profile.currentWeightKg));
    setCheckInPullUps(String(profile.currentMaxPullUps));
    setCheckInPushUps(String(profile.currentMaxPushUps));
  }, [profile]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Attach Firestore real-time listeners when authenticated
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const unsubProfile = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const loaded: UserFitnessProfile = {
            uid: firebaseUser.uid,
            displayName: String(data.displayName || firebaseUser.displayName || 'Apex Athlete'),
            email: firebaseUser.email || undefined,
            primaryObjective: (data.primaryObjective as PrimaryFitnessObjective) || 'athletic_hybrid',
            currentWeightKg: Number(data.currentWeightKg) || 80,
            startWeightKg: Number(data.startWeightKg) || 85,
            targetWeightKg: Number(data.targetWeightKg) || 75,
            currentStrengthLevel: (data.currentStrengthLevel as StrengthTier) || 'intermediate',
            targetStrengthLevel: (data.targetStrengthLevel as StrengthTier) || 'advanced',
            currentMaxPullUps: Number(data.currentMaxPullUps) ?? 15,
            targetMaxPullUps: Number(data.targetMaxPullUps) ?? 25,
            currentMaxPushUps: Number(data.currentMaxPushUps) ?? 35,
            targetMaxPushUps: Number(data.targetMaxPushUps) ?? 50,
            dailyStepGoal: Number(data.dailyStepGoal) || 8000,
            weeklyWorkoutGoal: Number(data.weeklyWorkoutGoal) || 5,
          };
          onUpdateProfile(loaded);
          try {
            localStorage.setItem(LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(loaded));
          } catch {}
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        } catch {}
      }
    );

    const snapsQuery = query(
      collection(db, 'users', firebaseUser.uid, 'progressSnapshots'),
      orderBy('dateStr', 'desc'),
      limit(20)
    );
    const unsubSnaps = onSnapshot(
      snapsQuery,
      (qSnap) => {
        const list: ProgressSnapshotEntry[] = [];
        qSnap.forEach((d) => {
          const raw = d.data();
          list.push({
            id: d.id,
            uid: String(raw.uid || firebaseUser.uid),
            dateStr: String(raw.dateStr || ''),
            weightKg: Number(raw.weightKg) || 0,
            maxPullUps: Number(raw.maxPullUps) || 0,
            maxPushUps: Number(raw.maxPushUps) || 0,
            note: String(raw.note || ''),
          });
        });
        setSnapshots(list);
        try {
          localStorage.setItem(LOCAL_SNAPSHOTS_STORAGE_KEY, JSON.stringify(list));
        } catch {}
      },
      (err) => {
        try {
          handleFirestoreError(
            err,
            OperationType.LIST,
            `users/${firebaseUser.uid}/progressSnapshots`
          );
        } catch {}
      }
    );

    return () => {
      unsubProfile();
      unsubSnaps();
    };
  }, [authReady, firebaseUser]);

  const clampNum = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, Math.round(val * 10) / 10));

  const persistProfileToCloudAndLocal = async (
    nextProfile: UserFitnessProfile,
    userOverride?: User | null
  ) => {
    const activeUser = userOverride ?? firebaseUser;
    const sanitized: UserFitnessProfile = {
      ...nextProfile,
      uid: activeUser ? activeUser.uid : nextProfile.uid || 'local-athlete',
      displayName: (nextProfile.displayName || 'Apex Athlete').trim().slice(0, 80) || 'Apex Athlete',
      currentWeightKg: clampNum(Number(nextProfile.currentWeightKg) || 80, 20, 400),
      startWeightKg: clampNum(Number(nextProfile.startWeightKg) || 82, 20, 400),
      targetWeightKg: clampNum(Number(nextProfile.targetWeightKg) || 76, 20, 400),
      currentMaxPullUps: Math.round(clampNum(Number(nextProfile.currentMaxPullUps) || 0, 0, 200)),
      targetMaxPullUps: Math.round(clampNum(Number(nextProfile.targetMaxPullUps) || 15, 0, 200)),
      currentMaxPushUps: Math.round(clampNum(Number(nextProfile.currentMaxPushUps) || 0, 0, 500)),
      targetMaxPushUps: Math.round(clampNum(Number(nextProfile.targetMaxPushUps) || 30, 0, 500)),
      dailyStepGoal: Math.round(clampNum(Number(nextProfile.dailyStepGoal) || 8000, 1000, 100000)),
      weeklyWorkoutGoal: Math.round(clampNum(Number(nextProfile.weeklyWorkoutGoal) || 5, 1, 14)),
    };

    onUpdateProfile(sanitized);
    try {
      localStorage.setItem(LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(sanitized));
    } catch {}

    if (activeUser) {
      const userDocRef = doc(db, 'users', activeUser.uid);
      const privateDocRef = doc(db, 'users', activeUser.uid, 'private', 'info');
      const batch = writeBatch(db);

      batch.set(
        userDocRef,
        {
          uid: activeUser.uid,
          displayName: sanitized.displayName,
          primaryObjective: sanitized.primaryObjective,
          currentWeightKg: sanitized.currentWeightKg,
          startWeightKg: sanitized.startWeightKg,
          targetWeightKg: sanitized.targetWeightKg,
          currentStrengthLevel: sanitized.currentStrengthLevel,
          targetStrengthLevel: sanitized.targetStrengthLevel,
          currentMaxPullUps: sanitized.currentMaxPullUps,
          targetMaxPullUps: sanitized.targetMaxPullUps,
          currentMaxPushUps: sanitized.currentMaxPushUps,
          targetMaxPushUps: sanitized.targetMaxPushUps,
          dailyStepGoal: sanitized.dailyStepGoal,
          weeklyWorkoutGoal: sanitized.weeklyWorkoutGoal,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (activeUser.email) {
        batch.set(
          privateDocRef,
          {
            uid: activeUser.uid,
            email: activeUser.email.slice(0, 254),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${activeUser.uid}`);
      }
    }
  };

  const handleGoogleAccountSignIn = async () => {
    setIsSigningIn(true);
    setErrorBanner(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user) {
        const mergedProfile: UserFitnessProfile = {
          ...formState,
          uid: cred.user.uid,
          displayName:
            formState.displayName === DEFAULT_USER_PROFILE.displayName && cred.user.displayName
              ? cred.user.displayName
              : formState.displayName,
          email: cred.user.email || undefined,
        };
        await persistProfileToCloudAndLocal(mergedProfile, cred.user);
        setSaveBanner('Account connected & fitness goals synced to cloud!');
        setTimeout(() => setSaveBanner(null), 3500);
      }
    } catch (err: any) {
      setErrorBanner(err?.message || 'Sign-in cancelled or blocked by popup blocker.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      setSaveBanner('Signed out of cloud account (local profile active).');
      setTimeout(() => setSaveBanner(null), 3000);
    } catch {}
  };

  const handleSaveGoalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorBanner(null);
    try {
      await persistProfileToCloudAndLocal(formState);
      setSaveBanner('Personal fitness goals & profile saved!');
      setTimeout(() => setSaveBanner(null), 3200);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = clampNum(Number(checkInWeight) || formState.currentWeightKg, 20, 400);
    const pull = Math.round(clampNum(Number(checkInPullUps) || formState.currentMaxPullUps, 0, 200));
    const push = Math.round(clampNum(Number(checkInPushUps) || formState.currentMaxPushUps, 0, 500));
    const noteClean = checkInNote.trim().slice(0, 240);

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const snapId = `snap_${Date.now()}`;

    const updatedProfile: UserFitnessProfile = {
      ...formState,
      currentWeightKg: w,
      currentMaxPullUps: pull,
      currentMaxPushUps: push,
    };

    await persistProfileToCloudAndLocal(updatedProfile);

    const newEntry: ProgressSnapshotEntry = {
      id: snapId,
      uid: firebaseUser?.uid || 'local-athlete',
      dateStr,
      weightKg: w,
      maxPullUps: pull,
      maxPushUps: push,
      note: noteClean || 'Goal progress check-in',
    };

    const nextList = [newEntry, ...snapshots].slice(0, 30);
    setSnapshots(nextList);
    try {
      localStorage.setItem(LOCAL_SNAPSHOTS_STORAGE_KEY, JSON.stringify(nextList));
    } catch {}

    if (firebaseUser) {
      const snapRef = doc(db, 'users', firebaseUser.uid, 'progressSnapshots', snapId);
      try {
        await setDoc(snapRef, {
          uid: firebaseUser.uid,
          dateStr,
          weightKg: w,
          maxPullUps: pull,
          maxPushUps: push,
          note: newEntry.note,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.CREATE,
          `users/${firebaseUser.uid}/progressSnapshots/${snapId}`
        );
      }
    }

    setCheckInNote('');
    setSaveBanner('Check-in logged and progress metrics updated!');
    setTimeout(() => setSaveBanner(null), 3000);
  };

  const handleDeleteSnapshot = async (id: string) => {
    const filtered = snapshots.filter((s) => s.id !== id);
    setSnapshots(filtered);
    try {
      localStorage.setItem(LOCAL_SNAPSHOTS_STORAGE_KEY, JSON.stringify(filtered));
    } catch {}

    if (firebaseUser) {
      try {
        await deleteDoc(doc(db, 'users', firebaseUser.uid, 'progressSnapshots', id));
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.DELETE,
          `users/${firebaseUser.uid}/progressSnapshots/${id}`
        );
      }
    }
  };

  // ============================================================================
  // PROGRESS CALCULATIONS TOWARD USER GOALS
  // ============================================================================
  const totalWeightDelta = Math.abs(formState.startWeightKg - formState.targetWeightKg);
  const weightAchievedDelta = Math.abs(formState.startWeightKg - formState.currentWeightKg);
  const isMovingInRightDirection =
    formState.targetWeightKg <= formState.startWeightKg
      ? formState.currentWeightKg <= formState.startWeightKg
      : formState.currentWeightKg >= formState.startWeightKg;

  const weightProgressPct =
    totalWeightDelta === 0
      ? 100
      : !isMovingInRightDirection
      ? 0
      : Math.min(100, Math.round((weightAchievedDelta / totalWeightDelta) * 100));

  const weightRemainingKg =
    Math.round(Math.abs(formState.currentWeightKg - formState.targetWeightKg) * 10) / 10;

  const pullUpProgressPct =
    formState.targetMaxPullUps > 0
      ? Math.min(100, Math.round((formState.currentMaxPullUps / formState.targetMaxPullUps) * 100))
      : 100;

  const pushUpProgressPct =
    formState.targetMaxPushUps > 0
      ? Math.min(100, Math.round((formState.currentMaxPushUps / formState.targetMaxPushUps) * 100))
      : 100;

  const currentTierIdx = STRENGTH_TIER_ORDER.indexOf(formState.currentStrengthLevel);
  const targetTierIdx = STRENGTH_TIER_ORDER.indexOf(formState.targetStrengthLevel);
  const tierProgressPct =
    targetTierIdx <= currentTierIdx
      ? 100
      : Math.round(((currentTierIdx + 1) / (targetTierIdx + 1)) * 100);

  // Weekly workouts completed in the last 7 days
  const sevenDaysAgoMs = Date.now() - 7 * 86400000;
  const workoutsLast7Days = logs.filter((l) => l.timestamp >= sevenDaysAgoMs).length;
  const weeklyGoalPct = Math.min(
    100,
    Math.round((workoutsLast7Days / Math.max(1, formState.weeklyWorkoutGoal)) * 100)
  );

  // Goal-Aligned Workout Recommendations Engine
  const recommendedRoutines = React.useMemo(() => {
    const scored = routines.map((r) => {
      let score = 0;
      let reason = '';

      if (formState.primaryObjective === 'strength') {
        if (r.id === 'strength') {
          score += 100;
          reason = `Directly builds toward your ${formState.targetMaxPullUps} pull-up & ${formState.targetMaxPushUps} push-up targets (${formState.targetStrengthLevel.toUpperCase()} tier).`;
        } else if (r.id === 'strength-alt') {
          score += 85;
          reason = 'Builds scapular pulling power & anti-extension core strength for higher rep sets.';
        } else if (r.isMcGillSpecial) {
          score += 70;
          reason = 'Protects lumbar spine integrity under heavy compound strength loads.';
        } else {
          score += 40;
          reason = 'Active recovery blood flow between strength days.';
        }
      } else if (formState.primaryObjective === 'weight_loss') {
        if (r.isCardioSpecial) {
          score += 100;
          reason = `High caloric expenditure (35m E-Bike / Spinning) to accelerate progress toward your ${formState.targetWeightKg}kg target weight.`;
        } else if (r.id === 'strength') {
          score += 88;
          reason = 'Preserves lean muscle mass and elevates post-exercise metabolic rate.';
        } else {
          score += 65;
          reason = 'Low-impact trunk endurance to keep daily movement output high.';
        }
      } else if (formState.primaryObjective === 'spine_hygiene') {
        if (r.isMcGillSpecial) {
          score += 100;
          reason =
            'Primary Spine Hygiene Protocol: 6-4-2 Curl-Up pyramid + 6 reps/side Side Bridge & Bird Dog.';
        } else if (r.id === 'strength-alt') {
          score += 90;
          reason = 'Spine-sparing core & glute stability progression.';
        } else {
          score += 55;
          reason = 'Neutral-spine compound movement training.';
        }
      } else if (formState.primaryObjective === 'endurance') {
        if (r.isCardioSpecial) {
          score += 100;
          reason = 'Builds aerobic capacity, stroke volume & 80–100 RPM cadence efficiency.';
        } else if (r.id === 'strength-alt') {
          score += 80;
          reason = 'High-tension muscular endurance & postural stamina.';
        } else {
          score += 65;
          reason = 'Full-body strength endurance.';
        }
      } else {
        // athletic_hybrid
        if (r.id === 'strength') {
          score += 95;
          reason = `Core hybrid pillar: advances your ${formState.currentMaxPullUps} → ${formState.targetMaxPullUps} pull-up & ${formState.targetWeightKg}kg body-composition goals.`;
        } else if (r.isMcGillSpecial) {
          score += 92;
          reason = 'Daily 360° core armor (McGill Big 3) for injury-proof hybrid performance.';
        } else if (r.isCardioSpecial) {
          score += 90;
          reason = 'Aerobic engine & fat-oxidation conditioning (Tue/Thu/Sat split).';
        } else {
          score += 82;
          reason = 'Accessory anti-rotation & posterior chain stability.';
        }
      }

      return { routine: r, score, reason };
    });

    return scored.sort((a, b) => b.score - a.score);
  }, [
    routines,
    formState.primaryObjective,
    formState.targetMaxPullUps,
    formState.targetMaxPushUps,
    formState.targetStrengthLevel,
    formState.targetWeightKg,
    formState.currentMaxPullUps,
  ]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Top Account & Athlete Profile Hero Card */}
      <div className="bg-gradient-to-br from-[#10172A] via-[#0E1422] to-[#0A0E17] border border-blue-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 font-black text-xl">
              {firebaseUser?.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={formState.displayName}
                  className="w-full h-full object-cover rounded-2xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserIcon className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {formState.displayName}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    firebaseUser
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {firebaseUser ? 'Cloud Account Synced' : 'Local Profile Active'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {formState.currentStrengthLevel} → {formState.targetStrengthLevel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {firebaseUser
                  ? `Signed in as ${firebaseUser.email} • Goals & progress snapshots backed up to Firestore`
                  : 'Create or sign in with your Google account to back up your personal fitness goals across all devices.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {firebaseUser ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/50 border border-slate-700 hover:border-rose-500/40 text-xs font-bold text-slate-300 hover:text-rose-200 flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoogleAccountSignIn}
                disabled={isSigningIn}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSigningIn ? 'Connecting Account...' : 'Create / Sign In with Google'}</span>
              </button>
            )}
          </div>
        </div>

        {saveBanner && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{saveBanner}</span>
          </div>
        )}

        {errorBanner && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
            {errorBanner}
          </div>
        )}
      </div>

      {/* 1. LIVE GOAL PROGRESS DASHBOARD CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Weight Goal Progress */}
        <div className="bg-[#0F1420] border border-slate-800 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-blue-400" />
              <span>Target Weight</span>
            </span>
            <span className="text-xs font-mono font-bold text-blue-400">{weightProgressPct}%</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {formState.currentWeightKg} kg
            </span>
            <span className="text-xs text-slate-400 font-mono">
              → Goal: {formState.targetWeightKg} kg
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${weightProgressPct}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {weightRemainingKg === 0
              ? 'Target weight achieved!'
              : `${weightRemainingKg} kg from your ${formState.targetWeightKg} kg target (Start: ${formState.startWeightKg} kg)`}
          </p>
        </div>

        {/* Pull-Up Strength Goal */}
        <div className="bg-[#0F1420] border border-slate-800 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              <span>Pull-Up Target</span>
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {pullUpProgressPct}%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {formState.currentMaxPullUps} reps
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / {formState.targetMaxPullUps} reps
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${pullUpProgressPct}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Push-Ups: <strong className="text-white">{formState.currentMaxPushUps}</strong> /{' '}
            {formState.targetMaxPushUps} reps ({pushUpProgressPct}%)
          </p>
        </div>

        {/* Strength Tier Progression */}
        <div className="bg-[#0F1420] border border-slate-800 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-purple-400" />
              <span>Strength Level</span>
            </span>
            <span className="text-xs font-mono font-bold text-purple-400">{tierProgressPct}%</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-white capitalize">
              {formState.currentStrengthLevel}
            </span>
            <span className="text-xs text-purple-300 font-semibold capitalize">
              → {formState.targetStrengthLevel}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${tierProgressPct}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Weekly Sessions: <strong className="text-white">{workoutsLast7Days}</strong> /{' '}
            {formState.weeklyWorkoutGoal} this week ({weeklyGoalPct}%)
          </p>
        </div>

        {/* Daily Step Goal Alignment */}
        <div className="bg-[#0F1420] border border-slate-800 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Footprints className="w-4 h-4 text-teal-400" />
              <span>Daily Step Target</span>
            </span>
            <span className="text-xs font-mono font-bold text-teal-400">
              {todaySteps
                ? `${Math.min(100, Math.round((todaySteps / formState.dailyStepGoal) * 100))}%`
                : '0%'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {(todaySteps ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / {formState.dailyStepGoal.toLocaleString()}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500"
              style={{
                width: `${
                  todaySteps
                    ? Math.min(100, Math.round((todaySteps / formState.dailyStepGoal) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Synced live from your Fitbit watch &amp; Google Health
          </p>
        </div>
      </div>

      {/* 2. GOAL-ALIGNED WORKOUT RECOMMENDATIONS */}
      <div className="bg-[#0E1320] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Recommended Workouts Aligned With Your Objective
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked dynamically for your{' '}
              <strong className="text-blue-300">
                {OBJECTIVE_OPTIONS.find((o) => o.id === formState.primaryObjective)?.label}
              </strong>{' '}
              goal, with a 10s prep countdown at session start and whenever body position changes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {recommendedRoutines.map(({ routine, score, reason }, idx) => (
            <div
              key={routine.id}
              className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                idx === 0
                  ? 'bg-gradient-to-br from-blue-950/40 via-[#121829] to-[#0E1320] border-blue-500/50 shadow-lg'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                      idx === 0
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {idx === 0 ? `Top Goal Match (${score}% Fit)` : `Goal Match (${score}% Fit)`}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {routine.durationMinutes} mins • {routine.estimatedCalories} kcal
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-extrabold text-white">{routine.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{reason}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 font-mono">
                  {routine.exercises.length} exercises • 10s position prep
                </span>
                <button
                  type="button"
                  onClick={() => onStartRoutine(routine)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow transition-all active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Workout</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. CONFIGURE PERSONAL FITNESS GOALS & STRENGTH TARGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleSaveGoalsSubmit}
          className="lg:col-span-2 bg-[#0E1320] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Set Personal Fitness Goals &amp; Targets
              </h2>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/25 transition-all"
            >
              {isSaving ? 'Saving...' : 'Save Goals'}
            </button>
          </div>

          {/* Display Name & Primary Objective */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Athlete Display Name
              </label>
              <input
                type="text"
                maxLength={80}
                value={formState.displayName}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, displayName: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Primary Fitness Objective
              </label>
              <select
                value={formState.primaryObjective}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    primaryObjective: e.target.value as PrimaryFitnessObjective,
                  }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {OBJECTIVE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Weight Targets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Starting Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min={20}
                max={400}
                value={formState.startWeightKg}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    startWeightKg: Number(e.target.value) || 0,
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Current Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min={20}
                max={400}
                value={formState.currentWeightKg}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    currentWeightKg: Number(e.target.value) || 0,
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-300 mb-1">
                Target Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min={20}
                max={400}
                value={formState.targetWeightKg}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    targetWeightKg: Number(e.target.value) || 0,
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-blue-500/50 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Strength Level & Rep Targets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Current Strength Level
              </label>
              <select
                value={formState.currentStrengthLevel}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    currentStrengthLevel: e.target.value as StrengthTier,
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white capitalize"
              >
                {STRENGTH_TIER_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-purple-300 mb-1">
                Target Strength Level
              </label>
              <select
                value={formState.targetStrengthLevel}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    targetStrengthLevel: e.target.value as StrengthTier,
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-purple-500/50 text-xs text-white capitalize"
              >
                {STRENGTH_TIER_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pull-Up, Push-Up, Daily Steps & Weekly Session Goals */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Current Pull-Ups
              </label>
              <input
                type="number"
                min={0}
                max={200}
                value={formState.currentMaxPullUps}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    currentMaxPullUps: Number(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-300 mb-1">
                Target Pull-Ups
              </label>
              <input
                type="number"
                min={0}
                max={200}
                value={formState.targetMaxPullUps}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    targetMaxPullUps: Number(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-emerald-500/50 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Current Push-Ups
              </label>
              <input
                type="number"
                min={0}
                max={500}
                value={formState.currentMaxPushUps}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    currentMaxPushUps: Number(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-300 mb-1">
                Target Push-Ups
              </label>
              <input
                type="number"
                min={0}
                max={500}
                value={formState.targetMaxPushUps}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    targetMaxPushUps: Number(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-emerald-500/50 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-teal-300 mb-1">
                Daily Step Goal
              </label>
              <input
                type="number"
                step={500}
                min={1000}
                max={100000}
                value={formState.dailyStepGoal}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    dailyStepGoal: Number(e.target.value) || 8000,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/50 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-300 mb-1">
                Weekly Workouts
              </label>
              <input
                type="number"
                min={1}
                max={14}
                value={formState.weeklyWorkoutGoal}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    weeklyWorkoutGoal: Number(e.target.value) || 5,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-blue-500/50 text-xs text-white font-mono"
              />
            </div>
          </div>
        </form>

        {/* Right Column: Log Progress Check-In Snapshot & History */}
        <div className="bg-[#0E1320] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-extrabold text-white">Log Progress Check-In</h2>
            </div>

            <form onSubmit={handleLogCheckIn} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={20}
                    max={400}
                    value={checkInWeight}
                    onChange={(e) => setCheckInWeight(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Pull-Ups
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={checkInPullUps}
                    onChange={(e) => setCheckInPullUps(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Push-Ups
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={checkInPushUps}
                    onChange={(e) => setCheckInPushUps(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <input
                type="text"
                maxLength={240}
                placeholder="Optional note (e.g. Felt strong on set 5)"
                value={checkInNote}
                onChange={(e) => setCheckInNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500"
              />

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Log Benchmark Check-In</span>
              </button>
            </form>

            {/* Recent Snapshots List */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Progress History ({snapshots.length})
              </span>
              {snapshots.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">
                  Log your first check-in above to track your weight &amp; strength benchmarks over
                  time.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {snapshots.map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-mono text-[11px] text-blue-300 font-bold">
                          <Calendar className="w-3 h-3" />
                          <span>{s.dateStr}</span>
                          <span>•</span>
                          <span className="text-white">{s.weightKg}kg</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5 truncate">
                          Pull-ups: {s.maxPullUps} • Push-ups: {s.maxPushUps}
                          {s.note ? ` • ${s.note}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSnapshot(s.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                        title="Remove entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
