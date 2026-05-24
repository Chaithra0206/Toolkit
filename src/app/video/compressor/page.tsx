/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Trash2, 
  Download, 
  Video, 
  Layers, 
  Sliders, 
  Cpu, 
  RefreshCw,
  HardDrive,
  FileVideo,
  FileCheck
} from 'lucide-react';

import UploadDropzone from '../../components/UploadDropzone';
import VideoPlayer, { VideoPlayerRef } from '../../components/VideoPlayer';
import { useApp } from '../../context/AppContext';
import { compressVideo, getBaseName } from '../../utils/ffmpeg';
import { formatBytes } from '../../utils/compressor';
import { toast } from 'sonner';

interface VideoFileItem {
  file: File;
  originalSize: number;
  compressedBlob: Blob | null;
  compressedSize: number | null;
  percentage: number | null;
  status: 'idle' | 'loading_ffmpeg' | 'compressing' | 'completed' | 'error';
  progress: number;
  previewUrl: string | null;
  compressedUrl: string | null;
}

export default function VideoCompressorPage() {
  const { addProcessedStat } = useApp();
  
  const [videoItem, setVideoItem] = useState<VideoFileItem | null>(null);
  
  // Compression Settings
  const [compressionLevel, setCompressionLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [resolution, setResolution] = useState<'1080p' | '720p' | '480p' | 'original'>('original');

  const playerRef = useRef<VideoPlayerRef>(null);

  // Clean up ObjectURLs on unmount
  useEffect(() => {
    return () => {
      if (videoItem) {
        if (videoItem.previewUrl) URL.revokeObjectURL(videoItem.previewUrl);
        if (videoItem.compressedUrl) URL.revokeObjectURL(videoItem.compressedUrl);
      }
    };
  }, [videoItem]);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    
    // Process the first file
    const file = files[0];
    const objectUrl = URL.createObjectURL(file);

    // If there was an old file, clean up its URLs
    if (videoItem) {
      if (videoItem.previewUrl) URL.revokeObjectURL(videoItem.previewUrl);
      if (videoItem.compressedUrl) URL.revokeObjectURL(videoItem.compressedUrl);
    }

    setVideoItem({
      file,
      originalSize: file.size,
      compressedBlob: null,
      compressedSize: null,
      percentage: null,
      status: 'idle',
      progress: 0,
      previewUrl: objectUrl,
      compressedUrl: null
    });
    
    toast.success(`Loaded video: ${file.name}`);
  };

  const handleCompress = async () => {
    if (!videoItem) return;

    setVideoItem(prev => prev ? { 
      ...prev, 
      status: 'loading_ffmpeg', 
      progress: 0 
    } : null);

    try {
      // 1. Trigger FFmpeg loading indicator
      toast.info('Initializing local WebAssembly Sandbox... (This may take a moment on first load)');
      
      // 2. Start compression
      const result = await compressVideo(
        videoItem.file,
        { compressionLevel, resolution },
        (percentage) => {
          setVideoItem(prev => {
            if (!prev) return null;
            return {
              ...prev,
              status: 'compressing',
              progress: percentage
            };
          });
        }
      );

      const compUrl = URL.createObjectURL(result.blob);
      const reduction = ((result.blob.size - videoItem.originalSize) / videoItem.originalSize) * 100;
      const bytesSaved = videoItem.originalSize - result.blob.size;
      
      // Update global session stats
      if (bytesSaved > 0) {
        addProcessedStat(bytesSaved);
      }

      setVideoItem(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'completed',
          compressedBlob: result.blob,
          compressedSize: result.blob.size,
          compressedUrl: compUrl,
          percentage: parseFloat(reduction.toFixed(1)),
          progress: 100
        };
      });

      toast.success('Video compressed successfully!');
    } catch (err) {
      console.error(err);
      setVideoItem(prev => prev ? { ...prev, status: 'error' } : null);
      toast.error('Compression failed. Please ensure the video format is supported.');
    }
  };

  const handleDownload = () => {
    if (!videoItem || !videoItem.compressedUrl || videoItem.status !== 'completed') return;

    const baseName = getBaseName(videoItem.file.name);
    const a = document.createElement('a');
    a.href = videoItem.compressedUrl;
    a.download = `${baseName}_compressed.mp4`;
    a.click();
    toast.success('Download started!');
  };

  const handleRemove = () => {
    if (videoItem) {
      if (videoItem.previewUrl) URL.revokeObjectURL(videoItem.previewUrl);
      if (videoItem.compressedUrl) URL.revokeObjectURL(videoItem.compressedUrl);
    }
    setVideoItem(null);
    toast.info('Workspace cleared.');
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      
      {/* Workspace Header layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-sm font-black tracking-widest text-black dark:text-white uppercase font-mono flex items-center gap-2 leading-none">
            [ VIDEO COMPRESSOR ]
            {videoItem && (videoItem.status === 'compressing' || videoItem.status === 'loading_ffmpeg') && (
              <span className="w-1.5 h-1.5 bg-black dark:bg-white animate-pulse" />
            )}
          </h1>
        </div>

        {videoItem && videoItem.status === 'completed' && videoItem.percentage !== null && (
          <div className="flex items-center gap-3 bg-transparent p-3 py-1.5 border border-black dark:border-white rounded-none shadow-[none] shrink-0 self-start sm:self-auto font-mono text-[9px] tracking-widest text-black dark:text-white">
            <div className="text-right">
              <span className="font-extrabold block">
                REDUCED: {videoItem.percentage < 0 ? `${Math.abs(videoItem.percentage)}%` : `0%`}
              </span>
              <span className="block mt-0.5 opacity-60">
                SAVED: {formatBytes(Math.max(0, videoItem.originalSize - (videoItem.compressedSize || 0)))}
              </span>
            </div>
          </div>
        )}
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
          
          {/* Left Column: Player & Metadata */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <h3 className="text-[10px] font-black text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
              // ORIGINAL PREVIEW
            </h3>
            
            {videoItem.previewUrl && (
              <VideoPlayer 
                ref={playerRef}
                src={videoItem.previewUrl} 
              />
            )}

            {/* File info card */}
            <div className="border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-black font-mono flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <FileVideo className="w-4 h-4 text-neutral-450 shrink-0" />
                <span className="text-xs font-black text-black dark:text-white uppercase truncate flex-1">
                  {videoItem.file.name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-[9px] text-neutral-400 dark:text-neutral-500 mt-2 tracking-wider">
                <div>
                  <span className="block uppercase font-bold text-[8px]">ORIGINAL SIZE:</span>
                  <span className="font-extrabold text-black dark:text-white mt-0.5 block">
                    {formatBytes(videoItem.originalSize)}
                  </span>
                </div>
                <div>
                  <span className="block uppercase font-bold text-[8px]">MIME TYPE:</span>
                  <span className="font-extrabold text-black dark:text-white mt-0.5 block truncate">
                    {videoItem.file.type || 'video/mp4'}
                  </span>
                </div>
              </div>
            </div>

            {/* Compressed preview (after completion) */}
            {videoItem.status === 'completed' && videoItem.compressedUrl && (
              <div className="flex flex-col gap-3 mt-2">
                <h3 className="text-[10px] font-black text-green-600 dark:text-green-400 tracking-widest uppercase flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" />
                  // COMPRESSED OUTPUT REVIEW
                </h3>
                <VideoPlayer src={videoItem.compressedUrl} />
              </div>
            )}
          </div>

          {/* Right Column: Settings & Actions */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Compression Settings Panel */}
            <div className="border border-black dark:border-white p-5 bg-white dark:bg-black flex flex-col gap-5">
              <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <Sliders className="w-4 h-4 text-black dark:text-white" />
                <h3 className="text-xs font-black text-black dark:text-white tracking-widest uppercase">
                  COMPRESSION SETTINGS
                </h3>
              </div>

              {/* Compression Levels */}
              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-black text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
                  QUALITY LEVEL (PRESET)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setCompressionLevel(lvl)}
                      disabled={videoItem.status !== 'idle' && videoItem.status !== 'completed' && videoItem.status !== 'error'}
                      className={`py-2 border font-extrabold text-[9px] tracking-wider uppercase text-center rounded-none cursor-pointer transition-colors duration-100 ${
                        compressionLevel === lvl
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                          : 'bg-transparent border-neutral-250 dark:border-neutral-800 text-neutral-450 dark:text-neutral-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {lvl === 'low' ? 'Low Comp' : lvl === 'medium' ? 'Medium' : 'High Comp'}
                    </button>
                  ))}
                </div>
                <span className="text-[8px] text-neutral-400 dark:text-neutral-600 tracking-wide mt-1 leading-relaxed">
                  {compressionLevel === 'high' 
                    ? '*HIGH: Drastically shrinks file size by applying higher CRF, lower audio bitrate, but with minor visual noise.'
                    : compressionLevel === 'medium'
                    ? '*MEDIUM: Standard balanced mode preserving clean sharpness while removing redundant block buffers.'
                    : '*LOW: Retains flawless professional grade resolution with minimum bitrate reduction.'}
                </span>
              </div>

              {/* Resolution Scaling */}
              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-black text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
                  RESOLUTION SCALING
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['original', '1080p', '720p', '480p'] as const).map((res) => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      disabled={videoItem.status !== 'idle' && videoItem.status !== 'completed' && videoItem.status !== 'error'}
                      className={`py-2 border font-extrabold text-[9px] tracking-wider uppercase text-center rounded-none cursor-pointer transition-colors duration-100 ${
                        resolution === res
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                          : 'bg-transparent border-neutral-250 dark:border-neutral-800 text-neutral-450 dark:text-neutral-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Processing and Actions Console */}
            <div className="border border-neutral-200 dark:border-neutral-800 p-5 bg-[#FBFBFB] dark:bg-neutral-950 flex flex-col gap-4 font-mono">
              <span className="text-[8px] font-black text-neutral-450 tracking-widest uppercase">
                WASMED ENGINE STATUS
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
                      SANDBOX ENGINE ENGAGED: READY FOR OPERATION
                    </span>
                    <button
                      onClick={handleCompress}
                      className="w-full py-3 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-extrabold text-[10px] tracking-widest uppercase border border-black dark:border-white rounded-none cursor-pointer flex items-center justify-center gap-2 select-none shadow-xs transition-all active:scale-99"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      ENGAGE COMPRESSION
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
                        INITIALIZING WASM BUFFERS...
                      </span>
                    </div>
                    <span className="text-[8px] text-neutral-400 dark:text-neutral-600 leading-normal tracking-wide">
                      Fetching multi-threaded ffmpeg-core packages directly into your browser's private memory pool. This runs 100% locally.
                    </span>
                  </motion.div>
                )}

                {videoItem.status === 'compressing' && (
                  <motion.div
                    key="compressing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between text-[9px] font-black text-black dark:text-white">
                      <span className="tracking-widest uppercase">
                        COMPRESSING VIDEO FILE:
                      </span>
                      <span>{videoItem.progress}%</span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 border border-neutral-300 dark:border-neutral-700">
                      <div 
                        className="bg-black dark:bg-white h-full transition-all duration-300"
                        style={{ width: `${videoItem.progress}%` }}
                      />
                    </div>
                    
                    <span className="text-[8px] text-neutral-400 dark:text-neutral-600 leading-normal tracking-wide animate-pulse">
                      DO NOT CLOSE TAB. WebAssembly utilizing client-side CPU loops to compress video buffers offline.
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
                      OPERATION SUCCESSFUL: Output generated inside local container.
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[9px] text-neutral-400 dark:text-neutral-500 p-3 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800">
                      <div>
                        <span className="block text-[8px] font-bold">COMPRESSED SIZE:</span>
                        <span className="font-extrabold text-black dark:text-white block mt-0.5">
                          {formatBytes(videoItem.compressedSize || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-bold">RATIO ACHIEVED:</span>
                        <span className="font-extrabold text-green-600 dark:text-green-400 block mt-0.5">
                          {videoItem.percentage}% size reduction
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleDownload}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-extrabold text-[10px] tracking-widest uppercase rounded-none cursor-pointer flex items-center justify-center gap-2 select-none shadow-xs border border-green-600 transition-all duration-100"
                    >
                      <Download className="w-3.5 h-3.5" />
                      DOWNLOAD COMPRESSED VIDEO
                    </button>

                    <button
                      onClick={handleCompress}
                      className="w-full py-2 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900 text-black dark:text-white font-extrabold text-[9px] tracking-widest uppercase border border-neutral-250 dark:border-neutral-800 rounded-none cursor-pointer flex items-center justify-center gap-2 select-none transition-colors"
                    >
                      Re-Compress setting
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
                      ERROR ENCOUNTERED: WASM buffer overflow or unsupported codec preset.
                    </div>
                    <button
                      onClick={handleCompress}
                      className="w-full py-3 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-extrabold text-[10px] tracking-widest uppercase border border-black dark:border-white rounded-none cursor-pointer flex items-center justify-center gap-2"
                    >
                      RE-ENGAGE PROCESSOR
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Clear Workspace button */}
              <button
                onClick={handleRemove}
                disabled={videoItem.status === 'compressing' || videoItem.status === 'loading_ffmpeg'}
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
          <Cpu className="w-3.5 h-3.5 text-neutral-450" />
          VIDEO HARDWARE INTERPOLATION SPECS
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[8px] text-neutral-450 dark:text-neutral-500 tracking-wider select-none">
          <div>
            <span className="block font-bold uppercase">WASMED ENCODER:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">FFMPEG-CORE.JS v0.12.6</span>
          </div>
          <div>
            <span className="block font-bold uppercase">SANDBOX PROFILE:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">100% IN-MEMORY CLIENT</span>
          </div>
          <div>
            <span className="block font-bold uppercase">CODEC PREFERENCE:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">H.264 (AVC) / AAC</span>
          </div>
          <div>
            <span className="block font-bold uppercase">MAX MEMORY CAP:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">BROWSER WASM HEAP (2GB)</span>
          </div>
        </div>
      </div>

    </div>
  );
}
