/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageItem } from '../types';
import { formatBytes } from '../utils/compressor';
import { Trash2, Download, Eye, AlertTriangle, RefreshCw } from 'lucide-react';

interface ImageListProps {
  images: ImageItem[];
  onRemove: (id: string) => void;
  onPreview: (image: ImageItem) => void;
  onDownload: (image: ImageItem) => void;
  onRecompressSingle: (id: string) => void;
  activePreviewId?: string;
}

export default function ImageList({
  images,
  onRemove,
  onPreview,
  onDownload,
  onRecompressSingle,
  activePreviewId
}: ImageListProps) {
  return (
    <div className="flex flex-col gap-3 font-mono">
      <AnimatePresence initial={false}>
        {images.map((img) => {
          const isSelected = img.id === activePreviewId;
          const origSize = formatBytes(img.originalSize);
          const compSize = img.compressedSize ? formatBytes(img.compressedSize) : '';
          
          let pctStr = '';
          if (img.percentage !== null) {
            pctStr = img.percentage <= 0 
              ? `${img.percentage.toFixed(0)}%`
              : `+${img.percentage.toFixed(0)}%`;
          }

          const fileExtension = img.name.split('.').pop()?.toUpperCase() || '';

          return (
            <motion.div
              key={img.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border transition-all duration-100 rounded-none bg-transparent ${
                isSelected 
                  ? 'border-black dark:border-white ring-1 ring-black dark:ring-white' 
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-450 dark:hover:border-neutral-600'
              }`}
            >
              {/* Left Segment: Thumbnail and dimensions */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div 
                  className="relative w-12 h-12 overflow-hidden bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shrink-0 cursor-pointer rounded-none"
                  onClick={() => onPreview(img)}
                >
                  <img
                    src={img.originalUrl}
                    alt={img.name}
                    className="w-full h-full object-cover grayscale opacity-90 hover:grayscale-0 duration-150"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-0 right-0 bg-black text-[7px] font-black text-white px-1.5 py-0.5 font-mono select-none uppercase tracking-wider">
                    {fileExtension}
                  </span>
                </div>

                <div className="min-w-0 flex-1 leading-tight">
                  <span 
                    className="text-[11px] font-black text-black dark:text-white block truncate cursor-pointer hover:underline uppercase tracking-wide" 
                    title={img.name}
                    onClick={() => onPreview(img)}
                  >
                    {img.name}
                  </span>
                  
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-[9px] text-neutral-450 dark:text-neutral-500 font-bold select-none tracking-widest uppercase">
                    <span>{origSize}</span>
                    {img.originalWidth && img.originalHeight && (
                      <span>• {img.originalWidth}x{img.originalHeight} PX</span>
                    )}
                    {img.status === 'completed' && img.compressedWidth && img.compressedHeight && (
                      <span className="text-black dark:text-white">
                        ➔ {img.compressedWidth}x{img.compressedHeight} PX
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle Segment: Compression metrics */}
              <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end select-none">
                {img.status === 'completed' && img.compressedSize !== null && (
                  <div className="flex items-center gap-3">
                    <div className="text-right leading-none">
                      <span className="text-[8px] text-neutral-400 dark:text-neutral-550 block font-bold uppercase tracking-wider mb-1">
                        OPTIMIZED
                      </span>
                      <span className="text-[11px] font-black text-black dark:text-white font-mono block">
                        {compSize}
                      </span>
                    </div>
                    
                    {/* Savings Monochrome Pill */}
                    <div className="border border-black dark:border-white px-2 py-1 font-mono text-[9px] font-extrabold leading-none text-black dark:text-white">
                      {pctStr}
                    </div>
                  </div>
                )}

                {/* Progress / Error / Idle states representation */}
                {img.status === 'compressing' && (
                  <div className="flex items-center gap-2 text-black dark:text-white font-extrabold uppercase">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-[9px] tracking-widest">[ PROCESSING... ]</span>
                  </div>
                )}

                {img.status === 'error' && (
                  <div className="flex items-center gap-1.5 text-black dark:text-white font-extrabold uppercase" title={img.errorMsg || 'Failed'}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-[9px] tracking-widest">[ FAILED ]</span>
                  </div>
                )}

                {img.status === 'idle' && (
                  <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500 font-extrabold uppercase">
                    <span className="text-[9px] tracking-widest">[ QUEUED ]</span>
                  </div>
                )}
              </div>

              {/* Right Segment: Action controls */}
              <div className="flex items-center gap-1.5 justify-end border-t md:border-t-0 pt-2.5 md:pt-0 border-neutral-100 dark:border-neutral-900 shrink-0 font-mono">
                
                {/* Visual Preview Trigger */}
                <button
                  type="button"
                  onClick={() => onPreview(img)}
                  disabled={img.status !== 'completed'}
                  className={`p-2 border transition-all cursor-pointer select-none rounded-none ${
                    isSelected 
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                      : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-black dark:hover:text-white text-neutral-450 disabled:opacity-20 disabled:pointer-events-none'
                  }`}
                  title="Compare Side-by-Side"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>

                {/* Single download trigger */}
                <button
                  type="button"
                  onClick={() => onDownload(img)}
                  disabled={img.status !== 'completed'}
                  className="p-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-450 hover:text-black dark:hover:text-white disabled:opacity-20 disabled:pointer-events-none cursor-pointer select-none transition-all rounded-none"
                  title="Download Optimized File"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* Recompress/Retry control */}
                <button
                  type="button"
                  onClick={() => onRecompressSingle(img.id)}
                  disabled={img.status === 'compressing'}
                  className="p-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-450 hover:text-black dark:hover:text-white disabled:opacity-20 disabled:pointer-events-none cursor-pointer select-none transition-all rounded-none"
                  title="Re-run process"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                {/* Delete item trigger */}
                <button
                  type="button"
                  onClick={() => onRemove(img.id)}
                  className="p-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-450 hover:text-red-500 cursor-pointer select-none transition-all rounded-none"
                  title="Remove from queue"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

              </div>

            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
