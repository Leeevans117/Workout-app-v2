// Persistent Background YouTube Music Library & Playback Engine (v6 — Keyless + OAuth Hybrid)
// - Works 100% WITHOUT requiring YouTube Data API v3 to be enabled in Google Cloud Console!
// - Uses backend /api/ytmusic/search and /api/ytmusic/playlist to fetch real song videoIds, titles, artists, and artwork immediately.
// - Also supports YouTube Data API v3 automatically if enabled, or falls back seamlessly with zero error banners.
// - Links directly to phone / OS MediaSession (Play, Pause, Previous Track, Next Track, Seek) + silent Web Audio keep-alive so Android/iOS lock-screen & headphone buttons control the player reliably.

import {
  getGoogleHealthAccessToken,
  getOrRefreshGoogleHealthToken,
} from './googleHealthAuth';

export interface YouTubeMusicSong {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnailUrl?: string;
  playlistId?: string;
  playlistTitle?: string;
}

export interface YouTubeMusicPlaylistSummary {
  id: string;
  playlistId: string;
  title: string;
  description?: string;
  itemCount: number;
  thumbnailUrl?: string;
  isLikedSongs?: boolean;
  isCustom?: boolean;
}

export interface YouTubePlayerStateSnapshot {
  isReady: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  isShuffle: boolean;
  isSyncingLibrary: boolean;
  libraryConnected: boolean;
  libraryError: string | null;
  enableYouTubeApiUrl: string | null;
  currentSong: YouTubeMusicSong | null;
  currentQueueTitle: string;
  queue: YouTubeMusicSong[];
  queueIndex: number;
  currentTimeSec: number;
  durationSec: number;
  playlists: YouTubeMusicPlaylistSummary[];
  likedSongs: YouTubeMusicSong[];
  playlistTracksMap: Record<string, YouTubeMusicSong[]>;
  searchResults: YouTubeMusicSong[];
  isSearching: boolean;
}

const LIBRARY_CACHE_KEY = 'apex_ytm_full_library_cache_v6';
const QUEUE_CACHE_KEY = 'apex_ytm_active_queue_v6';

export function parseYouTubeMusicInput(raw: string): {
  videoId?: string;
  playlistId?: string;
} | null {
  const input = raw.trim();
  if (!input) return null;

  let videoId: string | undefined;
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
      videoId = url.searchParams.get('v') || undefined;

      if (!videoId && url.hostname.includes('youtu.be')) {
        videoId = url.pathname.replace('/', '').trim() || undefined;
      }
      if (!videoId && url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.replace('/embed/', '').split('/')[0] || undefined;
      }
      if (!playlistId && url.pathname.startsWith('/browse/')) {
        const browseId = url.pathname.replace('/browse/', '').split('/')[0] || '';
        playlistId = browseId.startsWith('VL') ? browseId.slice(2) : browseId;
      }
    }
  } catch {}

  if (!videoId && !playlistId) {
    if (
      /^(PL|OLAK5uy_|RD|UU|FL|LL)[A-Za-z0-9_-]{4,}$/.test(input) ||
      input === 'LM' ||
      input === 'LL'
    ) {
      playlistId = input;
    } else if (/^VL(PL|OLAK5uy_|RD)[A-Za-z0-9_-]{6,}$/.test(input)) {
      playlistId = input.slice(2);
    } else if (/^[A-Za-z0-9_-]{11}$/.test(input)) {
      videoId = input;
    }
  }

  if (!videoId && !playlistId) return null;
  return { videoId, playlistId };
}

class YouTubeMusicEngine {
  private player: any = null;
  private isReady = false;
  private isPlaying = false;
  private isMuted = false;
  private isShuffle = false;
  private isSyncingLibrary = false;
  private libraryConnected = true;
  private libraryError: string | null = null;
  private enableYouTubeApiUrl: string | null = null;

  private playlists: YouTubeMusicPlaylistSummary[] = [];
  private likedSongs: YouTubeMusicSong[] = [];
  private playlistTracksMap: Record<string, YouTubeMusicSong[]> = {};
  private searchResults: YouTubeMusicSong[] = [];
  private isSearching = false;

  private queue: YouTubeMusicSong[] = [];
  private queueIndex = 0;
  private currentQueueTitle = 'My Liked Songs';
  private currentTimeSec = 0;
  private durationSec = 0;

