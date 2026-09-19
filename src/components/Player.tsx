import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Shield,
  Activity,
  Zap,
  Settings,
  AlertTriangle,
  Lock,
  Tv
} from 'lucide-react';
import { Channel, User } from '../types';
import { TranslationDict } from '../i18n/translations';

interface PlayerProps {
  channel: Channel | null;
  currentUser: User | null;
  t: TranslationDict;
  onOpenBkash: () => void;
  onOpenDiagnostics: () => void;
}

export const Player: React.FC<PlayerProps> = ({
  channel,
  currentUser,
  t,
  onOpenBkash,
  onOpenDiagnostics,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showAutoplayMutedNotice, setShowAutoplayMutedNotice] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [useProxy, setUseProxy] = useState<boolean>(true);
  const [levels, setLevels] = useState<Array<{ id: number; height: number; bitrate: number }>>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 is Auto
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const retryCountRef = useRef<number>(0);
  const [stats, setStats] = useState({
    bandwidth: 0,
    bufferLength: 0,
    droppedFrames: 0,
  });

  // Automatically hide controls and settings after 4 seconds of inactivity
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettings(false); // Player settings popover hides after 4 seconds of idle
      }, 4000);
    }
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [isPlaying, resetControlsTimer]);

  // Check VIP permission
  const isVipBlocked =
    channel?.isVip && (!currentUser || currentUser.tier === 'free' || currentUser.status !== 'active');

  // Compute final stream URL: if channel.url is already our internal protected stream, use it directly
  const streamUrl = channel
    ? channel.url.startsWith('/api/stream')
      ? channel.url
      : useProxy
      ? `/api/proxy/stream?url=${encodeURIComponent(channel.url)}`
      : channel.url
    : '';

  useEffect(() => {
    if (!channel || isVipBlocked) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setIsPlaying(false);
      setIsBuffering(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    setErrorMsg(null);
    setIsBuffering(true);
    retryCountRef.current = 0;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        fragLoadingTimeOut: 15000,
        manifestLoadingTimeOut: 15000,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        },
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsBuffering(false);
        const mappedLevels = data.levels.map((lvl, index) => ({
          id: index,
          height: lvl.height || 720,
          bitrate: Math.round(lvl.bitrate / 1000),
        }));
        setLevels(mappedLevels);
        
        // Attempt autoplay; if blocked due to sound, fallback to muted autoplay
        video.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          if (!video.muted) {
            video.muted = true;
            setIsMuted(true);
            setShowAutoplayMutedNotice(true);
            video.play().then(() => {
              setIsPlaying(true);
            }).catch(() => {
              setIsPlaying(false);
            });
          } else {
            setIsPlaying(false);
          }
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentLevel(data.level);
      });

      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        if (video.buffered.length > 0) {
          const currentBuf = video.buffered.end(video.buffered.length - 1) - video.currentTime;
          setStats((prev) => ({
            ...prev,
            bufferLength: Math.max(0, Math.round(currentBuf * 10) / 10),
            bandwidth: Math.round((hls.bandwidthEstimate || 2500000) / 1000),
          }));
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.warn('HLS Event Error:', data);
        if (data.fatal) {
          retryCountRef.current += 1;
          if (retryCountRef.current <= 3) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log(`HLS: Recovering network error (attempt ${retryCountRef.current}/3)...`);
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log(`HLS: Recovering media error (attempt ${retryCountRef.current}/3)...`);
                hls.recoverMediaError();
                break;
              default:
                setErrorMsg(`Stream playback error (${data.details || 'Source unreachable'}). Try toggling Proxy.`);
                hls.destroy();
                break;
            }
          } else {
            setErrorMsg(`Stream unreachable (${data.details || 'Network timeout'}). Try switching Proxy/Direct or choose another channel.`);
            hls.destroy();
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari support
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsBuffering(false);
        video.play().then(() => setIsPlaying(true)).catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        });
      });
    } else {
      setErrorMsg('HLS playback is not supported by your current browser.');
    }

    // Send view heartbeat to server
    fetch('/api/analytics/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: channel.id, userId: currentUser?.id }),
    }).catch(() => {});

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel?.id, streamUrl, isVipBlocked]);

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setVolume((v) => Math.min(1, v + 0.1));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setVolume((v) => Math.max(0, v - 0.1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleQualityChange = (levelIndex: number) => {
    setCurrentLevel(levelIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
    setShowSettings(false);
  };

  const handleReload = () => {
    if (!videoRef.current || !channel) return;
    setErrorMsg(null);
    setIsBuffering(true);
    if (hlsRef.current) {
      hlsRef.current.loadSource(streamUrl);
      hlsRef.current.attachMedia(videoRef.current);
    }
  };

  return (
    <div
      ref={containerRef}
      id="nivotv-player-container"
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      onClick={resetControlsTimer}
      onPointerMove={resetControlsTimer}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/80 group flex flex-col justify-between select-none ${
        showControls ? '' : 'cursor-none'
      }`}
      role="region"
      aria-label="IPTV Media Player"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        id="nivotv-video-element"
        className="w-full h-full object-contain cursor-pointer"
        playsInline
        onClick={togglePlay}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
      />

      {/* Top Overlay: Channel Brand & Live Indicator */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/85 via-black/45 to-transparent flex items-center justify-between z-20 transition-all duration-300 ${
          showControls
            ? 'opacity-100 pointer-events-auto translate-y-0'
            : 'opacity-0 pointer-events-none -translate-y-2'
        }`}
      >
        <div className="flex items-center gap-3">
          {channel?.logo ? (
            <img
              src={channel.logo}
              alt={channel.name}
              className="w-10 h-10 object-contain bg-zinc-900/90 rounded-lg p-1 border border-zinc-700/60 shadow"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-rose-500">
              <Tv className="w-5 h-5" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-lg leading-tight tracking-wide drop-shadow">
                {channel?.name || 'Select a Channel'}
              </h2>
              {channel?.isVip && (
                <span className="px-2 py-0.5 text-xs font-bold uppercase rounded bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm flex items-center gap-1">
                  <Shield className="w-3 h-3" /> VIP
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <span>{channel?.groupTitle || 'Live Stream'}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
              <span>•</span>
              <span>
                {channel?.viewers || 140} {t.viewers}
              </span>
            </div>
          </div>
        </div>

        {/* Top Right Badges: Proxy Switch & Stream Health */}
        <div className="flex items-center gap-2">
          {/* Proxy status button */}
          <button
            id="toggle-proxy-button"
            onClick={() => setUseProxy(!useProxy)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md ${
              useProxy
                ? 'bg-rose-600/90 hover:bg-rose-500 text-white border border-rose-400/40'
                : 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 border border-zinc-600/40'
            }`}
            title={t.proxyDescription}
            aria-label="Toggle streaming proxy"
          >
            <Zap className={`w-3.5 h-3.5 ${useProxy ? 'text-yellow-300 animate-pulse' : 'text-zinc-400'}`} />
            <span>{useProxy ? t.proxyActive : t.proxyDisabled}</span>
          </button>

          {/* Stream Diagnostics Trigger */}
          <button
            id="open-diagnostics-button"
            onClick={onOpenDiagnostics}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 transition"
            title={t.streamDiagnostics}
            aria-label="View stream diagnostics"
          >
            <Activity className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Center States: VIP Wall, Buffering, or Error */}
      {showAutoplayMutedNotice && isMuted && isPlaying && !errorMsg && !isVipBlocked && (
        <button
          onClick={() => {
            setIsMuted(false);
            setShowAutoplayMutedNotice(false);
            if (videoRef.current) videoRef.current.muted = false;
          }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-zinc-900/95 hover:bg-zinc-800 text-white border border-rose-500/60 shadow-2xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md transition"
        >
          <VolumeX className="w-4 h-4 text-rose-400" />
          <span>Tap to Unmute Audio</span>
        </button>
      )}

      {isVipBlocked ? (
        <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{t.accessDeniedVip}</h3>
          <p className="text-zinc-400 text-sm max-w-md mb-6">{t.upgradePrompt}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenBkash}
              className="px-6 py-2.5 rounded-xl bg-[#E2136E] hover:bg-[#c71060] text-white font-semibold text-sm shadow-lg flex items-center gap-2 transition"
            >
              <span>{t.bkashPayment}</span>
            </button>
          </div>
        </div>
      ) : errorMsg ? (
        <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
          <h4 className="text-lg font-bold text-white mb-1">Stream Unavailable</h4>
          <p className="text-zinc-400 text-xs max-w-md mb-5">{errorMsg}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReload}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-2 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Stream</span>
            </button>
            <button
              onClick={() => setUseProxy(!useProxy)}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs flex items-center gap-2 transition border border-zinc-700"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Switch to {useProxy ? 'Direct' : 'Proxy'}</span>
            </button>
          </div>
        </div>
      ) : isBuffering ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
          <div className="w-12 h-12 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin mb-3" />
          <span className="text-xs font-semibold text-zinc-300 tracking-wider uppercase">Loading Stream...</span>
        </div>
      ) : null}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/65 to-transparent z-20 transition-all duration-300 ${
          showControls
            ? 'opacity-100 pointer-events-auto translate-y-0'
            : 'opacity-0 pointer-events-none translate-y-2'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left Controls: Play/Pause, Volume */}
          <div className="flex items-center gap-3">
            <button
              id="player-play-toggle"
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transition"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <button
              id="player-reload-button"
              onClick={handleReload}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
              title="Reload Stream"
              aria-label="Reload stream"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Volume control */}
            <div className="flex items-center gap-2 group/vol">
              <button
                onClick={toggleMute}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (isMuted) setIsMuted(false);
                  resetControlsTimer();
                }}
                className="w-20 h-1.5 bg-zinc-700 accent-rose-500 rounded-lg cursor-pointer"
                aria-label="Volume slider"
              />
            </div>

            {/* Live Bitrate / Buffer Stats indicator */}
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-400 font-mono bg-zinc-900/60 px-2.5 py-1 rounded-md border border-zinc-800">
              <span className="text-zinc-500">BUF:</span>
              <span className="text-emerald-400 font-medium">{stats.bufferLength}s</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-500">SPEED:</span>
              <span className="text-zinc-300 font-medium">{stats.bandwidth} kbps</span>
            </div>
          </div>

          {/* Right Controls: Quality Selector, Diagnostics, Fullscreen */}
          <div className="flex items-center gap-2 relative">
            {/* Settings / Quality button */}
            <button
              id="player-settings-toggle"
              onClick={() => {
                setShowSettings(!showSettings);
                resetControlsTimer();
              }}
              className={`p-2 rounded-lg transition ${
                showSettings ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title={t.quality}
              aria-label="Stream settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Quality Popup Menu */}
            {showSettings && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  resetControlsTimer();
                }}
                className="absolute right-0 bottom-12 w-48 bg-zinc-900 border border-zinc-700 rounded-xl p-2 shadow-2xl z-40 text-xs animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="font-semibold text-zinc-300 px-2 py-1.5 border-b border-zinc-800 mb-1 flex items-center justify-between">
                  <span>{t.quality}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">auto-hide 4s</span>
                </div>
                <button
                  onClick={() => handleQualityChange(-1)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                    currentLevel === -1
                      ? 'bg-rose-600 text-white font-medium'
                      : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <span>{t.auto}</span>
                  {currentLevel === -1 && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </button>
                {levels.map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={() => handleQualityChange(lvl.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                      currentLevel === lvl.id
                        ? 'bg-rose-600 text-white font-medium'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{lvl.height}p ({lvl.bitrate} kbps)</span>
                    {currentLevel === lvl.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </button>
                ))}
              </div>
            )}

            {/* Fullscreen button */}
            <button
              id="player-fullscreen-toggle"
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
