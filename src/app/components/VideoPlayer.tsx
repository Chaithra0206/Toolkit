

'use client';

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-react';
import { formatBytes } from '../utils/compressor';

interface VideoPlayerProps {
  src: string;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  startTime?: number;
  endTime?: number;
}

export interface VideoPlayerRef {
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
  videoElement: HTMLVideoElement | null;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
  src,
  onTimeUpdate,
  onDurationChange,
  startTime = 0,
  endTime = 0
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
    seekTo: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    },
    get videoElement() {
      return videoRef.current;
    }
  }));

  // Sync state on load
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [src]);

  // Keep playback within [startTime, endTime] boundaries if they are set
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdateInternal = () => {
      const current = video.currentTime;
      setCurrentTime(current);
      
      if (onTimeUpdate) {
        onTimeUpdate(current);
      }

      // Loop or pause if we exceed endTime (when trimming)
      if (endTime > 0 && current >= endTime) {
        video.currentTime = startTime;
        if (!video.loop) {
          video.pause();
          setIsPlaying(false);
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdateInternal);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdateInternal);
    };
  }, [startTime, endTime, onTimeUpdate]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      // If current time is out of range, seek to start
      if (endTime > 0 && (video.currentTime < startTime || video.currentTime >= endTime)) {
        video.currentTime = startTime;
      }
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error('Play failed:', err);
      });
    }
  };

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play().then(() => setIsPlaying(true));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMute = !isMuted;
      videoRef.current.muted = nextMute;
      setIsMuted(nextMute);
      if (nextMute) {
        setVolume(0);
      } else {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
    if (onTimeUpdate) {
      onTimeUpdate(val);
    }
  };

  const handleFullscreen = () => {
    videoRef.current?.requestFullscreen?.();
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex flex-col border border-black dark:border-white font-mono bg-black overflow-hidden relative group/player">
      
      {/* Top telemetry bar */}
      <div className="bg-neutral-900 border-b border-neutral-800 text-[8px] text-neutral-450 dark:text-neutral-500 p-2 flex items-center justify-between tracking-widest select-none">
        <span>PREVIEW ENGINE: HTML5 BUFFER</span>
        <span>STATUS: {isPlaying ? 'PLAYING' : 'PAUSED'}</span>
        <span>SRC: {src.substring(0, 30)}...</span>
      </div>

      {/* Main Video element */}
      <div className="relative aspect-video flex items-center justify-center bg-[#050505]">
        <video
          ref={videoRef}
          src={src}
          className="max-h-full w-full h-full object-contain"
          onClick={handlePlayPause}
          onDurationChange={() => {
            if (videoRef.current) {
              const dur = videoRef.current.duration;
              setDuration(dur);
              if (onDurationChange) {
                onDurationChange(dur);
              }
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>

      {/* Custom Control panel */}
      <div className="flex flex-col gap-3 p-4 bg-white dark:bg-black border-t border-neutral-200 dark:border-neutral-800 transition-colors">
        
        {/* Seek slider */}
        <div className="flex items-center gap-3 w-full">
          <span className="text-[9px] text-black dark:text-white font-extrabold select-none">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={startTime}
            max={endTime > 0 ? endTime : duration || 100}
            step="0.05"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-black dark:accent-white bg-neutral-250 dark:bg-neutral-800 h-1 cursor-pointer appearance-none outline-none"
          />
          <span className="text-[9px] text-black dark:text-white font-extrabold select-none">
            {formatTime(endTime > 0 ? endTime : duration)}
          </span>
        </div>

        {/* Buttons and volume row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-2">
            
            {/* Play/Pause Button */}
            <button
              onClick={handlePlayPause}
              className="p-2 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors rounded-none text-black dark:text-white cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
            </button>

            {/* Restart Button */}
            <button
              onClick={handleRestart}
              className="p-2 border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white text-neutral-400 hover:text-black dark:hover:text-white transition-colors rounded-none cursor-pointer"
              title="Restart Segment"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* In-range indicator */}
            {endTime > 0 && (
              <span className="text-[8px] border border-neutral-200 dark:border-neutral-800 text-neutral-450 dark:text-neutral-500 px-2 py-1 select-none">
                LOOP SEGMENT: {startTime.toFixed(1)}s - {endTime.toFixed(1)}s
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            {/* Volume indicator */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-black dark:text-white hover:opacity-85 transition-opacity"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-16 accent-black dark:accent-white bg-neutral-250 dark:bg-neutral-800 h-0.5 cursor-pointer appearance-none outline-none"
              />
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={handleFullscreen}
              className="p-1 border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white text-neutral-400 hover:text-black dark:hover:text-white rounded-none cursor-pointer"
              title="Fullscreen"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
