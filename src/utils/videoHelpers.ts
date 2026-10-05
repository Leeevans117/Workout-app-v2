import { Exercise } from '../types/workout';

// Curated YouTube Shorts & Quick-Clip Form Demos by movement pattern / exercise ID
const SHORT_FORM_YOUTUBE_MAP: Record<string, { youtubeId: string; startSec?: number; endSec?: number }> = {
  'pull-ups-15-in-5': { youtubeId: 'eGo4IYlbE5g', startSec: 18, endSec: 52 },
  'pushups-4x12': { youtubeId: 'IODxDxX7oi4', startSec: 15, endSec: 48 },
  'diamond-pushups-3x8': { youtubeId: 'J0DnG1_S92I', startSec: 12, endSec: 45 },
  'squats-4x15': { youtubeId: 'P-yaD24bUE8', startSec: 10, endSec: 42 },
  'farmers-carries-3x10m': { youtubeId: '1uOs1hP3u4A', startSec: 15, endSec: 48 },
  'mcgill-curl-up': { youtubeId: 'vc1E5CfRfos', startSec: 12, endSec: 45 },
  'mcgill-side-bridge': { youtubeId: 'K2VljzCC16g', startSec: 10, endSec: 42 },
  'mcgill-bird-dog': { youtubeId: 'wiFNA3sqjCA', startSec: 10, endSec: 42 },
  'alt-scap-pullups': { youtubeId: '9M8ylnbriB0', startSec: 10, endSec: 42 },
  'alt-dead-bugs': { youtubeId: 'vgufDyLHcIE', startSec: 12, endSec: 45 },
  'alt-shoulder-tap-pushups': { youtubeId: 'VfwCQ14soUo', startSec: 8, endSec: 40 },
  'alt-glute-bridge-march': { youtubeId: 'XLXGydU5DdU', startSec: 12, endSec: 45 },
  'alt-rkc-pillar-plank': { youtubeId: '9uX34tkHUto', startSec: 15, endSec: 48 },
};

export interface ShortFormVideoConfig {
  embedUrl: string;
  watchUrl: string;
  durationBadge: string;
  quickBullets: [string, string, string];
  mistakeCallout: string;
}

export function getShortFormVideoConfig(exercise: Exercise): ShortFormVideoConfig {
  const vRef = exercise.videoReference;
  const mapped = SHORT_FORM_YOUTUBE_MAP[exercise.id];
  const ytId = vRef?.shortYoutubeId || mapped?.youtubeId || vRef?.youtubeId || 'IODxDxX7oi4';
  const startSec = vRef?.shortStartSeconds ?? mapped?.startSec ?? 12;
  const endSec = vRef?.shortEndSeconds ?? mapped?.endSec ?? 45;

  const embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?start=${startSec}&end=${endSec}&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${ytId}`;
  const watchUrl = `https://www.youtube.com/watch?v=${ytId}&t=${startSec}s`;

  const cues = exercise.formCues || [];
  const quickBullets: [string, string, string] = [
    cues[0] || 'Establish 360° core brace before initiating movement.',
    cues[1] || 'Maintain strict joint alignment through the active range.',
    cues[2] || `Control the eccentric phase and rest ${exercise.defaultRestSeconds}s between sets.`,
  ];

  const mistakeCallout =
    vRef?.commonMistakes?.[0] || 'Rushing the tempo or losing neutral spine alignment.';

  return {
    embedUrl,
    watchUrl,
    durationBadge: '30s Shorts Demo',
    quickBullets,
    mistakeCallout,
  };
}