  private listeners = new Set<(state: YouTubePlayerStateSnapshot) => void>();
  private apiLoadingPromise: Promise<void> | null = null;
  private pendingPlayOnReady = false;
  private progressInterval: any = null;
  private hasBootstrappedCatalog = false;
  private audioCtx: AudioContext | null = null;
  private keepAliveGain: GainNode | null = null;

  private ensureSilentAudioSession(active: boolean) {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (active) {
        if (!this.audioCtx) {
          this.audioCtx = new AudioContextClass();
          const osc = this.audioCtx.createOscillator();
          this.keepAliveGain = this.audioCtx.createGain();
          this.keepAliveGain.gain.value = 0.00001; // Inaudible keep-alive so mobile OS binds MediaSession hardware keys
          osc.connect(this.keepAliveGain);
          this.keepAliveGain.connect(this.audioCtx.destination);
          osc.start();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
      } else if (this.audioCtx && this.audioCtx.state === 'running') {
        this.audioCtx.suspend().catch(() => {});
      }
    } catch {}
  }

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('apex_personal_yt_music_v1');
        localStorage.removeItem('apex_personal_yt_music_v2');
        localStorage.removeItem('apex_personal_yt_music_v3');
        localStorage.removeItem('apex_personal_yt_music_v4');
        localStorage.removeItem('apex_ytm_full_library_cache_v5');

        const rawLib = localStorage.getItem(LIBRARY_CACHE_KEY);
        if (rawLib) {
          const parsed = JSON.parse(rawLib);
          if (Array.isArray(parsed.playlists)) this.playlists = parsed.playlists;
          if (Array.isArray(parsed.likedSongs)) this.likedSongs = parsed.likedSongs;
          if (parsed.playlistTracksMap && typeof parsed.playlistTracksMap === 'object') {
            this.playlistTracksMap = parsed.playlistTracksMap;
          }
        }

