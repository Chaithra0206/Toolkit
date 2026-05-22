/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageItem } from '../types';
import { formatBytes } from '../utils/compressor';
import { Trash2, Download, Eye, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

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
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {images.map((img) => {
          const isSelected = img.id === activePreviewId;
          const origSize = formatBytes(img.originalSize);
          const compSize = img.compressedSize ? formatBytes(img.compressedSize) : '';
          
          let pctStr = '';
          let isSaving = true;
          if (img.percentage !== null) {
            isSaving = img.percentage <= 0;
            pctStr = img.percentage <= 0 
              ? `${img.percentage.toFixed(0)}%`
              : `+${img.percentage.toFixed(0)}%`;
          }

          const fileExtension = img.name.split('.').pop()?.toUpperCase() || '';

          return (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border transition-all duration-150 bg-white dark:bg-[#121315] ${
                isSelected 
                  ? 'border-black dark:border-white ring-1 ring-black dark:ring-white' 
                  : 'border-slate-200/60 dark:border-slate-800/80 hover:border-slate-400 dark:hover:border-slate-600'
              }`}
            >
              {/* Left Segment: Thumbnail and basic measurements */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div 
                  className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shrink-0 cursor-pointer"
                  onClick={() => onPreview(img)}
                >
                  <img
                    src={img.originalUrl}
                    alt={img.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] font-bold text-white px-1 py-0.5 rounded-tl font-mono">
                    {fileExtension}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <span 
                    className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate cursor-pointer hover:underline" 
                    title={img.name}
                    onClick={() => onPreview(img)}
                  >
                    {img.name}
                  </span>
                  
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px] text-slate-450 dark:text-slate-500 font-medium">
                    <span className="font-mono">{origSize}</span>
                    {img.originalWidth && img.originalHeight && (
                      <span>• {img.originalWidth}x{img.originalHeight}</span>
                    )}
                    {img.status === 'completed' && img.compressedWidth && img.compressedHeight && (
                      <span className="text-slate-400 dark:text-slate-600">
                        ➔ {img.compressedWidth}x{img.compressedHeight}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle Segment: Compression metrics and savings percentage */}
              <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                {img.status === 'completed' && img.compressedSize !== null && (
                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block leading-none font-medium mb-1">
                        Optimized Size
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono leading-none">
                        {compSize}
                      </span>
                    </div>
                    
                    {/* Savings pill indicator */}
                    <div className={`px-2 py-1 rounded-lg font-mono text-[10px] font-extrabold leading-none ${
                      isSaving 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {pctStr}
                    </div>
                  </div>
                )}

                {/* Progress / Error / Idle states representation */}
                {img.status === 'compressing' && (
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-[10px] font-bold font-mono">Compressing...</span>
                  </div>
                )}

                {img.status === 'error' && (
                  <div className="flex items-center gap-1.5 text-red-500/90 dark:text-red-400" title={img.errorMsg || 'Failed to compress'}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">Failed</span>
                  </div>
                )}

                {img.status === 'idle' && (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 animate-pulse" />
                    <span className="text-[10px] font-medium font-mono">In Queue</span>
                  </div>
                )}
              </div>

              {/* Right Segment: Action controls */}
              <div className="flex items-center gap-1.5 justify-end border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100 dark:border-slate-900 shrink-0">
                
                {/* Visual Preview Trigger */}
                <button
                  type="button"
                  onClick={() => onPreview(img)}
                  disabled={img.status !== 'completed'}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer select-none ${
                    isSelected 
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                      : 'border-slate-200/50 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100 text-slate-500 dark:text-slate-400 disabled:opacity-20 disabled:pointer-events-none'
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
                  className="p-1.5 rounded-lg border border-slate-200/50 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-550 dark:text-slate-405 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-20 disabled:pointer-events-none cursor-pointer select-none transition-all"
                  title="Download Optimized File"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* Recompress/Retry control */}
                <button
                  type="button"
                  onClick={() => onRecompressSingle(img.id)}
                  disabled={img.status === 'compressing'}
                  className="p-1.5 rounded-lg border border-slate-200/50 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-550 dark:text-slate-405 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-20 disabled:pointer-events-none cursor-pointer select-none transition-all"
                  title="Recompress / Apply current settings"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                {/* Delete item trigger */}
                <button
                  type="button"
                  onClick={() => onRemove(img.id)}
                  className="p-1.5 rounded-lg border border-slate-200/50 dark:border-slate-800/80 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-500 dark:text-slate-400 hover:text-red-500/90 dark:hover:text-red-400 cursor-pointer select-none transition-all"
                  title="Remove from workspace"
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
