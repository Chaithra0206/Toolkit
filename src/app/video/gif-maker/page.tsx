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
  Film, 
  Sliders, 
  Cpu, 
  RefreshCw,
  FileVideo,
  FileCheck,
  Zap,
  ImagePlay
} from 'lucide-react';

import UploadDropzone from '../../components/UploadDropzone';
import VideoPlayer, { VideoPlayerRef } from '../../components/VideoPlayer';
import TimelineSlider from '../../components/TimelineSlider';
import { useApp } from '../../context/AppContext';
import { makeGif, getBaseName } from '../../utils/ffmpeg';
import { formatBytes } from '../../utils/compressor';
import { toast } from 'sonner';

interface GifFileItem {
  file: File;
  originalSize: number;
  gifBlob: Blob | null;
  gifSize: number | null;
  status: 'idle' | 'loading_ffmpeg' | 'rendering' | 'completed' | 'error';
  progress: number;
  previewUrl: string | null;
  gifUrl: string | null;
}

export default function GifMakerPage() {
  const { addProcessedStat } = useApp();
  
  const [videoItem, setVideoItem] = useState<GifFileItem | null>(null);
  
  // Cut range settings
  const [duration, setDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);

  // GIF Custom Settings
  const [fps, setFps] = useState<number>(10);
  const [resolution, setResolution] = useState<number>(480);

  const playerRef = useRef<VideoPlayerRef>(null);

  // Clean up ObjectURLs on unmount
  useEffect(() => {
    return () => {
      if (videoItem) {
        if (videoItem.previewUrl) URL.revokeObjectURL(videoItem.previewUrl);
        if (videoItem.gifUrl) URL.revokeObjectURL(videoItem.gifUrl);
      }
    };
  }, [videoItem]);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    const objectUrl = URL.createObjectURL(file);

    if (videoItem) {
      if (videoItem.previewUrl) URL.revokeObjectURL(videoItem.previewUrl);
      if (videoItem.gifUrl) URL.revokeObjectURL(videoItem.gifUrl);
    }

    setVideoItem({
      file,
      originalSize: file.size,
      gifBlob: null,
      gifSize: null,
      status: 'idle',
      progress: 0,
      previewUrl: objectUrl,
      gifUrl: null
    });
    
    setDuration(0);
    setStartTime(0);
    setEndTime(0);
    
    toast.success(`Loaded video: ${file.name}`);
  };

  const handleDurationChange = (dur: number) => {
    setDuration(dur);
    if (endTime === 0) {
      // Set end time default to 5 seconds or total duration, whichever is shorter (GIFs should be short)
      setEndTime(Math.min(5, dur));
    }
  };

  // Synchronize slider handles with the video frame previews
  const handleRangeChange = (start: number, end: number) => {
    if (start !== startTime) {
      playerRef.current?.seekTo(start);
    } else if (end !== endTime) {
      playerRef.current?.seekTo(end);
    }
    
    setStartTime(start);
    setEndTime(end);
  };

  const handleCreateGif = async () => {
    if (!videoItem) return;

    // Limit GIF cut range to 15 seconds to prevent browser memory crashing
    const clipDuration = endTime - startTime;
    if (clipDuration > 15) {
      toast.warning('GIF clip range is capped at 15s max to optimize browser compilation memory.');
      return;
    }

    setVideoItem(prev => prev ? { 
      ...prev, 
      status: 'loading_ffmpeg', 
      progress: 0 
    } : null);

    try {
      toast.info('Initializing Lanczos Filter Engine... (Building 256-color spatial color map)');
      
      const result = await makeGif(
        videoItem.file,
        { 
          start: startTime, 
          duration: clipDuration, 
          fps, 
          resolution 
        },
        (percentage) => {
          setVideoItem(prev => {
            if (!prev) return null;
            return {
              ...prev,
              status: 'rendering',
              progress: percentage
            };
          });
        }
      );

      const gifUrl = URL.createObjectURL(result.blob);
      
      // Update global session stats
      addProcessedStat(0); 

      setVideoItem(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'completed',
          gifBlob: result.blob,
          gifSize: result.blob.size,
          gifUrl,
          progress: 100
        };
      });

      toast.success('Looping GIF compiled successfully!');
    } catch (err) {
      console.error(err);
      setVideoItem(prev => prev ? { ...prev, status: 'error' } : null);
      toast.error('Compilation stalled. Try reducing resolution or frame rate settings.');
    }
  };

  const handleDownload = () => {
    if (!videoItem || !videoItem.gifUrl || videoItem.status !== 'completed') return;

    const baseName = getBaseName(videoItem.file.name);
    const a = document.createElement('a');
    a.href = videoItem.gifUrl;
    a.download = `${baseName}_animation.gif`;
    a.click();
    toast.success('Download started!');
  };

  const handleRemove = () => {
    if (videoItem) {
      if (videoItem.previewUrl) URL.revokeObjectURL(videoItem.previewUrl);
      if (videoItem.gifUrl) URL.revokeObjectURL(videoItem.gifUrl);
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
            [ GIF MAKER ]
            {videoItem && (videoItem.status === 'rendering' || videoItem.status === 'loading_ffmpeg') && (
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
          descriptionText="DRAG & DROP VIDEO SOURCE HERE"
          maxSizeMB={200}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-2">
          
          {/* Left Column: Player & Range Selector */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <h3 className="text-[10px] font-black text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
              // CLIP SEGMENT CHRONO TRACK
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
                  // TIMELINE SEGMENT TRIMMER (MAX 15S SUGGESTED)
                </h3>
                <TimelineSlider
                  duration={duration}
                  startTime={startTime}
                  endTime={endTime}
                  onChange={handleRangeChange}
                />
              </div>
            )}

            {/* Compiled Loop GIF Review */}
            {videoItem.status === 'completed' && videoItem.gifUrl && (
              <div className="flex flex-col gap-3 mt-4">
                <h3 className="text-[10px] font-black text-green-600 dark:text-green-400 tracking-widest uppercase flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" />
                  // LOOPING ANIMATION PREVIEW
                </h3>
                <div className="border border-black dark:border-white p-2 bg-neutral-900 flex justify-center items-center select-none aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={videoItem.gifUrl} 
                    alt="Compiled looping GIF animation" 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Settings & Actions */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* GIF Settings configuration */}
            <div className="border border-black dark:border-white p-5 bg-white dark:bg-black font-mono flex flex-col gap-5">
              <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <Sliders className="w-4 h-4 text-black dark:text-white" />
                <h3 className="text-xs font-black text-black dark:text-white tracking-widest uppercase">
                  GIF EXPORT PRESET
                </h3>
              </div>

              {/* GIF Frame Rate */}
              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-black text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
                  CHOOSE FRAME RATE (FPS)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {([5, 8, 10, 15] as const).map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setFps(rate)}
                      disabled={videoItem.status !== 'idle' && videoItem.status !== 'completed' && videoItem.status !== 'error'}
                      className={`py-2 border font-extrabold text-[9px] tracking-wider uppercase text-center rounded-none cursor-pointer transition-colors duration-100 ${
                        fps === rate
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                          : 'bg-transparent border-neutral-250 dark:border-neutral-800 text-neutral-450 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {rate} FPS
                    </button>
                  ))}
                </div>
              </div>

              {/* GIF Scale Resolution */}
              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-black text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
                  RESOLUTION WIDTH (PIXELS)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {([320, 480, 640] as const).map((res) => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      disabled={videoItem.status !== 'idle' && videoItem.status !== 'completed' && videoItem.status !== 'error'}
                      className={`py-2 border font-extrabold text-[9px] tracking-wider uppercase text-center rounded-none cursor-pointer transition-colors duration-100 ${
                        resolution === res
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                          : 'bg-transparent border-neutral-250 dark:border-neutral-800 text-neutral-450 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {res}px
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* File info card */}
            <div className="border border-neutral-250 dark:border-neutral-850 p-4 bg-white dark:bg-black font-mono flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <FileVideo className="w-4 h-4 text-neutral-450 shrink-0" />
                <span className="text-xs font-black text-black dark:text-white uppercase truncate flex-1">
                  {videoItem.file.name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-[9px] text-neutral-450 dark:text-neutral-500 mt-2 tracking-wider">
                <div>
                  <span className="block uppercase font-bold text-[8px]">INPUT DURATION:</span>
                  <span className="font-extrabold text-black dark:text-white mt-0.5 block">
                    {duration.toFixed(2)}s
                  </span>
                </div>
                <div>
                  <span className="block uppercase font-bold text-[8px]">GIF CUT RANGE:</span>
                  <span className="font-extrabold text-green-600 dark:text-green-400 mt-0.5 block">
                    {(endTime - startTime).toFixed(2)}s
                  </span>
                </div>
              </div>
            </div>

            {/* Processing and Actions Console */}
            <div className="border border-neutral-200 dark:border-neutral-800 p-5 bg-[#FBFBFB] dark:bg-neutral-950 flex flex-col gap-4 font-mono">
              <span className="text-[8px] font-black text-neutral-450 tracking-widest uppercase">
                ENGINE COMPILER PANEL
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
                      BOUNDS ENGAGED: READY FOR COMPILATION
                    </span>
                    <button
                      onClick={handleCreateGif}
                      className="w-full py-3 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-extrabold text-[10px] tracking-widest uppercase border border-black dark:border-white rounded-none cursor-pointer flex items-center justify-center gap-2 select-none shadow-xs transition-all active:scale-99"
                    >
                      <ImagePlay className="w-3.5 h-3.5" />
                      COMPILE LOOP GIF
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
                        FETCHING PALETTE FILTER MATRIX...
                      </span>
                    </div>
                    <span className="text-[8px] text-neutral-400 dark:text-neutral-600 leading-normal tracking-wide">
                      Spinning up safe sandboxed processes inside WebAssembly heap. Your files never leave your client device.
                    </span>
                  </motion.div>
                )}

                {videoItem.status === 'rendering' && (
                  <motion.div
                    key="rendering"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between text-[9px] font-black text-black dark:text-white">
                      <span className="tracking-widest uppercase">
                        GENERATING SPATIAL COLOR MAP:
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
                      Analyzing video structures. Building specialized 256-color palette to preserve visual gradients under lanczos scaling.
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
                      ANIMATED GIF SUCCESSFULLY COMPILED.
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[9px] text-neutral-400 dark:text-neutral-500 p-3 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800">
                      <div>
                        <span className="block text-[8px] font-bold">GIF FILE SIZE:</span>
                        <span className="font-extrabold text-black dark:text-white block mt-0.5">
                          {formatBytes(videoItem.gifSize || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-bold">FPS CONFIG:</span>
                        <span className="font-extrabold text-black dark:text-white block mt-0.5">
                          {fps} frames per sec
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleDownload}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-extrabold text-[10px] tracking-widest uppercase rounded-none cursor-pointer flex items-center justify-center gap-2 select-none shadow-xs border border-green-600 transition-all duration-100"
                    >
                      <Download className="w-3.5 h-3.5" />
                      DOWNLOAD ANIMATED GIF
                    </button>

                    <button
                      onClick={handleCreateGif}
                      className="w-full py-2 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900 text-black dark:text-white font-extrabold text-[9px] tracking-widest uppercase border border-neutral-250 dark:border-neutral-800 rounded-none cursor-pointer flex items-center justify-center gap-2 select-none transition-colors"
                    >
                      Re-export GIF
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
                      COMPILATION FAILED: Segment allocation error.
                    </div>
                    <button
                      onClick={handleCreateGif}
                      className="w-full py-3 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-extrabold text-[10px] tracking-widest uppercase border border-black dark:border-white rounded-none cursor-pointer flex items-center justify-center gap-2"
                    >
                      RE-INITIATE RENDER
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Clear Workspace button */}
              <button
                onClick={handleRemove}
                disabled={videoItem.status === 'rendering' || videoItem.status === 'loading_ffmpeg'}
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
          COLOR PALETTE MATRIX GENERATION SPECS
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[8px] text-neutral-450 dark:text-neutral-500 tracking-wider select-none">
          <div>
            <span className="block font-bold uppercase">FILTER METHOD:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">LANCZOS DECIMATION</span>
          </div>
          <div>
            <span className="block font-bold uppercase">QUANTIZATION INDEX:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">HEURISTIC NEIGHBORS</span>
          </div>
          <div>
            <span className="block font-bold uppercase">DITHERING PROFILE:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">SIERRA LITE ERROR DIFF</span>
          </div>
          <div>
            <span className="block font-bold uppercase">CPU EXEC BOUNDS:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">CORES ALLOCATION SYNC</span>
          </div>
        </div>
      </div>

    </div>
  );
}
