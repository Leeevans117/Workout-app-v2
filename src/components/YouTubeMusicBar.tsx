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

  // O(1) lookup map from videoId -> index in snap.likedSongs so rendering 1,000+ songs
  // never triggers O(N^2) findIndex calls during scroll or search filtering.
  const likedSongIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    snap.likedSongs.forEach((s, idx) => {
      if (!map.has(s.videoId)) {
        map.set(s.videoId, idx);
      }
    });
    return map;
  }, [snap.likedSongs]);

  // O(1) Set of liked videoIds for fast heart state lookup in Search & Queue lists
  const likedVideoIdSet = useMemo(() => {
    return new Set(snap.likedSongs.map((s) => s.videoId));
  }, [snap.likedSongs]);

  // Returns ALL matching songs from snap.likedSongs with zero artificial slice/pagination cap.
  // (Upstream YouTube Data API v3 supports up to 1,000 liked songs across 20 pages × 50 items.)
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
    <div className="w-full relative font-sans">
      {/* =====================================================================
       * OFFICIAL YOUTUBE MUSIC MINI-PLAYER BAR
       * Surface: #181818, Divider: #282828, Accent: #FF0033
       * ===================================================================== */}
      <div className="w-full bg-[#181818] border-t border-[#282828] rounded-[8px] px-3 py-2 flex items-center justify-between gap-2 relative overflow-hidden">
        {/* Left: 40x40 Thumbnail (4px radius) + Title (16px/500) + Artist (14px/400 #AAAAAA) */}
        <button
          type="button"
          onClick={() => setIsPlayerOpen(true)}
          className="flex items-center gap-3 min-w-0 flex-1 text-left group"
          title="Open YouTube Music Player"
        >
          <div className="w-10 h-10 rounded-[4px] bg-[#282828] overflow-hidden shrink-0 flex items-center justify-center">
            {currentSong?.thumbnailUrl ? (
              <img
                src={currentSong.thumbnailUrl}
                alt={currentSong.title}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <Music className="w-5 h-5 text-[#AAAAAA]" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-medium leading-tight text-[#FFFFFF] truncate">
              {currentSong
                ? currentSong.title
                : snap.isSyncingLibrary
                ? 'Loading Liked Music...'
                : 'Liked Music'}
            </p>
            <p className="text-[14px] font-normal leading-tight text-[#AAAAAA] truncate mt-1">
              {currentSong
                ? currentSong.artist
                : `${snap.likedSongs.length} songs`}
            </p>
          </div>
        </button>

        {/* Right: 44px Touch Target Controls (Like, Play/Pause, Next, Liked Pill) */}
        <div className="flex items-center gap-1 shrink-0">
          {currentSong && (
            <button
              type="button"
              onClick={() => youtubeMusicEngine.toggleLikeSong(currentSong)}
              className={`min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-colors duration-150 hover:bg-[#282828] ${
                isCurrentLiked ? 'text-[#FF0033]' : 'text-[#AAAAAA] hover:text-[#FFFFFF]'
              }`}
              title={isCurrentLiked ? 'Remove from Liked Music' : 'Add to Liked Music'}
            >
              <Heart className={`w-6 h-6 transition-transform duration-150 ${isCurrentLiked ? 'fill-current scale-105' : ''}`} />
            </button>
          )}

          <button
            type="button"
            onClick={() => youtubeMusicEngine.togglePlay()}
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#FFFFFF] hover:bg-[#282828] transition-colors duration-150"
            title={snap.isPlaying ? 'Pause' : 'Play'}
          >
            {snap.isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => youtubeMusicEngine.next()}
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#FFFFFF] hover:bg-[#282828] transition-colors duration-150"
            title="Next"
          >
            <SkipForward className="w-6 h-6 fill-current" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView('liked');
              setIsPlayerOpen(true);
            }}
            className="hidden sm:flex items-center gap-1.5 min-h-[36px] px-3 rounded-[20px] bg-[#282828] hover:bg-[#333333] text-[12px] font-medium text-[#FFFFFF] transition-colors duration-150 ml-1 whitespace-nowrap"
            title="Open Full Liked Music Playlist"
          >
            <Heart className="w-4 h-4 text-[#FF0033] fill-current" />
            <span>Liked ({snap.likedSongs.length})</span>
          </button>
        </div>

        {/* Bottom 4px Progress Bar (#282828 track, #FF0033 fill) */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#282828] pointer-events-none">
          <div
            className="h-full bg-[#FF0033] transition-all duration-150"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* =====================================================================
       * OFFICIAL YOUTUBE MUSIC FULL PLAYER MODAL / SHEET
       * Pure Black (#000000) Primary Background
       * Mobile (<640px): Full-width sheet with rounded top corners
       * Desktop (>=640px): Centered dialog with max-w-[480px] and all corners rounded
       * ===================================================================== */}
      {isPlayerOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-150">
          <div className="bg-[#000000] sm:border sm:border-[#282828] rounded-t-[12px] sm:rounded-[12px] w-full sm:max-w-[480px] h-[94vh] sm:h-[88vh] flex flex-col overflow-hidden text-left">
            {/* ===============================================================
             * HEADER (Top Navigation Bar)
             * Height: 56px, Background: #000000, Border Bottom: 1px #282828
             * =============================================================== */}
            <div className="h-[56px] bg-[#000000] border-b border-[#282828] px-2 flex items-center justify-between shrink-0">
              {/* Left: Minimize/Back button (44px touch target) */}
              <button
                type="button"
                onClick={() => setIsPlayerOpen(false)}
                className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-[#FFFFFF] hover:bg-[#282828] transition-colors duration-150 shrink-0"
                title="Minimize Player"
              >
                <ChevronDown className="w-6 h-6" />
              </button>

              {/* Center: Segmented Control Pill (Song | Liked | Playlists | Search) */}
              <div className="flex items-center rounded-[20px] p-[4px]">
                <button
                  type="button"
                  onClick={() => setActiveView('now-playing')}
                  className={`px-[12px] py-1.5 rounded-[20px] text-[14px] font-medium transition-colors duration-150 whitespace-nowrap ${
                    activeView === 'now-playing'
                      ? 'bg-[#282828] text-[#FFFFFF]'
                      : 'bg-transparent text-[#AAAAAA] hover:text-[#FFFFFF]'
                  }`}
                >
                  Song
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('liked')}
                  className={`px-[12px] py-1.5 rounded-[20px] text-[14px] font-medium transition-colors duration-150 whitespace-nowrap ${
                    activeView === 'liked'
                      ? 'bg-[#282828] text-[#FFFFFF]'
                      : 'bg-transparent text-[#AAAAAA] hover:text-[#FFFFFF]'
                  }`}
                >
                  Liked
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenedPlaylist(null);
                    setActiveView('playlists');
                  }}
                  className={`px-[12px] py-1.5 rounded-[20px] text-[14px] font-medium transition-colors duration-150 whitespace-nowrap ${
                    activeView === 'playlists'
                      ? 'bg-[#282828] text-[#FFFFFF]'
                      : 'bg-transparent text-[#AAAAAA] hover:text-[#FFFFFF]'
                  }`}
                >
                  Playlists
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('search')}
                  className={`px-[12px] py-1.5 rounded-[20px] text-[14px] font-medium transition-colors duration-150 whitespace-nowrap ${
                    activeView === 'search'
                      ? 'bg-[#282828] text-[#FFFFFF]'
                      : 'bg-transparent text-[#AAAAAA] hover:text-[#FFFFFF]'
                  }`}
                >
                  Search
                </button>
              </div>

              {/* Right: Sync/Refresh button (44px touch target) */}
              <button
                type="button"
                onClick={async () => {
                  await youtubeMusicEngine.syncPersonalLibrary(false);
                  showTempStatus('Synced Liked Music from your account');
                }}
                disabled={snap.isSyncingLibrary}
                className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-[#FFFFFF] hover:bg-[#282828] transition-colors duration-150 disabled:opacity-50 shrink-0"
                title="Sync Liked Music"
              >
                <RefreshCw
                  className={`w-5 h-5 ${
                    snap.isSyncingLibrary ? 'animate-spin text-[#FF0033]' : 'text-[#AAAAAA]'
                  }`}
                />
              </button>
            </div>

            {statusToast && (
              <div className="mx-4 mt-2 px-3 py-2 rounded-[8px] bg-[#181818] border border-[#282828] text-[12px] text-[#FFFFFF] flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-[#FF0033] shrink-0" />
                <span>{statusToast}</span>
              </div>
            )}

            {/* ===============================================================
             * VIEW 1: NOW PLAYING VIEW (activeView === 'now-playing')
             * Pure black #000000 background, 240px/320px square artwork,
             * 20px/500 title, 16px/400 #AAAAAA artist, 56px play button
             * =============================================================== */}
            {activeView === 'now-playing' && (
              <div className="flex-1 min-h-0 overflow-y-auto px-[16px] py-[16px] flex flex-col justify-between gap-[16px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {/* Centered Square Album Artwork (240px mobile, 320px sm/desktop, 8px radius, subtle shadow) */}
                <div className="w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] mx-auto rounded-[8px] bg-[#282828] overflow-hidden shrink-0 flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.8)]">
                  {currentSong?.thumbnailUrl ? (
                    <img
                      src={currentSong.thumbnailUrl}
                      alt={currentSong.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="w-[56px] h-[56px] text-[#AAAAAA]" />
                  )}
                </div>

                {/* Song Info Stacked Vertically Below Album Art + 44px Heart Button on Right */}
                <div className="flex items-center justify-between gap-[12px] shrink-0">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-[20px] font-medium tracking-[-0.5px] leading-snug text-[#FFFFFF] line-clamp-2">
                      {currentSong ? currentSong.title : 'No song selected'}
                    </h1>
                    <p className="text-[16px] font-normal text-[#AAAAAA] truncate mt-[4px]">
                      {currentSong ? currentSong.artist : 'YouTube Music'}
                    </p>
                  </div>

                  {currentSong && (
                    <button
                      type="button"
                      onClick={() => youtubeMusicEngine.toggleLikeSong(currentSong)}
                      className={`w-[44px] h-[44px] rounded-full flex items-center justify-center transition-colors duration-150 hover:bg-[#282828] shrink-0 ${
                        isCurrentLiked ? 'text-[#FF0033]' : 'text-[#AAAAAA] hover:text-[#FFFFFF]'
                      }`}
                      title={isCurrentLiked ? 'Liked' : 'Like'}
                    >
                      <Heart
                        className={`w-6 h-6 transition-transform duration-150 ${
                          isCurrentLiked ? 'fill-current scale-105' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* 4px Progress Bar (#282828 track, #FF0033 filled) */}
                <div className="space-y-[8px] shrink-0">
                  <div className="relative w-full h-[4px] bg-[#282828] rounded-[4px] overflow-hidden">
                    <div
                      className="h-full bg-[#FF0033] transition-all duration-150"
                      style={{ width: `${progressPct}%` }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={Math.max(1, Math.floor(snap.durationSec || 100))}
                      value={Math.min(
                        Math.floor(snap.currentTimeSec),
                        Math.max(1, Math.floor(snap.durationSec || 100))
                      )}
                      onChange={(e) => youtubeMusicEngine.seekTo(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      aria-label="Seek track progress"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[12px] font-normal text-[#AAAAAA] tabular-nums">
                    <span>{formatSec(snap.currentTimeSec)}</span>
                    <span>{formatSec(snap.durationSec)}</span>
                  </div>
                </div>

                {/* Controls Row (Centered, 12px spacing, 56px Play/Pause, 44px touch targets) */}
                <div className="flex items-center justify-center gap-[12px] shrink-0 py-1">
                  <button
                    type="button"
                    onClick={() => youtubeMusicEngine.toggleShuffle()}
                    className={`w-[44px] h-[44px] rounded-full flex items-center justify-center transition-colors duration-150 hover:bg-[#282828] ${
                      snap.isShuffle ? 'bg-[#282828] text-[#FFFFFF]' : 'text-[#AAAAAA]'
                    }`}
                    title="Shuffle"
                  >
                    <Shuffle className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => youtubeMusicEngine.previous()}
                    className="w-[44px] h-[44px] rounded-full bg-[#282828] hover:bg-[#333333] flex items-center justify-center text-[#FFFFFF] transition-colors duration-150"
                    title="Previous"
                  >
                    <SkipBack className="w-6 h-6 fill-current" />
                  </button>

                  <button
                    type="button"
                    onClick={() => youtubeMusicEngine.togglePlay()}
                    className="w-[56px] h-[56px] rounded-full bg-[#FFFFFF] hover:bg-[#E5E5E5] text-[#000000] flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-transform duration-150 active:scale-95"
                    title={snap.isPlaying ? 'Pause' : 'Play'}
                  >
                    {snap.isPlaying ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => youtubeMusicEngine.next()}
                    className="w-[44px] h-[44px] rounded-full bg-[#282828] hover:bg-[#333333] flex items-center justify-center text-[#FFFFFF] transition-colors duration-150"
                    title="Next"
                  >
                    <SkipForward className="w-6 h-6 fill-current" />
                  </button>

                  <button
                    type="button"
                    onClick={() => youtubeMusicEngine.toggleMute()}
                    className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-[#AAAAAA] hover:text-[#FFFFFF] hover:bg-[#282828] transition-colors duration-150"
                    title={snap.isMuted ? 'Unmute' : 'Mute'}
                  >
                    {snap.isMuted ? (
                      <VolumeX className="w-5 h-5 text-[#FF0033]" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Up Next Queue Section */}
                <div className="pt-[12px] border-t border-[#282828] shrink-0">
                  <div className="flex items-center justify-between mb-[8px]">
                    <span className="text-[14px] font-medium text-[#FFFFFF]">
                      Up Next · {snap.currentQueueTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveView('liked')}
                      className="text-[12px] font-normal text-[#AAAAAA] hover:text-[#FFFFFF] transition-colors duration-150"
                    >
                      Liked Music ({snap.likedSongs.length})
                    </button>
                  </div>

                  <div className="max-h-[168px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {snap.queue.map((song, idx) => {
                      const isCurrent = idx === snap.queueIndex;
                      const isSongLiked = likedVideoIdSet.has(song.videoId);
                      return (
                        <div
                          key={`${song.id}-q-${idx}`}
                          onClick={() => youtubeMusicEngine.playSongFromQueue(idx)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              youtubeMusicEngine.playSongFromQueue(idx);
                            }
                          }}
                          className={`h-[56px] px-[8px] py-[8px] rounded-[4px] flex items-center justify-between gap-[12px] cursor-pointer transition-colors duration-150 ${
                            isCurrent ? 'bg-[#181818]' : 'hover:bg-[#181818]'
                          }`}
                        >
                          <div className="flex items-center gap-[12px] min-w-0 flex-1">
                            <div className="w-[40px] h-[40px] rounded-[4px] bg-[#282828] overflow-hidden shrink-0 flex items-center justify-center">
                              {song.thumbnailUrl ? (
                                <img
                                  src={song.thumbnailUrl}
                                  alt={song.title}
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Music className="w-5 h-5 text-[#AAAAAA]" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-[16px] font-medium truncate ${
                                  isCurrent ? 'text-[#FF0033]' : 'text-[#FFFFFF]'
                                }`}
                              >
                                {song.title}
                              </p>
                              <p className="text-[12px] font-normal text-[#AAAAAA] truncate">
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
                            className={`w-[44px] h-[44px] rounded-full flex items-center justify-center shrink-0 transition-colors duration-150 hover:bg-[#282828] ${
                              isSongLiked ? 'text-[#FF0033]' : 'text-[#AAAAAA] hover:text-[#FFFFFF]'
                            }`}
                            title={isSongLiked ? 'Remove from Liked Music' : 'Add to Liked Music'}
                          >
                            <Heart className={`w-5 h-5 ${isSongLiked ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ===============================================================
             * VIEW 2: LIKED SONGS VIEW (activeView === 'liked')
             * 135deg #FF0033 to #000000 gradient header, 56px heart icon,
             * 28px/500 "Liked Music", 16px #AAAAAA count, 48px white play button,
             * uncapped 56px song list items
             * =============================================================== */}
            {activeView === 'liked' && (
              <div className="flex-1 min-h-0 flex flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {/* Liked Songs Playlist Header */}
                <div className="p-[24px] bg-[linear-gradient(135deg,#FF0033_0%,#000000_100%)] border-b border-[#282828] relative shrink-0">
                  <div className="flex items-end justify-between gap-[16px]">
                    <div className="space-y-[12px]">
                      <div className="w-[56px] h-[56px] rounded-[8px] bg-[#000000]/40 flex items-center justify-center text-[#FF0033]">
                        <Heart className="w-[56px] h-[56px] p-2.5 text-[#FF0033] fill-current" />
                      </div>
                      <div>
                        <h1 className="text-[28px] font-medium tracking-[-0.5px] leading-tight text-[#FFFFFF]">
                          Liked Music
                        </h1>
                        <p className="text-[16px] font-normal text-[#AAAAAA] mt-1">
                          {snap.likedSongs.length} songs
                        </p>
                      </div>
                    </div>

                    {/* Bottom-right Play All Button (48px circle, white background) */}
                    <div className="flex items-center gap-[8px]">
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
                        className="w-[44px] h-[44px] rounded-full bg-[#282828] hover:bg-[#333333] text-[#FFFFFF] flex items-center justify-center transition-colors duration-150"
                        title="Shuffle All"
                      >
                        <Shuffle className="w-5 h-5" />
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
                        className="w-[48px] h-[48px] rounded-full bg-[#FFFFFF] hover:bg-[#E5E5E5] text-[#000000] flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-transform duration-150 active:scale-95"
                        title="Play All"
                      >
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </button>
                    </div>
                  </div>

                  {/* Filter within Liked Songs (40px pill search input) */}
                  <div className="mt-[16px] flex items-center gap-[8px]">
                    <div className="relative flex-1">
                      <Search className="w-[16px] h-[16px] text-[#AAAAAA] absolute left-[12px] top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={likedFilter}
                        onChange={(e) => setLikedFilter(e.target.value)}
                        placeholder={`Filter ${snap.likedSongs.length} songs...`}
                        className="w-full h-[40px] pl-[36px] pr-[16px] rounded-[20px] bg-[#282828] text-[14px] text-[#FFFFFF] placeholder:text-[#666666] focus:outline-none"
                      />
                    </div>
                  </div>

                  {snap.enableYouTubeApiUrl && (
                    <div className="mt-[12px] pt-[8px] border-t border-[#282828] flex items-center justify-between gap-2 text-[12px] text-[#AAAAAA]">
                      <span>Enable YouTube Data API v3 to sync private likes:</span>
                      <a
                        href={snap.enableYouTubeApiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#FFFFFF] underline font-medium flex items-center gap-1 shrink-0"
                      >
                        <span>Enable</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Uncapped Liked Songs List (All songs rendered at 56px height) */}
                <div className="px-[16px] py-[8px]">
                  {filteredLikedSongs.length === 0 ? (
                    <div className="py-[32px] text-center text-[14px] text-[#AAAAAA]">
                      No results
                    </div>
                  ) : (
                    filteredLikedSongs.map((song, renderIdx) => {
                      const fullIndex = likedSongIndexMap.get(song.videoId) ?? renderIdx;
                      const isPlayingThis = currentSong?.videoId === song.videoId;
                      return (
                        <div
                          key={`${song.id}-${song.videoId}-${renderIdx}`}
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
                          className={`h-[56px] px-[8px] py-[8px] rounded-[4px] flex items-center justify-between gap-[12px] cursor-pointer transition-colors duration-150 ${
                            isPlayingThis ? 'bg-[#181818]' : 'hover:bg-[#181818]'
                          }`}
                        >
                          {/* Left: 40x40px Thumbnail (4px radius) + Center: Title (16px) & Artist (12px) */}
                          <div className="flex items-center gap-[12px] min-w-0 flex-1">
                            <div className="w-[40px] h-[40px] rounded-[4px] bg-[#282828] overflow-hidden shrink-0 flex items-center justify-center">
                              {song.thumbnailUrl ? (
                                <img
                                  src={song.thumbnailUrl}
                                  alt={song.title}
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Music className="w-5 h-5 text-[#AAAAAA]" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-[16px] font-medium truncate ${
                                  isPlayingThis ? 'text-[#FF0033]' : 'text-[#FFFFFF]'
                                }`}
                              >
                                {song.title}
                              </p>
                              <p className="text-[12px] font-normal text-[#AAAAAA] truncate">
                                {song.artist}
                              </p>
                            </div>
                          </div>

                          {/* Right: Heart/like button (44px touch target) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              youtubeMusicEngine.toggleLikeSong(song);
                            }}
                            className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-[#FF0033] hover:bg-[#282828] shrink-0 transition-colors duration-150"
                            title="Remove from Liked Music"
                          >
                            <Heart className="w-5 h-5 fill-current" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ===============================================================
             * VIEW 3: PLAYLISTS VIEW (activeView === 'playlists')
             * 64px height cards, 12px padding, 8px radius, #181818 surface,
             * "Liked Music" pinned first with red styling
             * =============================================================== */}
            {activeView === 'playlists' && (
              <div className="flex-1 min-h-0 flex flex-col px-[16px] py-[16px] gap-[12px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex items-center justify-between shrink-0">
                  <h2 className="text-[14px] font-medium text-[#FFFFFF]">Playlists</h2>
                  <button
                    type="button"
                    onClick={() => setShowImportDrawer((prev) => !prev)}
                    className="min-h-[36px] px-[12px] rounded-[20px] bg-[#181818] hover:bg-[#282828] text-[12px] font-normal text-[#AAAAAA] hover:text-[#FFFFFF] flex items-center gap-[8px] transition-colors duration-150"
                  >
                    <Link2 className="w-4 h-4" />
                    <span>{showImportDrawer ? 'Close' : 'Import URL'}</span>
                  </button>
                </div>

                {showImportDrawer && (
                  <form
                    onSubmit={handleAddLinkSubmit}
                    className="p-[12px] rounded-[12px] bg-[#181818] border border-[#282828] space-y-[8px] shrink-0"
                  >
                    <p className="text-[12px] text-[#AAAAAA]">
                      Paste a YouTube Music playlist or song URL:
                    </p>
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://music.youtube.com/playlist?list=..."
                      className="w-full h-[40px] px-[12px] rounded-[8px] bg-[#282828] text-[14px] text-[#FFFFFF] placeholder:text-[#666666] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      placeholder="Optional custom title"
                      className="w-full h-[40px] px-[12px] rounded-[8px] bg-[#282828] text-[14px] text-[#FFFFFF] placeholder:text-[#666666] focus:outline-none"
                    />
                    {formError && <p className="text-[12px] text-[#FF0033]">{formError}</p>}
                    <button
                      type="submit"
                      className="w-full h-[40px] rounded-[20px] bg-[#FFFFFF] text-[#000000] font-medium text-[14px]"
                    >
                      Load Playlist
                    </button>
                  </form>
                )}

                {openedPlaylist ? (
                  <div className="flex-1 min-h-0 flex flex-col gap-[8px]">
                    <div className="flex items-center justify-between pb-[8px] border-b border-[#282828] shrink-0">
                      <button
                        type="button"
                        onClick={() => setOpenedPlaylist(null)}
                        className="min-h-[44px] px-[8px] -ml-[8px] rounded-[8px] text-[14px] font-medium text-[#AAAAAA] hover:text-[#FFFFFF] hover:bg-[#282828] flex items-center gap-1 transition-colors duration-150"
                      >
                        <ChevronLeft className="w-5 h-5" />
                        <span>Playlists</span>
                      </button>
                      <span className="text-[16px] font-medium text-[#FFFFFF] truncate px-2">
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
                        className="h-[36px] px-[12px] rounded-[20px] bg-[#FFFFFF] text-[#000000] text-[12px] font-medium flex items-center gap-1 shrink-0"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Play</span>
                      </button>
                    </div>

                    {loadingPlaylistId === openedPlaylist.playlistId ? (
                      <div className="py-[32px] text-center text-[14px] text-[#AAAAAA]">
                        Loading playlist...
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {(snap.playlistTracksMap[openedPlaylist.playlistId] || []).map(
                          (song, idx) => {
                            const tracks =
                              snap.playlistTracksMap[openedPlaylist.playlistId] || [];
                            const isPlayingThis = currentSong?.videoId === song.videoId;
                            const isLiked = likedVideoIdSet.has(song.videoId);
                            return (
                              <div
                                key={`${song.id}-pl-${idx}`}
                                onClick={() => {
                                  youtubeMusicEngine.playCustomQueue(
                                    tracks,
                                    idx,
                                    openedPlaylist.title
                                  );
                                  setActiveView('now-playing');
                                }}
                                role="button"
                                tabIndex={0}
                                className={`h-[56px] px-[8px] py-[8px] rounded-[4px] flex items-center justify-between gap-[12px] cursor-pointer transition-colors duration-150 ${
                                  isPlayingThis ? 'bg-[#181818]' : 'hover:bg-[#181818]'
                                }`}
                              >
                                <div className="flex items-center gap-[12px] min-w-0 flex-1">
                                  <div className="w-[40px] h-[40px] rounded-[4px] bg-[#282828] overflow-hidden shrink-0 flex items-center justify-center">
                                    {song.thumbnailUrl ? (
                                      <img
                                        src={song.thumbnailUrl}
                                        alt={song.title}
                                        loading="lazy"
                                        decoding="async"
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Music className="w-5 h-5 text-[#AAAAAA]" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={`text-[16px] font-medium truncate ${
                                        isPlayingThis ? 'text-[#FF0033]' : 'text-[#FFFFFF]'
                                      }`}
                                    >
                                      {song.title}
                                    </p>
                                    <p className="text-[12px] font-normal text-[#AAAAAA] truncate">
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
                                  className={`w-[44px] h-[44px] rounded-full flex items-center justify-center shrink-0 transition-colors duration-150 hover:bg-[#282828] ${
                                    isLiked ? 'text-[#FF0033]' : 'text-[#AAAAAA] hover:text-[#FFFFFF]'
                                  }`}
                                >
                                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                                </button>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-[8px]">
                    {/* Pinned #1 Card: "Liked Music" with Red Accent Styling (Height 64px, Padding 12px, Radius 8px) */}
                    <div
                      onClick={() => setActiveView('liked')}
                      role="button"
                      tabIndex={0}
                      className="h-[64px] p-[12px] rounded-[8px] bg-[#181818] hover:bg-[#282828] flex items-center justify-between gap-[12px] cursor-pointer transition-colors duration-150"
                    >
                      <div className="flex items-center gap-[12px] min-w-0 flex-1">
                        <div className="w-[40px] h-[40px] rounded-[4px] bg-[#FF0033] flex items-center justify-center text-[#FFFFFF] shrink-0">
                          <Heart className="w-5 h-5 fill-current" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium text-[#FFFFFF] truncate">
                            Liked Music
                          </p>
                          <p className="text-[12px] font-normal text-[#AAAAAA] truncate">
                            {snap.likedSongs.length} songs
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
                        className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-[#FFFFFF] hover:bg-[#282828] shrink-0 transition-colors duration-150"
                        title="Play Liked Music"
                      >
                        <Play className="w-5 h-5" />
                      </button>
                    </div>

                    {/* User Playlists (Height 64px, Padding 12px, Radius 8px, Background #181818) */}
                    {snap.playlists.map((pl) => (
                      <div
                        key={pl.id}
                        onClick={() => handleOpenPlaylist(pl)}
                        role="button"
                        tabIndex={0}
                        className="h-[64px] p-[12px] rounded-[8px] bg-[#181818] hover:bg-[#282828] flex items-center justify-between gap-[12px] cursor-pointer transition-colors duration-150"
                      >
                        <div className="flex items-center gap-[12px] min-w-0 flex-1">
                          <div className="w-[40px] h-[40px] rounded-[4px] bg-[#282828] overflow-hidden flex items-center justify-center shrink-0">
                            {pl.thumbnailUrl ? (
                              <img
                                src={pl.thumbnailUrl}
                                alt={pl.title}
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ListMusic className="w-5 h-5 text-[#AAAAAA]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-medium text-[#FFFFFF] truncate">
                              {pl.title}
                            </p>
                            <p className="text-[12px] font-normal text-[#AAAAAA] truncate">
                              {pl.itemCount} songs
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            youtubeMusicEngine.playPlaylistById(pl.playlistId, pl.title);
                            setActiveView('now-playing');
                          }}
                          className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-[#FFFFFF] hover:bg-[#282828] shrink-0 transition-colors duration-150"
                          title={`Play ${pl.title}`}
                        >
                          <Play className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===============================================================
             * VIEW 4: SEARCH VIEW (activeView === 'search')
             * 40px height pill search input (20px radius, #282828 bg),
             * 56px song list items, centered "No results" empty state
             * =============================================================== */}
            {activeView === 'search' && (
              <div className="flex-1 min-h-0 flex flex-col px-[16px] py-[16px] gap-[12px]">
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-[8px] shrink-0">
                  <div className="relative flex-1">
                    <Search className="w-[16px] h-[16px] text-[#AAAAAA] absolute left-[12px] top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search songs, artists, or albums..."
                      className="w-full h-[40px] pl-[36px] pr-[16px] rounded-[20px] bg-[#282828] text-[14px] text-[#FFFFFF] placeholder:text-[#666666] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={snap.isSearching}
                    className="h-[40px] px-[16px] rounded-[20px] bg-[#282828] hover:bg-[#333333] text-[#FFFFFF] font-medium text-[14px] shrink-0 transition-colors duration-150"
                  >
                    {snap.isSearching ? '...' : 'Search'}
                  </button>
                </form>

                <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {snap.searchResults.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[14px] text-[#AAAAAA]">
                      No results
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <h3 className="text-[14px] font-medium text-[#FFFFFF] px-[8px] pb-[4px]">
                        Songs
                      </h3>
                      {snap.searchResults.map((song, idx) => {
                        const isPlayingThis = currentSong?.videoId === song.videoId;
                        const isLiked = likedVideoIdSet.has(song.videoId);
                        return (
                          <div
                            key={`${song.id}-sr-${idx}`}
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
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                youtubeMusicEngine.playCustomQueue(
                                  snap.searchResults,
                                  idx,
                                  searchInput ? `Search: ${searchInput}` : 'YouTube Music Search'
                                );
                                setActiveView('now-playing');
                              }
                            }}
                            className={`h-[56px] px-[8px] py-[8px] rounded-[4px] flex items-center justify-between gap-[12px] cursor-pointer transition-colors duration-150 ${
                              isPlayingThis ? 'bg-[#181818]' : 'hover:bg-[#181818]'
                            }`}
                          >
                            <div className="flex items-center gap-[12px] min-w-0 flex-1">
                              <div className="w-[40px] h-[40px] rounded-[4px] bg-[#282828] overflow-hidden shrink-0 flex items-center justify-center">
                                {song.thumbnailUrl ? (
                                  <img
                                    src={song.thumbnailUrl}
                                    alt={song.title}
                                    loading="lazy"
                                    decoding="async"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Music className="w-5 h-5 text-[#AAAAAA]" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-[16px] font-medium truncate ${
                                    isPlayingThis ? 'text-[#FF0033]' : 'text-[#FFFFFF]'
                                  }`}
                                >
                                  {song.title}
                                </p>
                                <p className="text-[12px] font-normal text-[#AAAAAA] truncate">
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
                              className={`w-[44px] h-[44px] rounded-full flex items-center justify-center shrink-0 transition-colors duration-150 hover:bg-[#282828] ${
                                isLiked
                                  ? 'text-[#FF0033]'
                                  : 'text-[#AAAAAA] hover:text-[#FFFFFF]'
                              }`}
                              title={isLiked ? 'Liked' : 'Add to Liked Music'}
                            >
                              <Heart
                                className={`w-5 h-5 transition-transform duration-150 ${
                                  isLiked ? 'fill-current scale-105' : ''
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
