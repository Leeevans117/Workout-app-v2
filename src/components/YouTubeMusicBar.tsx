import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Music,
  Heart,
  Shuffle,
  Volume2,
  VolumeX,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronLeft,
  ListMusic,
  Link2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import {
  youtubeMusicEngine,
  YouTubePlayerStateSnapshot,
  YouTubeMusicPlaylistSummary,
} from '../utils/youtubeMusicEngine';

function formatSec(sec: number): string {
  if (!sec || isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const YouTubeMusicBar: React.FC = () => {
  const [snap, setSnap] = useState<YouTubePlayerStateSnapshot>(() =>
    youtubeMusicEngine.getSnapshot()
  );
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [activeView, setActiveView] = useState<'now-playing' | 'liked' | 'playlists' | 'search'>(
    'now-playing'
  );
  const [openedPlaylist, setOpenedPlaylist] =
    useState<YouTubeMusicPlaylistSummary | null>(null);
  const [loadingPlaylistId, setLoadingPlaylistId] = useState<string | null>(null);

  // Filter for Liked Songs & Search for Catalog
  const [likedFilter, setLikedFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showImportDrawer, setShowImportDrawer] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  useEffect(() => {
    youtubeMusicEngine.init();
    const unsub = youtubeMusicEngine.subscribe((nextSnap) => {
      setSnap(nextSnap);
    });
    return () => unsub();
  }, []);

  const showTempStatus = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 2600);
  };

  const handleOpenPlaylist = async (pl: YouTubeMusicPlaylistSummary) => {
    setOpenedPlaylist(pl);
    setLoadingPlaylistId(pl.playlistId);
    await youtubeMusicEngine.fetchPlaylistTracks(pl.playlistId, pl.title);
    setLoadingPlaylistId(null);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    await youtubeMusicEngine.searchYouTubeMusicCatalog(searchInput);
  };

  const handleAddLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const res = await youtubeMusicEngine.addCustomLinkOrPlaylist(titleInput, urlInput);
    if (!res.ok) {
      setFormError(res.error || 'Could not load playlist link.');
      return;
    }
    setTitleInput('');
    setUrlInput('');
    setShowImportDrawer(false);
    setActiveView('now-playing');
    showTempStatus('Playlist loaded into YouTube Music');
  };

  const currentSong = snap.currentSong;
  const isCurrentLiked = Boolean(
    currentSong && snap.likedSongs.some((s) => s.videoId === currentSong.videoId)
  );
  const progressPct =
    snap.durationSec > 0
      ? Math.min(100, Math.max(0, (snap.currentTimeSec / snap.durationSec) * 100))
      : 0;

  const filteredLikedSongs = useMemo(() => {
    const q = likedFilter.trim().toLowerCase();
    if (!q) return snap.likedSongs;
    return snap.likedSongs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q)
    );
  }, [snap.likedSongs, likedFilter]);

  return (
    <div className="w-full relative">
      {/* =====================================================================
       * NATIVE YOUTUBE MUSIC MINI-PLAYER BAR
       * Clean dark surface, album artwork, title/artist, Like, Play/Pause, Next,
       * and bottom red progress indicator bar — just like the YouTube Music app
       * ===================================================================== */}
      <div className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2 shadow-xl relative overflow-hidden">
        {/* Left: Artwork + Title + Artist (Tap anywhere to expand full YouTube Music sheet) */}
        <button
          type="button"
          onClick={() => setIsPlayerOpen(true)}
          className="flex items-center gap-3 min-w-0 flex-1 text-left group"
          title="Open YouTube Music Player"
        >
          <div className="w-11 h-11 rounded-md bg-zinc-800 overflow-hidden shrink-0 relative flex items-center justify-center border border-white/10">
            {currentSong?.thumbnailUrl ? (
              <img
                src={currentSong.thumbnailUrl}
                alt={currentSong.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <Music className="w-5 h-5 text-[#FF0033]" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate group-hover:text-zinc-200 transition-colors">
              {currentSong
                ? currentSong.title
                : snap.isSyncingLibrary
                ? 'Loading Liked Music...'
                : 'Liked Music'}
            </p>
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              {currentSong
                ? `${currentSong.artist} · ${snap.currentQueueTitle}`
                : `${snap.likedSongs.length} liked songs · Tap to open player`}
            </p>
          </div>
        </button>

        {/* Right: Native YouTube Music Mini-Player Controls (Like, Play/Pause, Next, Liked Playlist) */}
        <div className="flex items-center gap-0.5 shrink-0">
          {currentSong && (
            <button
              type="button"
              onClick={() => youtubeMusicEngine.toggleLikeSong(currentSong)}
              className={`min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-colors ${
                isCurrentLiked
                  ? 'text-[#FF0033]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title={isCurrentLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
            >
              <Heart className={`w-5 h-5 ${isCurrentLiked ? 'fill-current' : ''}`} />
            </button>
          )}

          <button
            type="button"
            onClick={() => youtubeMusicEngine.togglePlay()}
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors active:scale-95"
            title={snap.isPlaying ? 'Pause' : 'Play'}
          >
            {snap.isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => youtubeMusicEngine.next()}
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition-colors active:scale-95"
            title="Next Track"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView('liked');
              setIsPlayerOpen(true);
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white transition-colors ml-1 whitespace-nowrap"
            title="Open Full Liked Songs Playlist"
          >
            <Heart className="w-3.5 h-3.5 text-[#FF0033] fill-current" />
            <span>Liked ({snap.likedSongs.length})</span>
          </button>
        </div>

        {/* Bottom Thin Red Progress Line (Exact YouTube Music Mini-Player Signature) */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 pointer-events-none">
          <div
            className="h-full bg-[#FF0033] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* =====================================================================
       * FULL YOUTUBE MUSIC APP PLAYER SHEET
       * ===================================================================== */}
      {isPlayerOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-[#09090B] sm:border sm:border-white/10 rounded-t-3xl sm:rounded-3xl max-w-lg w-full h-[94vh] sm:h-[88vh] flex flex-col overflow-hidden shadow-2xl text-left">
            {/* Top Navigation Bar (Minimize + Segmented Switcher + Sync Liked) */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setIsPlayerOpen(false)}
                className="min-w-[44px] min-h-[44px] -ml-2 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Minimize Player"
              >
                <ChevronDown className="w-6 h-6" />
              </button>

              {/* Center Segmented Control (Song | Liked Songs | Playlists | Search) */}
              <div className="flex items-center bg-zinc-900 p-1 rounded-full border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveView('now-playing')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                    activeView === 'now-playing'
                      ? 'bg-zinc-800 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Song
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('liked')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap ${
                    activeView === 'liked'
                      ? 'bg-zinc-800 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Heart className="w-3 h-3 text-[#FF0033] fill-current" />
                  <span>Liked ({snap.likedSongs.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenedPlaylist(null);
                    setActiveView('playlists');
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                    activeView === 'playlists'
                      ? 'bg-zinc-800 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Playlists
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('search')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                    activeView === 'search'
                      ? 'bg-zinc-800 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Search
                </button>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await youtubeMusicEngine.syncPersonalLibrary(false);
                  showTempStatus('Synced your Liked Songs playlist');
                }}
                disabled={snap.isSyncingLibrary}
                className="min-w-[44px] min-h-[44px] -mr-2 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                title="Sync all Liked Songs from your Google / YouTube account"
              >
                <RefreshCw
                  className={`w-4 h-4 ${snap.isSyncingLibrary ? 'animate-spin text-[#FF0033]' : ''}`}
                />
              </button>
            </div>

            {statusToast && (
              <div className="mx-4 mt-2 px-3 py-2 rounded-xl bg-zinc-900 border border-white/15 text-xs text-zinc-200 flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{statusToast}</span>
              </div>
            )}

            {/* =================================================================
             * VIEW 1: NOW PLAYING (AUTHENTIC YOUTUBE MUSIC PLAYER LAYOUT)
             * ================================================================= */}
            {activeView === 'now-playing' && (
              <div className="flex-1 min-h-0 flex flex-col justify-between overflow-y-auto px-5 py-4 space-y-4">
                {/* Large Square Album Art */}
                <div className="w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden shrink-0 flex items-center justify-center">
                  {currentSong?.thumbnailUrl ? (
                    <img
                      src={currentSong.thumbnailUrl}
                      alt={currentSong.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="w-14 h-14 text-zinc-600" />
                  )}
                </div>

                {/* Song Title, Artist & Like Button */}
                <div className="flex items-center justify-between gap-3 shrink-0">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                      {currentSong ? currentSong.title : 'Select a Song'}
                    </h2>
                    <p className="text-sm text-zinc-400 truncate mt-0.5">
                      {currentSong ? currentSong.artist : 'YouTube Music'}
                    </p>
                  </div>

                  {currentSong && (
                    <button
                      type="button"
                      onClick={() => youtubeMusicEngine.toggleLikeSong(currentSong)}
                      className={`min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-colors shrink-0 ${
                        isCurrentLiked
                          ? 'text-[#FF0033] bg-[#FF0033]/15'
                          : 'text-zinc-400 hover:text-white bg-zinc-900'
                      }`}
                      title={isCurrentLiked ? 'Liked' : 'Add to Liked Songs'}
                    >
                      <Heart className={`w-5 h-5 ${isCurrentLiked ? 'fill-current' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Progress Scrubber Bar */}
                <div className="space-y-1.5 shrink-0">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(1, Math.floor(snap.durationSec || 100))}
                    value={Math.min(
                      Math.floor(snap.currentTimeSec),
                      Math.max(1, Math.floor(snap.durationSec || 100))
                    )}
                    onChange={(e) => youtubeMusicEngine.seekTo(Number(e.target.value))}
                    className="w-full accent-[#FF0033] h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-zinc-400">
                    <span>{formatSec(snap.currentTimeSec)}</span>
                    <span>{formatSec(snap.durationSec)}</span>
                  </div>
                </div>

                {/* 5-Button YouTube Music Transport Row */}
                <div className="flex items-center justify-between px-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => youtubeMusicEngine.toggleShuffle()}
                    className={`min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-colors ${
                      snap.isShuffle ? 'text-white bg-white/15' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Shuffle"
                  >
                    <Shuffle className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => youtubeMusicEngine.previous()}
                    className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors active:scale-95"
                    title="Previous"
                  >
                    <SkipBack className="w-6 h-6 fill-current" />
                  </button>

                  <button
                    type="button"
                    onClick={() => youtubeMusicEngine.togglePlay()}
                    className="w-16 h-16 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center shadow-xl transition-transform active:scale-95"
                    title={snap.isPlaying ? 'Pause' : 'Play'}
                  >
                    {snap.isPlaying ? (
                      <Pause className="w-7 h-7 fill-current" />
                    ) : (
                      <Play className="w-7 h-7 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => youtubeMusicEngine.next()}
                    className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors active:scale-95"
                    title="Next"
                  >
                    <SkipForward className="w-6 h-6 fill-current" />
                  </button>

                  <button
                    type="button"
                    onClick={() => youtubeMusicEngine.toggleMute()}
                    className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    title={snap.isMuted ? 'Unmute' : 'Mute'}
                  >
                    {snap.isMuted ? (
                      <VolumeX className="w-5 h-5 text-[#FF0033]" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Bottom Up Next / Liked Songs Queue Sheet */}
                <div className="pt-3 border-t border-white/10 flex-1 min-h-[140px] flex flex-col">
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <span className="text-xs font-semibold text-zinc-400">
                      Up Next · {snap.currentQueueTitle} ({snap.queue.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveView('liked')}
                      className="text-xs font-semibold text-[#FF0033] hover:underline"
                    >
                      Open Full Liked Playlist ({snap.likedSongs.length})
                    </button>
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-44 pr-1">
                    {snap.queue.map((song, idx) => {
                      const isCurrent = idx === snap.queueIndex;
                      return (
                        <button
                          key={`${song.id}-${idx}`}
                          type="button"
                          onClick={() => youtubeMusicEngine.playSongFromQueue(idx)}
                          className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-3 text-left transition-colors ${
                            isCurrent
                              ? 'bg-white/10 text-white'
                              : 'hover:bg-white/5 text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-md bg-zinc-800 overflow-hidden shrink-0">
                              {song.thumbnailUrl && (
                                <img
                                  src={song.thumbnailUrl}
                                  alt={song.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-xs font-semibold truncate ${
                                  isCurrent ? 'text-[#FF0033]' : 'text-white'
                                }`}
                              >
                                {song.title}
                              </p>
                              <p className="text-[11px] text-zinc-400 truncate">{song.artist}</p>
                            </div>
                          </div>
                          {isCurrent && snap.isPlaying && (
                            <span className="text-[11px] font-semibold text-[#FF0033] shrink-0">
                              Playing
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================
             * VIEW 2: FULL LIKED SONGS PLAYLIST (ALL LIKED SONGS)
             * ================================================================= */}
            {activeView === 'liked' && (
              <div className="flex-1 min-h-0 flex flex-col px-4 py-3 space-y-3">
                {/* Liked Music Header Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-black border border-white/10 space-y-3 shrink-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#FF0033]/20 border border-[#FF0033]/40 flex items-center justify-center text-[#FF0033] shrink-0">
                        <Heart className="w-6 h-6 fill-current" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Liked Music</h3>
                        <p className="text-xs text-zinc-400">
                          Auto playlist · {snap.likedSongs.length} songs
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!snap.isShuffle) youtubeMusicEngine.toggleShuffle();
                          const randomStart = Math.floor(
                            Math.random() * Math.max(1, snap.likedSongs.length)
                          );
                          youtubeMusicEngine.playCustomQueue(
                            snap.likedSongs,
                            randomStart,
                            'Liked Music'
                          );
                          setActiveView('now-playing');
                        }}
                        className="px-3.5 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>Shuffle</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          youtubeMusicEngine.playCustomQueue(
                            snap.likedSongs,
                            0,
                            'Liked Music'
                          );
                          setActiveView('now-playing');
                        }}
                        className="px-4 py-2 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play All</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter within Liked Songs + Sync Google Account Button */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={likedFilter}
                        onChange={(e) => setLikedFilter(e.target.value)}
                        placeholder={`Filter ${snap.likedSongs.length} liked songs...`}
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-black border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await youtubeMusicEngine.syncPersonalLibrary(false);
                        showTempStatus('Synced all Liked Songs from Google');
                      }}
                      disabled={snap.isSyncingLibrary}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${snap.isSyncingLibrary ? 'animate-spin' : ''}`}
                      />
                      <span>{snap.isSyncingLibrary ? 'Syncing...' : 'Sync Account'}</span>
                    </button>
                  </div>

                  {snap.enableYouTubeApiUrl && (
                    <div className="pt-1 flex items-center justify-between gap-2 text-[11px] text-amber-300">
                      <span>Enable YouTube Data API v3 once to import private account likes:</span>
                      <a
                        href={snap.enableYouTubeApiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-semibold flex items-center gap-1 shrink-0"
                      >
                        <span>Enable</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Full Scrollable Liked Songs List (No truncation — whole playlist!) */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
                  {filteredLikedSongs.map((song) => {
                    const fullIndex = snap.likedSongs.findIndex(
                      (s) => s.videoId === song.videoId
                    );
                    const isPlayingThis = currentSong?.videoId === song.videoId;
                    return (
                      <div
                        key={song.id}
                        onClick={() => {
                          youtubeMusicEngine.playCustomQueue(
                            snap.likedSongs,
                            fullIndex >= 0 ? fullIndex : 0,
                            'Liked Music'
                          );
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            youtubeMusicEngine.playCustomQueue(
                              snap.likedSongs,
                              fullIndex >= 0 ? fullIndex : 0,
                              'Liked Music'
                            );
                          }
                        }}
                        className={`px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isPlayingThis
                            ? 'bg-white/10 text-white'
                            : 'hover:bg-white/5 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-11 h-11 rounded-md bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                            {song.thumbnailUrl ? (
                              <img
                                src={song.thumbnailUrl}
                                alt={song.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Music className="w-4 h-4 text-zinc-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-semibold truncate ${
                                isPlayingThis ? 'text-[#FF0033]' : 'text-white'
                              }`}
                            >
                              {song.title}
                            </p>
                            <p className="text-xs text-zinc-400 truncate mt-0.5">
                              {song.artist}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            youtubeMusicEngine.toggleLikeSong(song);
                          }}
                          className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-[#FF0033] hover:bg-white/10 shrink-0"
                          title="Remove from Liked Songs"
                        >
                          <Heart className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* =================================================================
             * VIEW 3: PLAYLISTS & LINK IMPORT
             * ================================================================= */}
            {activeView === 'playlists' && (
              <div className="flex-1 min-h-0 flex flex-col px-4 py-3 space-y-3 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Your Playlists</h3>
                  <button
                    type="button"
                    onClick={() => setShowImportDrawer((prev) => !prev)}
                    className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white flex items-center gap-1.5"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>{showImportDrawer ? 'Close Import' : 'Import Playlist URL'}</span>
                  </button>
                </div>

                {showImportDrawer && (
                  <form
                    onSubmit={handleAddLinkSubmit}
                    className="p-3.5 rounded-2xl bg-zinc-900 border border-white/10 space-y-2.5"
                  >
                    <p className="text-xs text-zinc-300">
                      Paste any YouTube Music playlist or song URL (`music.youtube.com/playlist?list=...`) to load all tracks:
                    </p>
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://music.youtube.com/playlist?list=..."
                      className="w-full px-3 py-2 rounded-xl bg-black border border-white/10 text-xs text-white placeholder:text-zinc-500"
                    />
                    <input
                      type="text"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      placeholder="Optional custom title"
                      className="w-full px-3 py-2 rounded-xl bg-black border border-white/10 text-xs text-white placeholder:text-zinc-500"
                    />
                    {formError && <p className="text-xs text-rose-400">{formError}</p>}
                    <button
                      type="submit"
                      className="w-full py-2 rounded-xl bg-white text-black font-bold text-xs"
                    >
                      Load Full Playlist
                    </button>
                  </form>
                )}

                {openedPlaylist ? (
                  <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <button
                        type="button"
                        onClick={() => setOpenedPlaylist(null)}
                        className="text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>All Playlists</span>
                      </button>
                      <span className="text-xs font-bold text-white truncate px-2">
                        {openedPlaylist.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          youtubeMusicEngine.playPlaylistById(
                            openedPlaylist.playlistId,
                            openedPlaylist.title
                          );
                          setActiveView('now-playing');
                        }}
                        className="px-3 py-1.5 rounded-full bg-white text-black text-xs font-bold flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Play All</span>
                      </button>
                    </div>

                    {loadingPlaylistId === openedPlaylist.playlistId ? (
                      <div className="p-8 text-center text-xs text-zinc-400">
                        Loading full playlist...
                      </div>
                    ) : (
                      <div className="space-y-1 overflow-y-auto flex-1">
                        {(snap.playlistTracksMap[openedPlaylist.playlistId] || []).map(
                          (song, idx) => {
                            const tracks =
                              snap.playlistTracksMap[openedPlaylist.playlistId] || [];
                            const isPlayingThis = currentSong?.videoId === song.videoId;
                            return (
                              <button
                                key={song.id}
                                type="button"
                                onClick={() => {
                                  youtubeMusicEngine.playCustomQueue(
                                    tracks,
                                    idx,
                                    openedPlaylist.title
                                  );
                                  setActiveView('now-playing');
                                }}
                                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between gap-3 text-left ${
                                  isPlayingThis
                                    ? 'bg-white/10 text-white'
                                    : 'hover:bg-white/5 text-zinc-300'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="w-10 h-10 rounded-md bg-zinc-800 overflow-hidden shrink-0">
                                    {song.thumbnailUrl && (
                                      <img
                                        src={song.thumbnailUrl}
                                        alt={song.title}
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-white truncate">
                                      {song.title}
                                    </p>
                                    <p className="text-[11px] text-zinc-400 truncate">
                                      {song.artist}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Always show Liked Music as the #1 pinned playlist */}
                    <div
                      onClick={() => setActiveView('liked')}
                      role="button"
                      tabIndex={0}
                      className="p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800/80 border border-white/10 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-[#FF0033]/20 flex items-center justify-center text-[#FF0033] shrink-0">
                          <Heart className="w-6 h-6 fill-current" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">Liked Music</p>
                          <p className="text-xs text-zinc-400">
                            {snap.likedSongs.length} songs · Auto playlist
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          youtubeMusicEngine.playCustomQueue(
                            snap.likedSongs,
                            0,
                            'Liked Music'
                          );
                          setActiveView('now-playing');
                        }}
                        className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shrink-0"
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </button>
                    </div>

                    {snap.playlists.map((pl) => (
                      <div
                        key={pl.id}
                        onClick={() => handleOpenPlaylist(pl)}
                        role="button"
                        tabIndex={0}
                        className="p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800/80 border border-white/10 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                            {pl.thumbnailUrl ? (
                              <img
                                src={pl.thumbnailUrl}
                                alt={pl.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ListMusic className="w-5 h-5 text-zinc-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate">{pl.title}</p>
                            <p className="text-xs text-zinc-400">{pl.itemCount} songs</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            youtubeMusicEngine.playPlaylistById(pl.playlistId, pl.title);
                            setActiveView('now-playing');
                          }}
                          className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shrink-0"
                        >
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* =================================================================
             * VIEW 4: YOUTUBE MUSIC SEARCH
             * ================================================================= */}
            {activeView === 'search' && (
              <div className="flex-1 min-h-0 flex flex-col px-4 py-3 space-y-3">
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 shrink-0">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search songs, artists, or albums..."
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-full bg-zinc-900 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={snap.isSearching}
                    className="px-4 py-2.5 rounded-full bg-white text-black font-bold text-xs shrink-0"
                  >
                    {snap.isSearching ? '...' : 'Search'}
                  </button>
                </form>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
                  {snap.searchResults.map((song, idx) => {
                    const isPlayingThis = currentSong?.videoId === song.videoId;
                    const isLiked = snap.likedSongs.some((s) => s.videoId === song.videoId);
                    return (
                      <div
                        key={song.id}
                        onClick={() => {
                          youtubeMusicEngine.playCustomQueue(
                            snap.searchResults,
                            idx,
                            searchInput ? `Search: ${searchInput}` : 'YouTube Music Search'
                          );
                          setActiveView('now-playing');
                        }}
                        role="button"
                        tabIndex={0}
                        className={`px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isPlayingThis
                            ? 'bg-white/10 text-white'
                            : 'hover:bg-white/5 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-11 h-11 rounded-md bg-zinc-800 overflow-hidden shrink-0">
                            {song.thumbnailUrl && (
                              <img
                                src={song.thumbnailUrl}
                                alt={song.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate">
                              {song.title}
                            </p>
                            <p className="text-xs text-zinc-400 truncate mt-0.5">{song.artist}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            youtubeMusicEngine.toggleLikeSong(song);
                          }}
                          className={`min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center shrink-0 ${
                            isLiked ? 'text-[#FF0033]' : 'text-zinc-500 hover:text-white'
                          }`}
                          title={isLiked ? 'Liked' : 'Add to Liked Songs'}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
