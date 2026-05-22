/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ImageItem } from '../types';
import { formatBytes } from '../utils/compressor';
import { X, SlidersHorizontal, Percent, Maximize2 } from 'lucide-react';

interface SideBySidePreviewProps {
  image: ImageItem;
  onClose: () => void;
}

export default function SideBySidePreview({ image, onClose }: SideBySidePreviewProps) {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage (0 - 100)
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  const originalSizeFormatted = formatBytes(image.originalSize);
  const compressedSizeFormatted = image.compressedSize 
    ? formatBytes(image.compressedSize) 
    : 'Pending';

  const percentSaved = image.percentage !== null 
    ? image.percentage <= 0 
      ? `${Math.abs(image.percentage).toFixed(0)}% saved`
      : `+${image.percentage.toFixed(0)}% larger`
    : '';

  return (
    <div className="bg-white dark:bg-[#121315] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
      
      {/* Header: title, stats, close button */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Visual Quality Inspector
          </h3>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-900 text-slate-500 px-2 py-0.5 rounded font-mono font-bold">
            {image.originalWidth}x{image.originalHeight} px
          </span>
          {image.percentage !== null && image.percentage <= 0 && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-bold flex items-center gap-1">
              <Percent className="w-2.5 h-2.5" />
              {percentSaved}
            </span>
          )}
        </div>

        <button
          id="close-preview-btn"
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-100 cursor-pointer select-none transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Comparison Workspace */}
      <div 
        ref={containerRef}
        className="relative w-full h-[320px] sm:h-[400px] rounded-xl overflow-hidden bg-slate-950/20 border border-slate-200/40 dark:border-slate-800/50 cursor-ew-resize select-none"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
          handleMove(e.clientX);
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          handleMove(e.touches[0].clientX);
        }}
      >
        {/* Underlay Image: Original (Left side) */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src={image.originalUrl}
            alt="Original"
            className="w-full h-full object-contain bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]"
            draggable={false}
            referrerPolicy="no-referrer"
          />
          {/* Tag: Original */}
          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs text-[9px] font-extrabold text-white px-2.5 py-1 rounded-md uppercase tracking-wider select-none font-mono">
            Original • {originalSizeFormatted}
          </div>
        </div>

        {/* Overlay Image: Compressed (Right side) clipped based on sliderPosition */}
        <div 
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`
          }}
        >
          <img
            src={image.compressedUrl || image.originalUrl}
            alt="Compressed"
            className="w-full h-full object-contain bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]"
            draggable={false}
            referrerPolicy="no-referrer"
          />
          {/* Tag: Compressed */}
          <div className="absolute top-3 right-3 bg-indigo-600/90 backdrop-blur-xs text-[9px] font-extrabold text-white px-2.5 py-1 rounded-md uppercase tracking-wider select-none font-mono">
            Optimized • {compressedSizeFormatted}
          </div>
        </div>

        {/* Interactive Slider Bar and Knob handle */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-white dark:bg-white cursor-ew-resize flex items-center justify-center shadow-lg"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1C1E22] text-slate-800 dark:text-white flex items-center justify-center border-2 border-white dark:border-[#2C2E34] shadow-[0_2px_10px_rgba(0,0,0,0.15)] pointer-events-none select-none hover:scale-105 active:scale-95 duration-100">
            <SlidersHorizontal className="w-3.5 h-3.5 rotate-90" />
          </div>
        </div>
      </div>

      {/* Footer advice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
          <span>Interactive: Drag slider left-to-right to inspect downscaling changes</span>
        </div>
        <div>
          <span>Compression Format: {image.compressedType.replace('image/', '').toUpperCase() || 'PNG'}</span>
        </div>
      </div>

    </div>
  );
}
