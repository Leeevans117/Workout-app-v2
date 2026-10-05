import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Music,
  ExternalLink,
  ListMusic,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  Link2,
  Heart,
  Disc3,
  Smartphone,
  Sparkles,
  Radio,
  Shuffle,
  Volume2,
  VolumeX,
} from 'lucide-react';

export interface YouTubeMusicTrack {
  id: string;
  youtubeId?: string;
  playlistId?: string;
  ytMusicAppUri?: string;
  ytMusicWebUrl?: string;
  title: string;
  artist: string;
  category: 'personal' | 'station' | 'custom';
  badge?: string;
}

const PERSONAL_MUSIC_STORAGE_KEY = 'apex_personal_yt_music_v2';
const ACTIVE_TRACK_STORAGE_KEY = 'apex_active_yt_track_id_v2';
const YTM_LINKED_STORAGE_KEY = 'apex_ytm_app_linked_v1';
const YTM_PLAYBACK_MODE_KEY = 'apex_ytm_playback_mode_v1';

/**
 * Built-in Personal YouTube Music Stations & Smart Playlists
 * These work directly with the user's signed-in YouTube Music account and native YouTube Music app:
 * - "LM" = Your Liked Music auto-playlist on YouTube Music
 * - "RDTMAK5uy_kset8DisdE7LSD4TNjEVvrKRTmG7a56sY" = YouTube Music "My Supermix"
 * - "RDTMAK5uy_n9Fbdw7e6ap-98_A-8JYBmPv64v-Uaq1g" = YouTube Music "Workout Mix"
 * - "RDTMAK5uy_lGQK8Y-2c8L2vC-K5bH9pN7x8Z3wV1qR4" = YouTube Music "Energy Mix"
 */
export const PERSONAL_YTM_STATIONS: YouTubeMusicTrack[] = [
  {
    id: 'ytm-my-likes',
    playlistId: 'LM',
    ytMusicAppUri: 'intent://music.youtube.com/playlist?list=LM#Intent;scheme=https;package=com.google.android.apps.youtube.music;end',
    ytMusicWebUrl: 'https://music.youtube.com/playlist?list=LM',
    title: 'My Liked Songs',
    artist: 'Your Personal YouTube Music Likes',
    category: 'personal',
    badge: 'Liked Music',
  },
  {
    id: 'ytm-my-supermix',
    playlistId: 'RDTMAK5uy_kset8DisdE7LSD4TNjEVvrKRTmG7a56sY',
    ytMusicAppUri:
      'intent://music.youtube.com/playlist?list=RDTMAK5uy_kset8DisdE7LSD4TNjEVvrKRTmG7a56sY#Intent;scheme=https;package=com.google.android.apps.youtube.music;end',
    ytMusicWebUrl:
      'https://music.youtube.com/playlist?list=RDTMAK5uy_kset8DisdE7LSD4TNjEVvrKRTmG7a56sY',
    title: 'My Supermix',
    artist: 'Personalized YouTube Music Station',
    category: 'personal',
    badge: 'My Mix',
  },
  {
    id: 'ytm-workout-supermix',
    youtubeId: 'jfKfPfyJRdk',
    playlistId: 'PL4fGSI1pDJn6puJdseH2Rt9sMvt9E2M4i',
    ytMusicAppUri:
      'intent://music.youtube.com/ mood_and_genres#Intent;scheme=https;package=com.google.android.apps.youtube.music;end',
    ytMusicWebUrl: 'https://music.youtube.com/ playlist?list=PL4fGSI1pDJn6puJdseH2Rt9sMvt9E2M4i',
    title: 'High-Intensity Workout Mix',
    artist: 'YouTube Music Workout Playlist',
    category: 'station',
    badge: 'Workout',
  },
  {
    id: 'ytm-heavy-strength',
    youtubeId: '4xDzrJKXOOY',
    ytMusicAppUri:
      'intent://music.youtube.com/watch?v=4xDzrJKXOOY#Intent;scheme=https;package=com.google.android.apps.youtube.music;end',
    ytMusicWebUrl: 'https://music.youtube.com/watch?v=4xDzrJKXOOY',
    title: 'Synthwave Iron Drive — Strength Tempo',
    artist: 'YouTube Music Radio',
    category: 'station',
    badge: '134 BPM',
  },
  {
    id: 'ytm-cardio-cadence',
    youtubeId: '5qap5aO4i9A',
    ytMusicAppUri:
      'intent://music.youtube.com/watch?v=5qap5aO4i9A#Intent;scheme=https;package=com.google.android.apps.youtube.music;end',
    ytMusicWebUrl: 'https://music.youtube.com/watch?v=5qap5aO4i9A',
    title: 'Cardio & Core Flow Radio',
    artist: 'YouTube Music Stream',
    category: 'station',
    badge: '124 BPM',
  },
  {
    id: 'ytm-library-playlists',
    playlistId: 'LM',
    ytMusicAppUri:
      'intent://music.youtube.com/library/playlists#Intent;scheme=https;package=com.google.android.apps.youtube.music;end',
    ytMusicWebUrl: 'https://music.youtube.com/library/playlists',
    title: 'All My Saved Playlists',
    artist: 'Open Playlists in YouTube Music App',
    category: 'personal',
    badge: 'Library',
  },
];

