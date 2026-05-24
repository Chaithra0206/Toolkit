/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, 
  Download, 
  Video, 
  Sliders, 
  Cpu, 
  RefreshCw,
  FileVideo,
  FileCheck,
  Scissors
} from 'lucide-react';

import UploadDropzone from '../../components/UploadDropzone';
import VideoPlayer, { VideoPlayerRef } from '../../components/VideoPlayer';
import TimelineSlider from '../../components/TimelineSlider';
import { useApp } from '../../context/AppContext';
import { trimVideo, getBaseName } from '../../utils/ffmpeg';
import { formatBytes } from '../../utils/compressor';
import { toast } from 'sonner';

interface TrimFileItem {
  file: File;
  originalSize: number;
  trimmedBlob: Blob | null;
  trimmedSize: number | null;
  status: 'idle' | 'loading_ffmpeg' | 'trimming' | 'completed' | 'error';
  progress: number;
  previewUrl: string | null;
  trimmedUrl: string | null;
}

export default function VideoTrimmerPage() {
  const { addProcessedStat } = useApp();
  
  const [videoItem, setVideoItem] = useState<TrimFileItem | null>(null);
  
  // Trim range settings
  const [duration, setDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);

  const playerRef = useRef<VideoPlayerRef>(null);

  // Clean up ObjectURLs on unmount
  useEffect(() => {
    return () => {
      if (videoItem) {
        if (videoItem.previewUrl) URL.revokeObjectURL(videoItem.previewUrl);
        if (videoItem.trimmedUrl) URL.revokeObjectURL(videoItem.trimmedUrl);
      }
    };
  }, [videoItem]);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    const objectUrl = URL.createObjectURL(file);

    if (videoItem) {
      if (videoItem.previewUrl) URL.revokeObjectURL(videoItem.previewUrl);
      if (videoItem.trimmedUrl) URL.revokeObjectURL(videoItem.trimmedUrl);
    }

    setVideoItem({
      file,
      originalSize: file.size,
      trimmedBlob: null,
      trimmedSize: null,
      status: 'idle',
      progress: 0,
      previewUrl: objectUrl,
      trimmedUrl: null
    });
    
    setDuration(0);
    setStartTime(0);
    setEndTime(0);
    
    toast.success(`Loaded video: ${file.name}`);
  };

  const handleDurationChange = (dur: number) => {
    setDuration(dur);
    // Initialize end time to the full duration on load
    if (endTime === 0) {
      setEndTime(dur);
    }
  };

  // Synchronize slider handles with the video frame previews
  const handleRangeChange = (start: number, end: number) => {
    // If start handle was moved, seek to start time. Otherwise seek to end time
    if (start !== startTime) {
      playerRef.current?.seekTo(start);
    } else if (end !== endTime) {
      playerRef.current?.seekTo(end);
    }
    
    setStartTime(start);
    setEndTime(end);
  };

  const handleTrim = async () => {
    if (!videoItem) return;

    setVideoItem(prev => prev ? { 
      ...prev, 
      status: 'loading_ffmpeg', 
      progress: 0 
    } : null);

    try {
      toast.info('Loading WebAssembly core modules... (Trim routines require frame-accurate parsing)');
      
      const result = await trimVideo(
        videoItem.file,
        { start: startTime, end: endTime },
        (percentage) => {
          setVideoItem(prev => {
            if (!prev) return null;
            return {
              ...prev,
              status: 'trimming',
              progress: percentage
            };
          });
        }
      );

      const trimUrl = URL.createObjectURL(result.blob);
      
      // Update global session stats
      addProcessedStat(0); 

      setVideoItem(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'completed',
          trimmedBlob: result.blob,
          trimmedSize: result.blob.size,
          trimmedUrl: trimUrl,
          progress: 100
        };
      });

      toast.success('Video trimmed successfully!');
    } catch (err) {
      console.error(err);
      setVideoItem(prev => prev ? { ...prev, status: 'error' } : null);
      toast.error('Trimming failed. Check that selection boundary limits are valid.');
    }
  };

  const handleDownload = () => {
    if (!videoItem || !videoItem.trimmedUrl || videoItem.status !== 'completed') return;

    const baseName = getBaseName(videoItem.file.name);
    const ext = videoItem.file.name.split('.').pop() || 'mp4';
    const a = document.createElement('a');
    a.href = videoItem.trimmedUrl;
    a.download = `${baseName}_trimmed.${ext}`;
    a.click();
    toast.success('Download started!');
  };

  const handleRemove = () => {
    if (videoItem) {
      if (videoItem.previewUrl) URL.revokeObjectURL(videoItem.previewUrl);
      if (videoItem.trimmedUrl) URL.revokeObjectURL(videoItem.trimmedUrl);
    }
    setVideoItem(null);
    setDuration(0);
    setStartTime(0);
    setEndTime(0);
    toast.info('Workspace cleared.');
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      
      {/* Workspace Header layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-sm font-black tracking-widest text-black dark:text-white uppercase font-mono flex items-center gap-2 leading-none">
            [ VIDEO TRIMMER ]
            {videoItem && (videoItem.status === 'trimming' || videoItem.status === 'loading_ffmpeg') && (
              <span className="w-1.5 h-1.5 bg-black dark:bg-white animate-pulse" />
            )}
          </h1>
        </div>
      </div>

      {/* Main content body */}
      {!videoItem ? (
        <UploadDropzone
          onFilesSelected={handleFilesSelected}
          acceptedTypes={['video/*']}
          acceptedExtensions={['.mp4', '.mov', '.webm', '.avi', '.mkv']}
          descriptionText="DRAG & DROP VIDEO FILE HERE"
          maxSizeMB={200}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-2">
          
          {/* Left Column: Player & Range Selector */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <h3 className="text-[10px] font-black text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
              // ACTIVE PREVIEW PLAYER (RANGE BOUNDS LOCK ACTIVE)
            </h3>
            
            {videoItem.previewUrl && (
              <VideoPlayer 
                ref={playerRef}
                src={videoItem.previewUrl} 
                onDurationChange={handleDurationChange}
                startTime={startTime}
                endTime={endTime}
              />
            )}

            {/* Dynamic Timeline cut controller */}
            {duration > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                <h3 className="text-[10px] font-black text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
                  // TIMELINE SEGMENT TRIMMER
                </h3>
                <TimelineSlider
                  duration={duration}
                  startTime={startTime}
                  endTime={endTime}
                  onChange={handleRangeChange}
                />
              </div>
            )}

            {/* Trimmed Output Review */}
            {videoItem.status === 'completed' && videoItem.trimmedUrl && (
              <div className="flex flex-col gap-3 mt-4">
                <h3 className="text-[10px] font-black text-green-600 dark:text-green-400 tracking-widest uppercase flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" />
                  // COMPLETED TRIM REVIEW
                </h3>
                <VideoPlayer src={videoItem.trimmedUrl} />
              </div>
            )}
          </div>

          {/* Right Column: Settings & Actions */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* File info card */}
            <div className="border border-black dark:border-white p-5 bg-white dark:bg-black font-mono flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <FileVideo className="w-4 h-4 text-black dark:text-white shrink-0" />
                <h3 className="text-xs font-black text-black dark:text-white tracking-widest uppercase truncate flex-1">
                  {videoItem.file.name}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-[9px] text-neutral-450 dark:text-neutral-500 tracking-wider">
                <div>
                  <span className="block uppercase font-bold text-[8px]">SOURCE SIZE:</span>
                  <span className="font-extrabold text-black dark:text-white mt-0.5 block">
                    {formatBytes(videoItem.originalSize)}
                  </span>
                </div>
                <div>
                  <span className="block uppercase font-bold text-[8px]">SOURCE FORMAT:</span>
                  <span className="font-extrabold text-black dark:text-white mt-0.5 block truncate">
                    {videoItem.file.name.split('.').pop()?.toUpperCase() || 'MP4'}
                  </span>
                </div>
                <div>
                  <span className="block uppercase font-bold text-[8px]">TOTAL DURATION:</span>
                  <span className="font-extrabold text-black dark:text-white mt-0.5 block">
                    {duration.toFixed(2)}s
                  </span>
                </div>
                <div>
                  <span className="block uppercase font-bold text-[8px]">CUT SEGMENT DUR:</span>
                  <span className="font-extrabold text-black dark:text-white mt-0.5 block text-green-600 dark:text-green-400">
                    {(endTime - startTime).toFixed(2)}s
                  </span>
                </div>
              </div>
            </div>

            {/* Processing and Actions Console */}
            <div className="border border-neutral-200 dark:border-neutral-800 p-5 bg-[#FBFBFB] dark:bg-neutral-950 flex flex-col gap-4 font-mono">
              <span className="text-[8px] font-black text-neutral-450 tracking-widest uppercase">
                WASM CHIP RENDER CONTROLS
              </span>

              {/* Active Loading states */}
              <AnimatePresence mode="wait">
                {videoItem.status === 'idle' && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-3"
                  >
                    <span className="text-[10px] font-bold text-neutral-450 dark:text-neutral-500">
                      BOUNDS ENGAGED: READY FOR EXPORT
                    </span>
                    <button
                      onClick={handleTrim}
                      className="w-full py-3 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-extrabold text-[10px] tracking-widest uppercase border border-black dark:border-white rounded-none cursor-pointer flex items-center justify-center gap-2 select-none shadow-xs transition-all active:scale-99"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      TRIM & EXPORT CLIP
                    </button>
                  </motion.div>
                )}

                {videoItem.status === 'loading_ffmpeg' && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-black dark:text-white" />
                      <span className="text-[10px] font-extrabold text-black dark:text-white tracking-widest uppercase">
                        ENGAGING WASM DECODERS...
                      </span>
                    </div>
                    <span className="text-[8px] text-neutral-400 dark:text-neutral-600 leading-normal tracking-wide">
                      Starting FFmpeg virtual file system and allocation pools inside WebAssembly. This isolates resources completely in-memory.
                    </span>
                  </motion.div>
                )}

                {videoItem.status === 'trimming' && (
                  <motion.div
                    key="trimming"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between text-[9px] font-black text-black dark:text-white">
                      <span className="tracking-widest uppercase">
                        PARSING & RE-CODING FRAMES:
                      </span>
                      <span>{videoItem.progress}%</span>
                    </div>
                    
                    <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 border border-neutral-300 dark:border-neutral-700">
                      <div 
                        className="bg-black dark:bg-white h-full transition-all duration-300"
                        style={{ width: `${videoItem.progress}%` }}
                      />
                    </div>
                    
                    <span className="text-[8px] text-neutral-400 dark:text-neutral-600 leading-normal tracking-wide animate-pulse">
                      Slicing video structures at the cut bounds. Re-encoding frames ensures pixel-perfect start and end audio alignment.
                    </span>
                  </motion.div>
                )}

                {videoItem.status === 'completed' && (
                  <motion.div
                    key="completed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-3"
                  >
                    <div className="p-3 border border-green-600 dark:border-green-400 text-green-600 dark:text-green-400 bg-green-500/5 text-[9px] font-bold uppercase tracking-wider">
                      CLIP EXPORTED SUCCESSFUL: Saved in sandbox pool.
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[9px] text-neutral-400 dark:text-neutral-500 p-3 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800">
                      <div>
                        <span className="block text-[8px] font-bold">TRIMMED SIZE:</span>
                        <span className="font-extrabold text-black dark:text-white block mt-0.5">
                          {formatBytes(videoItem.trimmedSize || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-bold">SEGMENT CUT:</span>
                        <span className="font-extrabold text-black dark:text-white block mt-0.5">
                          {startTime.toFixed(1)}s - {endTime.toFixed(1)}s
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleDownload}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-extrabold text-[10px] tracking-widest uppercase rounded-none cursor-pointer flex items-center justify-center gap-2 select-none shadow-xs border border-green-600 transition-all duration-100"
                    >
                      <Download className="w-3.5 h-3.5" />
                      DOWNLOAD TRIMMED VIDEO
                    </button>

                    <button
                      onClick={handleTrim}
                      className="w-full py-2 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900 text-black dark:text-white font-extrabold text-[9px] tracking-widest uppercase border border-neutral-250 dark:border-neutral-800 rounded-none cursor-pointer flex items-center justify-center gap-2 select-none transition-colors"
                    >
                      Re-export segment
                    </button>
                  </motion.div>
                )}

                {videoItem.status === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-3"
                  >
                    <div className="p-3 border border-red-600 dark:border-red-400 text-red-600 dark:text-red-400 bg-red-500/5 text-[9px] font-bold uppercase tracking-wider">
                      TRIM FAILED: Codec parsing boundary invalid.
                    </div>
                    <button
                      onClick={handleTrim}
                      className="w-full py-3 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-extrabold text-[10px] tracking-widest uppercase border border-black dark:border-white rounded-none cursor-pointer flex items-center justify-center gap-2"
                    >
                      RE-EXPORT RANGE
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Clear Workspace button */}
              <button
                onClick={handleRemove}
                disabled={videoItem.status === 'trimming' || videoItem.status === 'loading_ffmpeg'}
                className="w-full mt-1.5 py-2 border border-dashed border-neutral-200 dark:border-neutral-800 hover:border-red-600 hover:text-red-600 dark:hover:border-red-400 dark:hover:text-red-400 text-neutral-450 hover:bg-transparent text-[9px] tracking-widest font-extrabold uppercase flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-20 disabled:pointer-events-none select-none transition-all duration-100"
              >
                <Trash2 className="w-3 h-3" />
                Clear workspace
              </button>
            </div>

          </div>

        </div>
      )}

      {/* Specifications Telemetry Section */}
      <div className="border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col gap-3 mt-16 font-mono">
        <span className="text-[9px] font-black text-black dark:text-white tracking-widest uppercase flex items-center gap-1.5 select-none">
          <Cpu className="w-3.5 h-3.5 text-neutral-455" />
          FRAME-ACCURATE SPLITTING ARCHITECTURE
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[8px] text-neutral-450 dark:text-neutral-500 tracking-wider select-none">
          <div>
            <span className="block font-bold uppercase">SEEK ACCURATE:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">AV_SEEK_FORCE_KEYFRAME</span>
          </div>
          <div>
            <span className="block font-bold uppercase">RE-ENCODER PROFILE:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">AVC INTRA H.264 CODER</span>
          </div>
          <div>
            <span className="block font-bold uppercase">BUFFER ALLOCATION:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">DYNAMIC VIRTUAL MEM FS</span>
          </div>
          <div>
            <span className="block font-bold uppercase">SANDBOX ISOLATION:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">100% SECURE CLIENT</span>
          </div>
        </div>
      </div>

    </div>
  );
}