        const rawQueue = localStorage.getItem(QUEUE_CACHE_KEY);
        if (rawQueue) {
          const parsedQ = JSON.parse(rawQueue);
          if (Array.isArray(parsedQ.queue) && parsedQ.queue.length > 0) {
            this.queue = parsedQ.queue;
            this.queueIndex = Math.max(
              0,
              Math.min(Number(parsedQ.queueIndex) || 0, this.queue.length - 1)
            );
            this.currentQueueTitle = parsedQ.currentQueueTitle || 'My YouTube Music';
          }
        } else if (this.likedSongs.length > 0) {
          this.queue = [...this.likedSongs];
          this.queueIndex = 0;
          this.currentQueueTitle = 'My Liked Songs';
        }
      } catch {}
    }
  }

  public init() {
    if (typeof window === 'undefined') return;
    this.ensureContainerAndApi();
    this.setupHardwareKeyboardMediaKeys();

    if (!this.hasBootstrappedCatalog) {
      this.hasBootstrappedCatalog = true;
      // Automatically sync the full Liked Songs playlist if empty or still on the old 20-song cache
      if (this.likedSongs.length < 30 || this.queue.length === 0) {
        this.syncPersonalLibrary(true);
      }
    }
  }

  private saveLibraryCache() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        LIBRARY_CACHE_KEY,
        JSON.stringify({
          playlists: this.playlists,
          likedSongs: this.likedSongs,
          playlistTracksMap: this.playlistTracksMap,
        })
      );
    } catch {}
  }

  private saveQueueCache() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        QUEUE_CACHE_KEY,
        JSON.stringify({
          queue: this.queue,
          queueIndex: this.queueIndex,
          currentQueueTitle: this.currentQueueTitle,
        })
      );
    } catch {}
  }

  public getSnapshot(): YouTubePlayerStateSnapshot {
    const currentSong =
      this.queue[this.queueIndex] ||
      this.likedSongs[0] ||
      this.searchResults[0] ||
      null;
    return {
      isReady: this.isReady,
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      isShuffle: this.isShuffle,
      isSyncingLibrary: this.isSyncingLibrary,
      libraryConnected: this.libraryConnected,
      libraryError: this.libraryError,
      enableYouTubeApiUrl: this.enableYouTubeApiUrl,
      currentSong,
      currentQueueTitle: this.currentQueueTitle,
      queue: this.queue,
      queueIndex: this.queueIndex,
      currentTimeSec: this.currentTimeSec,
      durationSec: this.durationSec,
      playlists: this.playlists,
      likedSongs: this.likedSongs,
      playlistTracksMap: this.playlistTracksMap,
      searchResults: this.searchResults,
      isSearching: this.isSearching,
    };
  }

  public subscribe(listener: (state: YouTubePlayerStateSnapshot) => void) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snap = this.getSnapshot();
    this.updateDeviceMediaSession(snap);
    this.listeners.forEach((l) => l(snap));
  }

  /**
   * Links directly to the phone's / OS's native Play, Pause, Previous Track, Next Track, and Seek
   * media controls (Android notification shade, lock screen, Bluetooth earbuds, smartwatch).
   */
  private updateDeviceMediaSession(snap: YouTubePlayerStateSnapshot) {
    this.ensureSilentAudioSession(snap.isPlaying);
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      const song = snap.currentSong;
      if (song) {
        const artworkUrl =
          song.thumbnailUrl || `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`;
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.title,
          artist: song.artist,
          album: snap.currentQueueTitle || 'YouTube Music • ApexPulse',
          artwork: [
            { src: artworkUrl, sizes: '96x96', type: 'image/jpeg' },
            { src: artworkUrl, sizes: '192x192', type: 'image/jpeg' },
            { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
          ],
        });
      }

      navigator.mediaSession.playbackState = snap.isPlaying ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => {
        this.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.previous();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.next();
      });
      navigator.mediaSession.setActionHandler('seekto', (details: any) => {
        if (details && typeof details.seekTime === 'number') {
          this.seekTo(details.seekTime);
        }
      });

      if (
        'setPositionState' in navigator.mediaSession &&
        snap.durationSec > 0 &&
        snap.currentTimeSec >= 0 &&
        snap.currentTimeSec <= snap.durationSec
      ) {
        navigator.mediaSession.setPositionState({
          duration: snap.durationSec,
          playbackRate: 1,
          position: snap.currentTimeSec,
        });
      }
    } catch {}
  }

  private mediaKeysRegistered = false;
  private setupHardwareKeyboardMediaKeys() {
    if (this.mediaKeysRegistered || typeof window === 'undefined') return;
    this.mediaKeysRegistered = true;
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'MediaPlayPause') {
        e.preventDefault();
        this.togglePlay();
      } else if (e.key === 'MediaTrackNext') {
        e.preventDefault();
        this.next();
      } else if (e.key === 'MediaTrackPrevious') {
        e.preventDefault();
      }
    });
  }

  private ensureContainerAndApi(): Promise<void> {
    if (this.apiLoadingPromise) return this.apiLoadingPromise;

    this.apiLoadingPromise = new Promise((resolve) => {
      let host = document.getElementById('apex-ytm-persistent-host');
      if (!host) {
        host = document.createElement('div');
        host.id = 'apex-ytm-persistent-host';
        host.style.position = 'fixed';
        host.style.bottom = '0px';
        host.style.left = '0px';
        host.style.width = '1px';
        host.style.height = '1px';
        host.style.opacity = '0.01';
        host.style.pointerEvents = 'none';
        host.style.zIndex = '-1';
        const inner = document.createElement('div');
        inner.id = 'apex-ytm-yt-player';
        host.appendChild(inner);
        document.body.appendChild(host);
      }

      const mountPlayer = () => {
        const YT = (window as any).YT;
        if (!YT || !YT.Player) return;

        const initialSong = this.queue[this.queueIndex] || this.likedSongs[0];

        this.player = new YT.Player('apex-ytm-yt-player', {
          width: '200',
          height: '200',
          videoId: initialSong?.videoId || undefined,
          playerVars: {
            autoplay: 0,
            controls: 1,
            enablejsapi: 1,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              this.isReady = true;
              this.startProgressTicker();
              if (this.pendingPlayOnReady) {
                this.pendingPlayOnReady = false;
                this.loadCurrentQueueSong(true);
              }
              this.notify();
              resolve();
            },
            onStateChange: (event: any) => {
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
              const state = event?.data;
              if (state === 1) {
                this.isPlaying = true;
                this.refreshMetadataFromPlayer();
              } else if (state === 2) {
                this.isPlaying = false;
              } else if (state === 0) {
                this.next();
              }
              this.notify();
            },
            onError: () => {
              // Automatically advance if a specific video restricts embedded playback
              if (this.queue.length > 1) {
                setTimeout(() => this.next(), 350);
              }
            },
          },
        });
      };

      if ((window as any).YT && (window as any).YT.Player) {
        mountPlayer();
        return;
      }

      const prevReady = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (typeof prevReady === 'function') prevReady();
        mountPlayer();
      };

      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        document.head.appendChild(tag);
      }
    });

    return this.apiLoadingPromise;
  }

  private startProgressTicker() {
    if (this.progressInterval) clearInterval(this.progressInterval);
    this.progressInterval = setInterval(() => {
      if (!this.isReady || !this.player || !this.isPlaying) return;
      try {
        const cur =
          typeof this.player.getCurrentTime === 'function'
            ? Number(this.player.getCurrentTime()) || 0
            : 0;
        const dur =
          typeof this.player.getDuration === 'function'
            ? Number(this.player.getDuration()) || 0
            : 0;
        if (Math.abs(cur - this.currentTimeSec) >= 1 || Math.abs(dur - this.durationSec) >= 1) {
          this.currentTimeSec = cur;
          this.durationSec = dur;
          this.notify();
        }
      } catch {}
    }, 1000);
  }

  private refreshMetadataFromPlayer() {
    if (!this.player) return;
    try {
      const data =
        typeof this.player.getVideoData === 'function' ? this.player.getVideoData() : null;
      const dur =
        typeof this.player.getDuration === 'function' ? Number(this.player.getDuration()) || 0 : 0;
      this.durationSec = dur;

      if (data && data.video_id) {
        const current = this.queue[this.queueIndex];
        if (current && current.videoId === data.video_id && data.title) {
          current.title = String(data.title);
          if (data.author) {
            current.artist = String(data.author).replace(/ - Topic$/i, '');
          }
        }
      }
    } catch {}
  }

  private loadCurrentQueueSong(autoPlay: boolean) {
    const song = this.queue[this.queueIndex];
    if (!song) return;

    this.currentTimeSec = 0;
    this.durationSec = 0;
    this.saveQueueCache();

    if (!this.isReady || !this.player) {
      this.pendingPlayOnReady = autoPlay;
      this.isPlaying = autoPlay;
      this.ensureContainerAndApi();
      this.notify();
      return;
    }

    try {
      if (autoPlay && typeof this.player.loadVideoById === 'function') {
        this.player.loadVideoById(song.videoId);
        this.player.playVideo();
        this.isPlaying = true;
      } else if (typeof this.player.cueVideoById === 'function') {
        this.player.cueVideoById(song.videoId);
        this.isPlaying = false;
      }
    } catch {}
    this.notify();
  }

  // ============================================================================
  // TRANSPORT CONTROLS (PLAY, PAUSE, PREVIOUS, NEXT, SHUFFLE, SEEK)
  // ============================================================================

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public async play() {
    this.ensureContainerAndApi();
    if (this.queue.length === 0 && this.likedSongs.length > 0) {
      this.queue = [...this.likedSongs];
      this.queueIndex = 0;
      this.currentQueueTitle = 'My Liked Songs';
    }

    if (this.queue.length === 0) {
      await this.syncPersonalLibrary(true);
    }

    if (this.queue.length === 0) return;

    if (!this.isReady || !this.player) {
      this.pendingPlayOnReady = true;
      this.isPlaying = true;
      this.notify();
      return;
    }

    try {
      const state =
        typeof this.player.getPlayerState === 'function' ? this.player.getPlayerState() : -1;
      const loadedData =
        typeof this.player.getVideoData === 'function' ? this.player.getVideoData() : null;
      const targetSong = this.queue[this.queueIndex];

      if (
        state === -1 ||
        state === 5 ||
        !loadedData?.video_id ||
        (targetSong && loadedData.video_id !== targetSong.videoId)
      ) {
        this.loadCurrentQueueSong(true);
      } else {
        this.player.playVideo();
        this.isPlaying = true;
      }
    } catch {}
    this.notify();
  }

  public pause() {
    if (this.isReady && this.player && typeof this.player.pauseVideo === 'function') {
      try {
        this.player.pauseVideo();
      } catch {}
    }
    this.isPlaying = false;
    this.notify();
  }

  public next() {
    if (this.queue.length === 0 && this.likedSongs.length > 0) {
      this.queue = [...this.likedSongs];
    }
    if (this.queue.length === 0) return;

    if (this.isShuffle && this.queue.length > 1) {
      let nextIdx = Math.floor(Math.random() * this.queue.length);
      if (nextIdx === this.queueIndex) {
        nextIdx = (this.queueIndex + 1) % this.queue.length;
      }
      this.queueIndex = nextIdx;
    } else {
      this.queueIndex = (this.queueIndex + 1) % this.queue.length;
    }
    this.loadCurrentQueueSong(true);
  }

  public previous() {
    if (this.queue.length === 0 && this.likedSongs.length > 0) {
      this.queue = [...this.likedSongs];
    }
    if (this.queue.length === 0) return;

    if (this.currentTimeSec > 4 && this.isReady && this.player) {
      this.seekTo(0);
      return;
    }

    this.queueIndex = (this.queueIndex - 1 + this.queue.length) % this.queue.length;
    this.loadCurrentQueueSong(true);
  }

  public seekTo(seconds: number) {
    if (this.isReady && this.player && typeof this.player.seekTo === 'function') {
      try {
        this.player.seekTo(seconds, true);
        this.currentTimeSec = seconds;
      } catch {}
    }
    this.notify();
  }

  public toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    this.notify();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isReady && this.player) {
      try {
        if (this.isMuted && typeof this.player.mute === 'function') {
          this.player.mute();
        } else if (!this.isMuted && typeof this.player.unMute === 'function') {
          this.player.unMute();
        }
      } catch {}
    }
    this.notify();
  }

  public playSongFromQueue(index: number) {
    if (index < 0 || index >= this.queue.length) return;
    this.queueIndex = index;
    this.loadCurrentQueueSong(true);
  }

  public playCustomQueue(songs: YouTubeMusicSong[], startIndex: number, queueTitle: string) {
    if (!songs || songs.length === 0) return;
    this.queue = [...songs];
    this.queueIndex = Math.max(0, Math.min(startIndex, songs.length - 1));
    this.currentQueueTitle = queueTitle;
    this.loadCurrentQueueSong(true);
  }

  public toggleLikeSong(song: YouTubeMusicSong) {
    const exists = this.likedSongs.some((s) => s.videoId === song.videoId);
    if (exists) {
      this.likedSongs = this.likedSongs.filter((s) => s.videoId !== song.videoId);
    } else {
      this.likedSongs = [song, ...this.likedSongs];
    }
    this.saveLibraryCache();
    this.notify();
  }

  // ============================================================================
  // HYBRID PERSONAL LIBRARY + KEYLESS YOUTUBE MUSIC EXTRACTOR
  // Never fails even when YouTube Data API v3 is disabled in project 228152919931!
  // ============================================================================

  public async syncPersonalLibrary(silent = false): Promise<boolean> {
    this.isSyncingLibrary = true;
    this.libraryError = null;
    this.enableYouTubeApiUrl = null;
    this.notify();

    try {
      let token = getGoogleHealthAccessToken();
      if (!token && !silent) {
        try {
          token = await getOrRefreshGoogleHealthToken();
        } catch {}
      }

      let oauthSucceeded = false;

      // 1. Fetch ENTIRE Liked Songs playlist across all pages via OAuth YouTube Data API v3
      if (token) {
        try {
          const testRes = await fetch(
            'https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&mine=true',
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (testRes.ok) {
            const channelData: any = await testRes.json().catch(() => ({}));
            const likesPlaylistId =
              channelData?.items?.[0]?.contentDetails?.relatedPlaylists?.likes || 'LL';

            const loadedLikedSongs: YouTubeMusicSong[] = [];
            const seenVideoIds = new Set<string>();

            // 1A. Paginate through ALL pages of videos?myRating=like (50 per page, up to 1,000 songs)
            let likePageToken = '';
            for (let page = 0; page < 20; page++) {
              const pageUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&myRating=like&maxResults=50${
                likePageToken ? `&pageToken=${encodeURIComponent(likePageToken)}` : ''
              }`;
              const likedRes = await fetch(pageUrl, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!likedRes.ok) break;
              const likedData: any = await likedRes.json().catch(() => ({}));
              for (const item of likedData?.items || []) {
                const vid = String(item?.id || '');
                if (!vid || seenVideoIds.has(vid)) continue;
                seenVideoIds.add(vid);
                const rawArtist = String(item?.snippet?.channelTitle || 'YouTube Music');
                loadedLikedSongs.push({
                  id: `liked-${vid}`,
                  videoId: vid,
                  title: String(item?.snippet?.title || 'Liked Song'),
                  artist: rawArtist.replace(/ - Topic$/i, ''),
                  thumbnailUrl:
                    item?.snippet?.thumbnails?.medium?.url ||
                    item?.snippet?.thumbnails?.default?.url,
                  playlistId: likesPlaylistId,
                  playlistTitle: 'Liked Music',
                });
              }
              if (!likedData?.nextPageToken) break;
              likePageToken = String(likedData.nextPageToken);
            }

            // 1B. Also paginate through ALL pages of the user's Likes Playlist (LL / likesPlaylistId)
            let llPageToken = '';
            for (let page = 0; page < 20; page++) {
              const llUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(
                likesPlaylistId
              )}&maxResults=50${
                llPageToken ? `&pageToken=${encodeURIComponent(llPageToken)}` : ''
              }`;
              const llRes = await fetch(llUrl, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!llRes.ok) break;
              const llData: any = await llRes.json().catch(() => ({}));
              for (const item of llData?.items || []) {
                const vid = String(
                  item?.contentDetails?.videoId || item?.snippet?.resourceId?.videoId || ''
                );
                const title = String(item?.snippet?.title || '');
                if (
                  !vid ||
                  seenVideoIds.has(vid) ||
                  title === 'Private video' ||
                  title === 'Deleted video'
                ) {
                  continue;
                }
                seenVideoIds.add(vid);
                const rawOwner = String(
                  item?.snippet?.videoOwnerChannelTitle ||
                    item?.snippet?.channelTitle ||
                    'YouTube Music'
                );
                loadedLikedSongs.push({
                  id: `liked-${vid}`,
                  videoId: vid,
                  title,
                  artist: rawOwner.replace(/ - Topic$/i, ''),
                  thumbnailUrl:
                    item?.snippet?.thumbnails?.medium?.url ||
                    item?.snippet?.thumbnails?.default?.url,
                  playlistId: likesPlaylistId,
                  playlistTitle: 'Liked Music',
                });
              }
              if (!llData?.nextPageToken) break;
              llPageToken = String(llData.nextPageToken);
            }

            if (loadedLikedSongs.length > 0) {
              // Preserve any custom songs liked locally inside the app
              const customLiked = this.likedSongs.filter(
                (s) => s.id.startsWith('custom-') && !seenVideoIds.has(s.videoId)
              );
              this.likedSongs = [...customLiked, ...loadedLikedSongs];
              this.playlistTracksMap[likesPlaylistId] = this.likedSongs;
              this.playlistTracksMap['LM'] = this.likedSongs;
              if (this.currentQueueTitle === 'My Liked Songs' || this.currentQueueTitle === 'Liked Music') {
                this.queue = [...this.likedSongs];
              }
            }

            // 1C. Paginate through all user playlists
            const loadedPlaylists: YouTubeMusicPlaylistSummary[] = [];
            let plPageToken = '';
            for (let page = 0; page < 5; page++) {
              const plRes = await fetch(
                `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50${
                  plPageToken ? `&pageToken=${encodeURIComponent(plPageToken)}` : ''
                }`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              if (!plRes.ok) break;
              const plData: any = await plRes.json().catch(() => ({}));
              for (const pl of plData?.items || []) {
                if (!pl?.id) continue;
                loadedPlaylists.push({
                  id: `pl-${pl.id}`,
                  playlistId: String(pl.id),
                  title: String(pl?.snippet?.title || 'Personal Playlist'),
                  description: String(pl?.snippet?.description || ''),
                  itemCount: Number(pl?.contentDetails?.itemCount) || 0,
                  thumbnailUrl:
                    pl?.snippet?.thumbnails?.medium?.url ||
                    pl?.snippet?.thumbnails?.default?.url,
                });
              }
              if (!plData?.nextPageToken) break;
              plPageToken = String(plData.nextPageToken);
            }

            if (loadedPlaylists.length > 0) {
              const existingCustom = this.playlists.filter((p) => p.isCustom);
              this.playlists = [
                ...loadedPlaylists,
                ...existingCustom.filter(
                  (c) => !loadedPlaylists.some((lp) => lp.playlistId === c.playlistId)
                ),
              ];
            }
            oauthSucceeded = true;
          } else {
            const errJson: any = await testRes.json().catch(() => ({}));
            const rawMsg = String(errJson?.error?.message || '');
            if (rawMsg.includes('youtube.googleapis.com') || rawMsg.includes('228152919931')) {
              this.enableYouTubeApiUrl =
                'https://console.developers.google.com/apis/api/youtube.googleapis.com/overview?project=228152919931';
            }
          }
        } catch {}
      }

      // 2. Keyless Full Playlist Fallback: Load the full multi-batch starter catalog (70-100+ songs)
      // if OAuth isn't connected yet or if the user has fewer than 30 songs in their starter cache
      if (!oauthSucceeded || this.likedSongs.length < 25) {
        const starterRes = await fetch('/api/ytmusic/starter-liked');
        if (starterRes.ok) {
          const sData: any = await starterRes.json().catch(() => ({}));
          const fetchedTracks: YouTubeMusicSong[] = Array.isArray(sData?.tracks)
            ? sData.tracks
            : [];
          if (fetchedTracks.length > 0) {
            const existingIds = new Set(this.likedSongs.map((s) => s.videoId));
            const merged = [
              ...this.likedSongs,
              ...fetchedTracks.filter((t) => !existingIds.has(t.videoId)),
            ];
            this.likedSongs = merged;
            if (this.searchResults.length === 0) {
              this.searchResults = fetchedTracks.slice(0, 30);
            }
            if (this.queue.length < 25) {
              this.queue = [...this.likedSongs];
              this.queueIndex = Math.min(this.queueIndex, Math.max(0, this.queue.length - 1));
              this.currentQueueTitle = 'Liked Music';
            }
          }
        }
      }

      this.libraryConnected = true;
      this.saveLibraryCache();
      this.saveQueueCache();
      this.notify();
      return true;
    } catch {
      this.notify();
      return false;
    } finally {
      this.isSyncingLibrary = false;
      this.notify();
    }
  }

  public async fetchPlaylistTracks(
    playlistId: string,
    playlistTitle = 'Playlist',
    overrideToken?: string | null
  ): Promise<YouTubeMusicSong[]> {
    if (this.playlistTracksMap[playlistId] && this.playlistTracksMap[playlistId].length > 0) {
      return this.playlistTracksMap[playlistId];
    }

    // 1. First try keyless server-side playlist extractor (/api/ytmusic/playlist) — works without YouTube Data API v3!
    try {
      const serverRes = await fetch(
        `/api/ytmusic/playlist?list=${encodeURIComponent(playlistId)}`
      );
      if (serverRes.ok) {
        const sData: any = await serverRes.json().catch(() => ({}));
        const tracks: YouTubeMusicSong[] = Array.isArray(sData?.tracks) ? sData.tracks : [];
        if (tracks.length > 0) {
          this.playlistTracksMap = {
            ...this.playlistTracksMap,
            [playlistId]: tracks,
          };
          if (sData.title && sData.title !== 'YouTube Music Playlist') {
            this.playlists = this.playlists.map((p) =>
              p.playlistId === playlistId
                ? {
                    ...p,
                    title: sData.title,
                    itemCount: tracks.length,
                    thumbnailUrl: tracks[0]?.thumbnailUrl,
                  }
                : p
            );
          }
          this.saveLibraryCache();
          this.notify();
          return tracks;
        }
      }
    } catch {}

    // 2. Fallback to OAuth YouTube Data API v3 across ALL pages via nextPageToken
    try {
      const token = overrideToken || getGoogleHealthAccessToken();
      if (!token) return [];

      const tracks: YouTubeMusicSong[] = [];
      const seen = new Set<string>();
      let pageToken = '';

      for (let page = 0; page < 15; page++) {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(
            playlistId
          )}&maxResults=50${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) break;
        const data: any = await res.json().catch(() => ({}));

        for (const item of data?.items || []) {
          const videoId =
            item?.contentDetails?.videoId || item?.snippet?.resourceId?.videoId;
          const title = String(item?.snippet?.title || '');
          if (
            !videoId ||
            seen.has(String(videoId)) ||
            title === 'Private video' ||
            title === 'Deleted video'
          ) {
            continue;
          }
          seen.add(String(videoId));
          const rawOwner = String(
            item?.snippet?.videoOwnerChannelTitle ||
              item?.snippet?.channelTitle ||
              'YouTube Music'
          );
          tracks.push({
            id: `plit-${playlistId}-${videoId}-${tracks.length}`,
            videoId: String(videoId),
            title,
            artist: rawOwner.replace(/ - Topic$/i, ''),
            thumbnailUrl:
              item?.snippet?.thumbnails?.medium?.url ||
              item?.snippet?.thumbnails?.default?.url,
            playlistId,
            playlistTitle,
          });
        }

        if (!data?.nextPageToken) break;
        pageToken = String(data.nextPageToken);
      }

      if (tracks.length > 0) {
        this.playlistTracksMap = {
          ...this.playlistTracksMap,
          [playlistId]: tracks,
        };
        this.saveLibraryCache();
        this.notify();
      }
      return tracks;
    } catch {
      return [];
    }
  }

  public async playPlaylistById(playlistId: string, playlistTitle: string) {
    const tracks = await this.fetchPlaylistTracks(playlistId, playlistTitle);
    if (tracks.length > 0) {
      this.playCustomQueue(tracks, 0, playlistTitle);
    }
  }

  /**
   * Keyless YouTube Music Search: Uses our backend `/api/ytmusic/search` endpoint first so
   * searching and playing ANY song works 100% without YouTube Data API v3 enabled!
   */
  public async searchYouTubeMusicCatalog(query: string): Promise<YouTubeMusicSong[]> {
    const q = query.trim();
    if (!q) return [];
    this.isSearching = true;
    this.libraryError = null;
    this.notify();

    try {
      const serverRes = await fetch(`/api/ytmusic/search?q=${encodeURIComponent(q)}`);
      if (serverRes.ok) {
        const data: any = await serverRes.json().catch(() => ({}));
        const results: YouTubeMusicSong[] = Array.isArray(data?.tracks) ? data.tracks : [];
        if (results.length > 0) {
          this.searchResults = results;
          this.notify();
          return results;
        }
      }

      // Fallback to OAuth if server search returned empty
      const token = getGoogleHealthAccessToken();
      if (token) {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=20&q=${encodeURIComponent(
            q
          )}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.ok) {
          const data: any = await res.json().catch(() => ({}));
          const results: YouTubeMusicSong[] = [];
          for (const item of data?.items || []) {
            const vid = item?.id?.videoId;
            if (!vid) continue;
            const rawArtist = String(item?.snippet?.channelTitle || 'YouTube Music');
            results.push({
              id: `search-${vid}`,
              videoId: String(vid),
              title: String(item?.snippet?.title || 'Song'),
              artist: rawArtist.replace(/ - Topic$/i, ''),
              thumbnailUrl:
                item?.snippet?.thumbnails?.medium?.url ||
                item?.snippet?.thumbnails?.default?.url,
              playlistTitle: `Search: ${q}`,
            });
          }
          this.searchResults = results;
          this.notify();
          return results;
        }
      }

      return [];
    } catch (err: any) {
      this.libraryError = err?.message || 'Search failed.';
      this.notify();
      return [];
    } finally {
      this.isSearching = false;
      this.notify();
    }
  }

  public async addCustomLinkOrPlaylist(
    customTitle: string,
    rawInput: string
  ): Promise<{ ok: boolean; error?: string }> {
    const parsed = parseYouTubeMusicInput(rawInput);
    if (!parsed) {
      return {
        ok: false,
        error:
          'Paste a valid YouTube Music song or playlist link (e.g. https://music.youtube.com/playlist?list=... or watch?v=...).',
      };
    }

    if (parsed.playlistId) {
      const cleanTitle = customTitle.trim() || 'My YouTube Music Playlist';
      const tracks = await this.fetchPlaylistTracks(parsed.playlistId, cleanTitle);
      if (tracks.length === 0 && !parsed.videoId) {
        return {
          ok: false,
          error:
            'Make sure your YouTube Music playlist privacy is set to Unlisted or Public when sharing its link so its songs can be loaded.',
        };
      }
      const discoveredTitle = tracks[0]?.playlistTitle || cleanTitle;
      const summary: YouTubeMusicPlaylistSummary = {
        id: `custom-pl-${parsed.playlistId}`,
        playlistId: parsed.playlistId,
        title: customTitle.trim() || discoveredTitle,
        itemCount: tracks.length,
        thumbnailUrl: tracks[0]?.thumbnailUrl,
        isCustom: true,
      };
      this.playlists = [
        summary,
        ...this.playlists.filter((p) => p.playlistId !== parsed.playlistId),
      ];
      this.saveLibraryCache();
      if (tracks.length > 0) {
        this.playCustomQueue(tracks, 0, summary.title);
      }
      this.notify();
      return { ok: true };
    }

    if (parsed.videoId) {
      const song: YouTubeMusicSong = {
        id: `custom-song-${parsed.videoId}`,
        videoId: parsed.videoId,
        title: customTitle.trim() || 'Saved YouTube Music Track',
        artist: 'My YouTube Music',
        thumbnailUrl: `https://i.ytimg.com/vi/${parsed.videoId}/mqdefault.jpg`,
      };
      this.likedSongs = [
        song,
        ...this.likedSongs.filter((s) => s.videoId !== parsed.videoId),
      ];
      this.saveLibraryCache();
      this.playCustomQueue(this.likedSongs, 0, 'My Liked Songs');
      return { ok: true };
    }

    return { ok: false, error: 'Could not parse link.' };
  }
}

export const youtubeMusicEngine = new YouTubeMusicEngine();