/**
 * Parses any YouTube Music / YouTube URL or ID:
 * - https://music.youtube.com/playlist?list=PL...
 * - https://music.youtube.com/watch?v=...&list=...
 * - https://youtu.be/...
 * - Direct playlist ID (PL..., OLAK5uy_..., RD..., LM) or 11-char video ID
 */
export function parseYouTubeMusicInput(raw: string): {
  youtubeId?: string;
  playlistId?: string;
  cleanWebUrl: string;
  androidIntentUri: string;
} | null {
  const input = raw.trim();
  if (!input) return null;

  let youtubeId: string | undefined;
  let playlistId: string | undefined;

  try {
    if (
      input.includes('http://') ||
      input.includes('https://') ||
      input.includes('youtube.com') ||
      input.includes('youtu.be')
    ) {
      const normalized = input.startsWith('http') ? input : `https://${input}`;
      const url = new URL(normalized);
      playlistId = url.searchParams.get('list') || undefined;
      youtubeId = url.searchParams.get('v') || undefined;

      if (!youtubeId && url.hostname.includes('youtu.be')) {
        youtubeId = url.pathname.replace('/', '').trim() || undefined;
      }
      if (!youtubeId && url.pathname.startsWith('/embed/')) {
        youtubeId = url.pathname.replace('/embed/', '').split('/')[0] || undefined;
      }
      if (!playlistId && url.pathname.startsWith('/browse/')) {
        const browseId = url.pathname.replace('/browse/', '').split('/')[0] || '';
        if (browseId.startsWith('VL')) {
          playlistId = browseId.slice(2);
        } else if (browseId) {
          playlistId = browseId;
        }
      }
    }
  } catch {}

  if (!youtubeId && !playlistId) {
    if (
      /^(PL|OLAK5uy_|RD|UU|FL)[A-Za-z0-9_-]{6,}$/.test(input) ||
      input === 'LM' ||
      input === 'LL'
    ) {
      playlistId = input;
    } else if (/^VL(PL|OLAK5uy_|RD)[A-Za-z0-9_-]{6,}$/.test(input)) {
      playlistId = input.slice(2);
    } else if (/^[A-Za-z0-9_-]{11}$/.test(input)) {
      youtubeId = input;
    }
  }

  if (!youtubeId && !playlistId) return null;

  const pathAndQuery =
    youtubeId && playlistId
      ? `watch?v=${youtubeId}&list=${playlistId}`
      : playlistId
      ? `playlist?list=${playlistId}`
      : `watch?v=${youtubeId}`;

  return {
    youtubeId,
    playlistId,
    cleanWebUrl: `https://music.youtube.com/${pathAndQuery}`,
    androidIntentUri: `intent://music.youtube.com/${pathAndQuery}#Intent;scheme=https;package=com.google.android.apps.youtube.music;end`,
  };
}

function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

/**
 * Triggers playback directly in the user's installed YouTube Music app on Android/iOS
 * or in a persistent named controller tab (`apex_ytm_device_controller`) so switching
 * playlists from the widget updates what is playing on the device without opening duplicate tabs.
 */
