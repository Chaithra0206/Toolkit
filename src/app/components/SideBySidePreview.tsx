

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ImageItem } from '../types';
import { formatBytes } from '../utils/compressor';
import { X, SlidersHorizontal } from 'lucide-react';

interface SideBySidePreviewProps {
  image: ImageItem;
  onClose: () => void;
}

export default function SideBySidePreview({ image, onClose }: SideBySidePreviewProps) {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage (0 - 100)
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  const originalSizeFormatted = formatBytes(image.originalSize);
  const compressedSizeFormatted = image.compressedSize 
    ? formatBytes(image.compressedSize) 
    : 'Pending';

  const percentSaved = image.percentage !== null 
    ? image.percentage <= 0 
      ? `${Math.abs(image.percentage).toFixed(0)}% SAVED`
      : `+${image.percentage.toFixed(0)}% LARGER`
    : '';

  return (
    <div className="bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-none p-4 sm:p-5 flex flex-col gap-4 shadow-none">
      
      {/* Header: title, stats, close button */}
      <div className="flex items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] tracking-widest text-black dark:text-white uppercase">
          <h3 className="font-black">
            [ IMAGE COMPARISON INSPECTOR ]
          </h3>
          <span className="opacity-40">|</span>
          <span className="opacity-80">
            {image.originalWidth}x{image.originalHeight} PX
          </span>
          {image.percentage !== null && image.percentage <= 0 && (
            <>
              <span className="opacity-40">|</span>
              <span className="font-extrabold text-black dark:text-white">
                {percentSaved}
              </span>
            </>
          )}
        </div>

        <button
          id="close-preview-btn"
          type="button"
          onClick={onClose}
          className="p-1 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-black dark:text-white cursor-pointer select-none rounded-none"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Comparison Workspace */}
      <div 
        ref={containerRef}
        className="relative w-full h-[320px] sm:h-[400px] rounded-none overflow-hidden bg-neutral-950/5 border border-neutral-200 dark:border-neutral-850 cursor-ew-resize select-none"
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
            className="w-full h-full object-contain bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] dark:bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px] grayscale opacity-90"
            draggable={false}
            referrerPolicy="no-referrer"
          />
          {/* Tag: Original */}
          <div className="absolute top-3 left-3 bg-black text-[8px] font-black text-white px-2.5 py-1 rounded-none uppercase tracking-wider select-none font-mono">
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
            className="w-full h-full object-contain bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] dark:bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px] grayscale opacity-90"
            draggable={false}
            referrerPolicy="no-referrer"
          />
          {/* Tag: Compressed */}
          <div className="absolute top-3 right-3 bg-black text-[8px] font-black text-white border border-white px-2.5 py-1 rounded-none uppercase tracking-wider select-none font-mono">
            Optimized • {compressedSizeFormatted}
          </div>
        </div>

        {/* Interactive Slider Bar and Knob handle */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-black dark:bg-white cursor-ew-resize flex items-center justify-center shadow-none"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="w-8 h-8 rounded-none bg-white dark:bg-black text-black dark:text-white flex items-center justify-center border border-black dark:border-white shadow-[0_2px_10px_rgba(0,0,0,0.15)] pointer-events-none select-none hover:scale-105 active:scale-95 duration-100">
            <SlidersHorizontal className="w-3.5 h-3.5 rotate-90" />
          </div>
        </div>
      </div>

      {/* Footer advice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[9px] text-neutral-450 dark:text-neutral-500 font-mono tracking-wider select-none leading-none">
        <div className="flex items-center gap-1.5">
          <span>DRAG THE SQUARE SLIDER LEFT AND RIGHT TO COMPARE</span>
        </div>
        <div>
          <span>FORMAT: {image.compressedType.replace('image/', '').toUpperCase() || 'PNG'}</span>
        </div>
      </div>

    </div>
  );
}
