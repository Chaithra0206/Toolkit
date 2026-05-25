

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
  Zap
} from 'lucide-react';

import UploadDropzone from '../../components/UploadDropzone';
import VideoPlayer, { VideoPlayerRef } from '../../components/VideoPlayer';
import { useApp } from '../../context/AppContext';
import { convertVideo, getBaseName } from '../../utils/ffmpeg';
import { formatBytes } from '../../utils/compressor';
import { toast } from 'sonner';

interface ConvertFileItem {
  file: File;
  originalSize: number;
  convertedBlob: Blob | null;
  convertedSize: number | null;
  status: 'idle' | 'loading_ffmpeg' | 'converting' | 'completed' | 'error';
  progress: number;
  previewUrl: string | null;
  convertedUrl: string | null;
  contentType: string | null;
}

export default function VideoConverterPage() {
  const { addProcessedStat } = useApp();
  
  const [videoItem, setVideoItem] = useState<ConvertFileItem | null>(null);
  
  // Conversion Settings
  const [format, setFormat] = useState<'mp4' | 'mov' | 'webm' | 'avi' | 'gif'>('mp4');
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('high');

  const playerRef = useRef<VideoPlayerRef>(null);

  // Clean up ObjectURLs on unmount
  useEffect(() => {
    return () => {
      if (videoItem) {
        if (videoItem.previewUrl) URL.revokeObjectURL(videoItem.previewUrl);
        if (videoItem.convertedUrl) URL.revokeObjectURL(videoItem.convertedUrl);
      }
    };
  }, [videoItem]);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    const objectUrl = URL.createObjectURL(file);

    if (videoItem) {
      if (videoItem.previewUrl) URL.revokeObjectURL(videoItem.previewUrl);
      if (videoItem.convertedUrl) URL.revokeObjectURL(videoItem.convertedUrl);
    }

    setVideoItem({
      file,
      originalSize: file.size,
      convertedBlob: null,
      convertedSize: null,
      status: 'idle',
      progress: 0,
      previewUrl: objectUrl,
      convertedUrl: null,
      contentType: null
    });
    
    toast.success(`Loaded video: ${file.name}`);
  };

  const handleConvert = async () => {
    if (!videoItem) return;

    setVideoItem(prev => prev ? { 
      ...prev, 
      status: 'loading_ffmpeg', 
      progress: 0 
    } : null);

    try {
      toast.info('Initializing local WebAssembly Core... (This may take a moment on first load)');
      
      const result = await convertVideo(
        videoItem.file,
        { format, quality },
        (percentage) => {
          setVideoItem(prev => {
            if (!prev) return null;
            return {
              ...prev,
              status: 'converting',
              progress: percentage
            };
          });
        }
      );

      const convUrl = URL.createObjectURL(result.blob);
      
      // Update global session stats (files processed)
      addProcessedStat(0); // Only counts processed files

      setVideoItem(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'completed',
          convertedBlob: result.blob,
          convertedSize: result.blob.size,
          convertedUrl: convUrl,
          contentType: result.type,
          progress: 100
        };
      });

      toast.success('Video converted successfully!');
    } catch (err) {
      console.error(err);
      setVideoItem(prev => prev ? { ...prev, status: 'error' } : null);
      toast.error('Conversion failed. Some quality configurations are heavy for browser compilation.');
    }
  };

  const handleDownload = () => {
    if (!videoItem || !videoItem.convertedUrl || videoItem.status !== 'completed') return;

    const baseName = getBaseName(videoItem.file.name);
    const a = document.createElement('a');
    a.href = videoItem.convertedUrl;
    a.download = `${baseName}_converted.${format}`;
    a.click();
    toast.success('Download started!');
  };

  const handleRemove = () => {
    if (videoItem) {
      if (videoItem.previewUrl) URL.revokeObjectURL(videoItem.previewUrl);
      if (videoItem.convertedUrl) URL.revokeObjectURL(videoItem.convertedUrl);
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
            [ VIDEO CONVERTER ]
            {videoItem && (videoItem.status === 'converting' || videoItem.status === 'loading_ffmpeg') && (
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
          
          {/* Left Column: Player & Metadata */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <h3 className="text-[10px] font-black text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
              // INPUT SOURCE PREVIEW
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
              <div className="grid grid-cols-2 gap-4 text-[9px] text-neutral-450 dark:text-neutral-500 mt-2 tracking-wider">
                <div>
                  <span className="block uppercase font-bold text-[8px]">INPUT SIZE:</span>
                  <span className="font-extrabold text-black dark:text-white mt-0.5 block">
                    {formatBytes(videoItem.originalSize)}
                  </span>
                </div>
                <div>
                  <span className="block uppercase font-bold text-[8px]">INPUT TYPE:</span>
                  <span className="font-extrabold text-black dark:text-white mt-0.5 block truncate">
                    {videoItem.file.type || 'video/mp4'}
                  </span>
                </div>
              </div>
            </div>

            {/* Converted Output Review */}
            {videoItem.status === 'completed' && videoItem.convertedUrl && (
              <div className="flex flex-col gap-3 mt-2">
                <h3 className="text-[10px] font-black text-green-600 dark:text-green-400 tracking-widest uppercase flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" />
                  // CONVERTED RESULT PREVIEW
                </h3>
                
                {format === 'gif' ? (
                  <div className="border border-black dark:border-white p-2 bg-neutral-900 flex justify-center items-center select-none aspect-video">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={videoItem.convertedUrl} 
                      alt="Converted GIF preview" 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <VideoPlayer src={videoItem.convertedUrl} />
                )}
              </div>
            )}
          </div>

          {/* Right Column: Settings & Actions */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Conversion Settings Panel */}
            <div className="border border-black dark:border-white p-5 bg-white dark:bg-black flex flex-col gap-5 font-mono">
              <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <Sliders className="w-4 h-4 text-black dark:text-white" />
                <h3 className="text-xs font-black text-black dark:text-white tracking-widest uppercase">
                  CONVERSION PARAMETERS
                </h3>
              </div>

              {/* Output Formats */}
              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-black text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
                  CHOOSE OUTPUT FORMAT
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['mp4', 'mov', 'webm', 'avi', 'gif'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setFormat(fmt)}
                      disabled={videoItem.status !== 'idle' && videoItem.status !== 'completed' && videoItem.status !== 'error'}
                      className={`py-2.5 border font-extrabold text-[9px] tracking-wider uppercase text-center rounded-none cursor-pointer transition-colors duration-100 ${
                        format === fmt
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                          : 'bg-transparent border-neutral-200 dark:border-neutral-800 text-neutral-450 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
                <span className="text-[8px] text-neutral-400 dark:text-neutral-600 tracking-wide mt-1 leading-relaxed">
                  {format === 'gif' 
                    ? '*GIF: Extracts frames to compile an optimized 256-color palette looping image.'
                    : format === 'webm'
                    ? '*WEBM: Uses VP8 compression. Ideal for highly optimized web pages.'
                    : `*${format.toUpperCase()}: Exports video/audio using standard AVC container parameters.`}
                </span>
              </div>

              {/* Quality Settings */}
              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-black text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
                  EXPORT QUALITY
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((qlt) => (
                    <button
                      key={qlt}
                      onClick={() => setQuality(qlt)}
                      disabled={videoItem.status !== 'idle' && videoItem.status !== 'completed' && videoItem.status !== 'error'}
                      className={`py-2 border font-extrabold text-[9px] tracking-wider uppercase text-center rounded-none cursor-pointer transition-colors duration-100 ${
                        quality === qlt
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                          : 'bg-transparent border-neutral-250 dark:border-neutral-800 text-neutral-450 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {qlt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Processing and Actions Console */}
            <div className="border border-neutral-200 dark:border-neutral-800 p-5 bg-[#FBFBFB] dark:bg-neutral-950 flex flex-col gap-4 font-mono">
              <span className="text-[8px] font-black text-neutral-450 tracking-widest uppercase">
                ENGINE CONTROL MATRIX
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
                      SYSTEM STANDBY: READY FOR CONVERSION
                    </span>
                    <button
                      onClick={handleConvert}
                      className="w-full py-3 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-extrabold text-[10px] tracking-widest uppercase border border-black dark:border-white rounded-none cursor-pointer flex items-center justify-center gap-2 select-none shadow-xs transition-all active:scale-99"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      CONVERT NOW
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
                        FETCHING WASM ENGINE...
                      </span>
                    </div>
                    <span className="text-[8px] text-neutral-400 dark:text-neutral-600 leading-normal tracking-wide">
                      Spinning up sandboxed core files from high-speed cache nodes. This ensures files are parsed completely locally.
                    </span>
                  </motion.div>
                )}

                {videoItem.status === 'converting' && (
                  <motion.div
                    key="converting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between text-[9px] font-black text-black dark:text-white">
                      <span className="tracking-widest uppercase">
                        TRANSCODING FRAMES:
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
                      Processing frame channels. Higher quality settings or formats like GIF may require extra render cycles.
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
                      TRANSCODING COMPLETE: Output compiled in-memory.
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[9px] text-neutral-400 dark:text-neutral-500 p-3 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800">
                      <div>
                        <span className="block text-[8px] font-bold">CONVERTED SIZE:</span>
                        <span className="font-extrabold text-black dark:text-white block mt-0.5">
                          {formatBytes(videoItem.convertedSize || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-bold">OUTPUT TYPE:</span>
                        <span className="font-extrabold text-black dark:text-white block mt-0.5 uppercase">
                          {format} format
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleDownload}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-extrabold text-[10px] tracking-widest uppercase rounded-none cursor-pointer flex items-center justify-center gap-2 select-none shadow-xs border border-green-600 transition-all duration-100"
                    >
                      <Download className="w-3.5 h-3.5" />
                      DOWNLOAD CONVERTED FILE
                    </button>

                    <button
                      onClick={handleConvert}
                      className="w-full py-2 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900 text-black dark:text-white font-extrabold text-[9px] tracking-widest uppercase border border-neutral-250 dark:border-neutral-800 rounded-none cursor-pointer flex items-center justify-center gap-2 select-none transition-colors"
                    >
                      Transcode again
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
                      CONVERSION STALLED: Codec mismatch or out-of-memory heap boundary.
                    </div>
                    <button
                      onClick={handleConvert}
                      className="w-full py-3 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-extrabold text-[10px] tracking-widest uppercase border border-black dark:border-white rounded-none cursor-pointer flex items-center justify-center gap-2"
                    >
                      RE-INITIATE OPERATIONS
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Clear Workspace button */}
              <button
                onClick={handleRemove}
                disabled={videoItem.status === 'converting' || videoItem.status === 'loading_ffmpeg'}
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
          TRANSCODING TELEMETRY SPECIFICATIONS
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[8px] text-neutral-450 dark:text-neutral-500 tracking-wider select-none">
          <div>
            <span className="block font-bold uppercase">WASM TRANSLATOR:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">LIBAVCODEC PARSER</span>
          </div>
          <div>
            <span className="block font-bold uppercase">GIF RENDER ENGINE:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">LANCZOS FILTERING</span>
          </div>
          <div>
            <span className="block font-bold uppercase">VIDEO PARSING:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">VP8 (WEBM) / MPEG-4 (AVI)</span>
          </div>
          <div>
            <span className="block font-bold uppercase">SANDBOX CAP:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">100% OFFLINE BROWSER</span>
          </div>
        </div>
      </div>

    </div>
  );
}