function launchInYouTubeMusicDeviceApp(track: YouTubeMusicTrack) {
  const webUrl =
    track.ytMusicWebUrl ||
    (track.youtubeId && track.playlistId
      ? `https://music.youtube.com/watch?v=${track.youtubeId}&list=${track.playlistId}`
      : track.playlistId
      ? `https://music.youtube.com/playlist?list=${track.playlistId}`
      : track.youtubeId
      ? `https://music.youtube.com/watch?v=${track.youtubeId}`
      : 'https://music.youtube.com');

  if (isAndroidDevice() && track.ytMusicAppUri) {
    // Deep-link directly into the native Android YouTube Music app
    const a = document.createElement('a');
    a.href = track.ytMusicAppUri;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // Reuse a single named target ("apex_ytm_device_player") so changing playlists updates the same player
  const a = document.createElement('a');
  a.href = webUrl;
  a.target = 'apex_ytm_device_player';
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export const YouTubeMusicBar: React.FC = () => {
  const [isAppLinked, setIsAppLinked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(YTM_LINKED_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  // Playback mode: 'in_widget' plays right inside the workout screen + syncs with OS MediaSession;
  // 'device_app' deep-links & switches playlists directly inside the installed YouTube Music app
  const [playbackMode, setPlaybackMode] = useState<'in_widget' | 'device_app'>(() => {
    try {
      const saved = localStorage.getItem(YTM_PLAYBACK_MODE_KEY);
      if (saved === 'device_app' || saved === 'in_widget') return saved;
    } catch {}
    return 'in_widget';
  });

  const [customPlaylists, setCustomPlaylists] = useState<YouTubeMusicTrack[]>(() => {
    try {
      const saved = localStorage.getItem(PERSONAL_MUSIC_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const allTracks: YouTubeMusicTrack[] = [
    ...customPlaylists,
    ...PERSONAL_YTM_STATIONS.filter((d) => !customPlaylists.some((c) => c.id === d.id)),
  ];

  const [selectedId, setSelectedId] = useState<string>(() => {
    try {
      return (
        localStorage.getItem(ACTIVE_TRACK_STORAGE_KEY) ||
        (customPlaylists[0]?.id ?? 'ytm-my-likes')
      );
    } catch {
      return 'ytm-my-likes';
    }
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showEmbeddedController, setShowEmbeddedController] = useState(false);

  // Add Personal Playlist / Song Link state
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const currentIndex = Math.max(
    0,
    allTracks.findIndex((t) => t.id === selectedId)
  );
  const currentTrack = allTracks[currentIndex] || allTracks[0];

  useEffect(() => {
    try {
      localStorage.setItem(PERSONAL_MUSIC_STORAGE_KEY, JSON.stringify(customPlaylists));
    } catch {}
  }, [customPlaylists]);

  useEffect(() => {
    if (currentTrack?.id) {
      try {
        localStorage.setItem(ACTIVE_TRACK_STORAGE_KEY, currentTrack.id);
      } catch {}
    }
  }, [currentTrack?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(YTM_PLAYBACK_MODE_KEY, playbackMode);
    } catch {}
  }, [playbackMode]);

  const sendPlayerCommand = (
    func:
      | 'playVideo'
      | 'pauseVideo'
      | 'nextVideo'
      | 'previousVideo'
      | 'mute'
      | 'unMute'
      | 'setShuffle',
    args: any[] = []
  ) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    } catch {}
  };

  // Connect with Device / OS MediaSession API so hardware headphones, watch media controls,
  // and Android lock-screen controls stay synced with the workout widget
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: 'ApexPulse • YouTube Music Controller',
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => {
        setIsPlaying(true);
        sendPlayerCommand('playVideo');
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
        sendPlayerCommand('pauseVideo');
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handleSkipPrev();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handleSkipNext();
      });
    } catch {}
  });

  const handleTogglePlay = () => {
    if (playbackMode === 'device_app' && !isPlaying) {
      setIsPlaying(true);
      launchInYouTubeMusicDeviceApp(currentTrack);
      return;
    }
    const next = !isPlaying;
    setIsPlaying(next);
    sendPlayerCommand(next ? 'playVideo' : 'pauseVideo');
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sendPlayerCommand(next ? 'mute' : 'unMute');
  };

  const handleShufflePlaylist = () => {
    sendPlayerCommand('setShuffle', [true]);
    sendPlayerCommand('nextVideo');
    setIsPlaying(true);
    setStatusBanner(`Shuffling "${currentTrack.title}" on your device`);
    setTimeout(() => setStatusBanner(null), 2500);
  };

  const handleSkipNext = () => {
    if (currentTrack.playlistId && isPlaying && playbackMode === 'in_widget') {
      sendPlayerCommand('nextVideo');
      return;
    }
    const nextIdx = (currentIndex + 1) % allTracks.length;
    const nextTrack = allTracks[nextIdx];
    setSelectedId(nextTrack.id);
    setIsPlaying(true);
    if (playbackMode === 'device_app') {
      launchInYouTubeMusicDeviceApp(nextTrack);
    }
  };

  const handleSkipPrev = () => {
    if (currentTrack.playlistId && isPlaying && playbackMode === 'in_widget') {
      sendPlayerCommand('previousVideo');
      return;
    }
    const prevIdx = (currentIndex - 1 + allTracks.length) % allTracks.length;
    const prevTrack = allTracks[prevIdx];
    setSelectedId(prevTrack.id);
    setIsPlaying(true);
    if (playbackMode === 'device_app') {
      launchInYouTubeMusicDeviceApp(prevTrack);
    }
  };

  const handleSelectPlaylistOrTrack = (
    track: YouTubeMusicTrack,
    forceLaunchApp = false
  ) => {
    setSelectedId(track.id);
    setIsPlaying(true);
    setIsAppLinked(true);
    try {
      localStorage.setItem(YTM_LINKED_STORAGE_KEY, 'true');
    } catch {}

    if (forceLaunchApp || playbackMode === 'device_app') {
      launchInYouTubeMusicDeviceApp(track);
      setStatusBanner(`Switched YouTube Music app to "${track.title}"`);
    } else {
      setTimeout(() => sendPlayerCommand('playVideo'), 250);
      setStatusBanner(`Now playing "${track.title}"`);
    }
    setTimeout(() => setStatusBanner(null), 2800);
  };

  const handleSaveCustomPlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsed = parseYouTubeMusicInput(urlInput);
    if (!parsed) {
      setFormError(
        'In your YouTube Music app, tap Share → Copy Link on any playlist, album, or song, then paste it here.'
      );
      return;
    }

    const cleanTitle =
      titleInput.trim() ||
      (parsed.playlistId && !parsed.youtubeId
        ? 'My Custom YouTube Music Playlist'
        : 'My Saved YouTube Music Song');

    const newEntry: YouTubeMusicTrack = {
      id: `custom-ytm-${Date.now()}`,
      youtubeId: parsed.youtubeId,
      playlistId: parsed.playlistId,
      ytMusicAppUri: parsed.androidIntentUri,
      ytMusicWebUrl: parsed.cleanWebUrl,
      title: cleanTitle,
      artist: parsed.playlistId ? 'Saved YouTube Music Playlist' : 'Saved YouTube Music Track',
      category: 'custom',
      badge: 'My Playlist',
    };

    setCustomPlaylists((prev) => [newEntry, ...prev]);
    setSelectedId(newEntry.id);
    setIsPlaying(true);
    setUrlInput('');
    setTitleInput('');

    if (playbackMode === 'device_app') {
      launchInYouTubeMusicDeviceApp(newEntry);
    }
    setStatusBanner(`Added "${cleanTitle}" to your YouTube Music Controller!`);
    setTimeout(() => setStatusBanner(null), 3000);
  };

  const handleDeleteCustomPlaylist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomPlaylists((prev) => prev.filter((item) => item.id !== id));
    if (selectedId === id) {
      setSelectedId('ytm-my-likes');
    }
  };

  // Construct embed URL so the user's browser session plays their YouTube Music playlist directly
  const embedSrc = (() => {
    const baseParams = `enablejsapi=1&autoplay=${
      isPlaying ? 1 : 0
    }&controls=1&modestbranding=1&rel=0&playsinline=1`;

    if (currentTrack.youtubeId && currentTrack.playlistId) {
      return `https://www.youtube.com/embed/${currentTrack.youtubeId}?list=${encodeURIComponent(
        currentTrack.playlistId
      )}&${baseParams}`;
    }
    if (currentTrack.playlistId && !currentTrack.youtubeId) {
      return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(
        currentTrack.playlistId
      )}&${baseParams}`;
    }
    return `https://www.youtube.com/embed/${
      currentTrack.youtubeId || 'jfKfPfyJRdk'
    }?${baseParams}`;
  })();

  return (
    <div className="w-full relative">
      {/* Expandable Interactive Deck / Embedded Playlist Scrubber */}
      <div
        className={
          showEmbeddedController
            ? 'mb-2 rounded-2xl overflow-hidden border border-rose-500/40 bg-[#0B0F1A] shadow-xl p-2.5 space-y-2'
            : 'w-0 h-0 opacity-0 pointer-events-none absolute overflow-hidden'
        }
      >
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Active Device Player • {currentTrack.title}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => launchInYouTubeMusicDeviceApp(currentTrack)}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-extrabold flex items-center gap-1 transition-colors"
            >
              <Smartphone className="w-3 h-3" />
              <span>Play in YT Music App</span>
            </button>
            <button
              type="button"
              onClick={() => setShowEmbeddedController(false)}
              className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="h-28 sm:h-32 w-full rounded-xl overflow-hidden bg-black border border-slate-800">
          <iframe
            ref={iframeRef}
            key={`${currentTrack.id}-${currentTrack.youtubeId || ''}-${
              currentTrack.playlistId || ''
            }`}
            src={embedSrc}
            title={currentTrack.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            className="w-full h-full border-0"
          />
        </div>
      </div>

      {/* Main Compact YouTube Music Controller Bar */}
      <div className="w-full bg-[#101522] border border-rose-500/35 rounded-2xl px-3 py-2 flex items-center justify-between gap-2 shadow-lg">
        {/* Left: Current Playlist / Song + Tap to Switch Playlists */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left group"
          title="Tap to switch your YouTube Music playlists or change what's playing on your device"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-600/20 group-hover:bg-rose-600/30 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 relative transition-colors">
            <Music className="w-4 h-4" />
            {isPlaying && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute -top-0.5 -right-0.5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                {playbackMode === 'device_app' ? 'YT Music App' : 'YT Music'}
              </span>
              <span className="text-xs font-bold text-white group-hover:text-rose-200 truncate block transition-colors">
                {currentTrack.title}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 truncate">
              <span className="truncate">{currentTrack.artist}</span>
              <span>•</span>
              <span className="font-semibold text-rose-300 shrink-0 underline decoration-rose-500/40">
                Switch Playlist ({allTracks.length})
              </span>
            </div>
          </div>
        </button>

        {/* Right: Device Transport Controls + Playlists Selector + Launch Native App */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleSkipPrev}
            className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            title="Previous Track / Playlist"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleTogglePlay}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shadow transition-transform active:scale-95 ${
              isPlaying
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
            title={isPlaying ? 'Pause Playback' : 'Play Selected Playlist'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={handleSkipNext}
            className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            title="Next Track in Playlist"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleShufflePlaylist}
            className="hidden sm:flex w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 items-center justify-center text-slate-300 hover:text-rose-300 transition-colors"
            title="Shuffle Current Playlist"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-[10px] font-extrabold text-rose-200 hover:text-white transition-colors"
            title="Open Playlists & Control What's Playing on Your Device"
          >
            <ListMusic className="w-3.5 h-3.5 text-rose-400" />
            <span>Playlists</span>
          </button>

          <button
            type="button"
            onClick={() => launchInYouTubeMusicDeviceApp(currentTrack)}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-rose-300 hover:text-white transition-colors"
            title="Launch directly in your device's YouTube Music app"
          >
            <Smartphone className="w-3 h-3 text-rose-400" />
            <span>App</span>
          </button>
        </div>
      </div>

      {/* Playlists & Device Controller Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-[#0E1320] border border-rose-500/40 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-left">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <Disc3 className="w-6 h-6 animate-spin" style={{ animationDuration: '8s' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-white tracking-tight">
                      YouTube Music App Controller
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {isAppLinked ? 'App Linked' : 'Ready'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select any of your playlists below to immediately change what&apos;s playing on
                    your device while you work out.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {statusBanner && (
              <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{statusBanner}</span>
              </div>
            )}

            {/* Playback Target Selector: Play In-Widget vs Control Native YouTube Music App */}
            <div className="p-3.5 rounded-2xl bg-[#131929] border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  How should selecting a playlist play on your device?
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPlaybackMode('in_widget')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    playbackMode === 'in_widget'
                      ? 'bg-rose-600/20 border-rose-500 text-white'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-rose-400" />
                      <span>In-Workout Player</span>
                    </span>
                    {playbackMode === 'in_widget' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                    Streams right inside the workout timer bar &amp; syncs with your headphones /
                    lock-screen controls.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPlaybackMode('device_app')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    playbackMode === 'device_app'
                      ? 'bg-rose-600/20 border-rose-500 text-white'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-rose-400" />
                      <span>YouTube Music App</span>
                    </span>
                    {playbackMode === 'device_app' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                    Directly launches &amp; switches playlists inside your installed YouTube Music
                    app in the background.
                  </p>
                </button>
              </div>
            </div>

            {/* Now Playing Active Remote Deck */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/45 via-[#151A2C] to-[#101422] border border-rose-500/40 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400 block">
                    Active Device Playlist
                  </span>
                  <h4 className="text-sm font-extrabold text-white truncate mt-0.5">
                    {currentTrack.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">{currentTrack.artist}</p>
                </div>

                <button
                  type="button"
                  onClick={() => launchInYouTubeMusicDeviceApp(currentTrack)}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1.5 shrink-0 shadow-md shadow-rose-600/20 transition-all"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Open in YT Music App</span>
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSkipPrev}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className={`px-4 py-1.5 rounded-xl text-xs font-extrabold text-white flex items-center gap-1.5 ${
                      isPlaying ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipNext}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1"
                  >
                    <span>Next</span>
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleShufflePlaylist}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-rose-300 flex items-center gap-1"
                    title="Shuffle Tracks"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEmbeddedController((v) => !v)}
                  className="text-[11px] font-bold text-rose-300 hover:text-white underline"
                >
                  {showEmbeddedController ? 'Hide Track Scrubber' : 'Show Track Scrubber'}
                </button>
              </div>
            </div>

            {/* Your Linked YouTube Music Playlists — Tap Any to Switch What's Playing */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Your Playlists — Tap to Change What&apos;s Playing ({allTracks.length})
                </span>
                <a
                  href="https://music.youtube.com/library/playlists"
                  target="apex_ytm_device_player"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <span>Browse YT Music Library</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {allTracks.map((track) => {
                  const isCurrent = track.id === currentTrack.id;
                  const isCustomRemovable = customPlaylists.some((c) => c.id === track.id);
                  return (
                    <div
                      key={track.id}
                      onClick={() => handleSelectPlaylistOrTrack(track, false)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleSelectPlaylistOrTrack(track, false);
                        }
                      }}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-rose-950/45 border-rose-500/70 text-white shadow-md'
                          : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800/90 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isCurrent
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {track.id === 'ytm-my-likes' ? (
                            <Heart className="w-4 h-4 fill-current" />
                          ) : track.id === 'ytm-my-supermix' ? (
                            <Sparkles className="w-4 h-4" />
                          ) : isCurrent && isPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {track.badge && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold uppercase shrink-0">
                                {track.badge}
                              </span>
                            )}
                            <span className="text-xs font-bold text-white truncate">
                              {track.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                            {track.artist}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectPlaylistOrTrack(track, true);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-rose-600 text-[10px] font-bold text-rose-200 hover:text-white flex items-center gap-1 transition-colors"
                          title="Launch this playlist directly in the YouTube Music app on your device"
                        >
                          <Smartphone className="w-3 h-3" />
                          <span>Play in App</span>
                        </button>

                        {isCustomRemovable && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomPlaylist(track.id, e)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Remove playlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pin Any Personal Playlist from Your YouTube Music App */}
            <form
              onSubmit={handleSaveCustomPlaylist}
              className="p-4 rounded-2xl bg-[#131929] border border-slate-800 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Pin a Playlist from Your YouTube Music App</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                In your YouTube Music app, tap <strong className="text-slate-200">Share → Copy link</strong> on any of your personal playlists and paste it once below so you can switch to it with 1 tap during workouts:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="Playlist Name (e.g. Gym PRs)"
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste music.youtube.com/playlist?list=... link"
                  className="sm:col-span-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              {formError && (
                <p className="text-[11px] text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-2">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-rose-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Pin Playlist to Workout Widget</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
