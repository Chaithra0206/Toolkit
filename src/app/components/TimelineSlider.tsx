

'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface TimelineSliderProps {
  duration: number;
  startTime: number;
  endTime: number;
  onChange: (start: number, end: number) => void;
}

export default function TimelineSlider({
  duration,
  startTime,
  endTime,
  onChange
}: TimelineSliderProps) {
  const max = duration || 100;

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(parseFloat(e.target.value), endTime - 0.1);
    onChange(val, endTime);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(parseFloat(e.target.value), startTime + 0.1);
    onChange(startTime, val);
  };

  // Adjustments by step (e.g. 0.1 seconds)
  const adjustStart = (amount: number) => {
    const nextStart = Math.min(Math.max(0, startTime + amount), endTime - 0.1);
    onChange(parseFloat(nextStart.toFixed(2)), endTime);
  };

  const adjustEnd = (amount: number) => {
    const nextEnd = Math.min(Math.max(startTime + 0.1, endTime + amount), max);
    onChange(startTime, parseFloat(nextEnd.toFixed(2)));
  };

  // Calculate percentage positions for track coloring
  const startPercent = (startTime / max) * 100;
  const endPercent = (endTime / max) * 100;

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="w-full flex flex-col gap-4 font-mono select-none">
      
      {/* Visual range track */}
      <div className="relative w-full h-8 flex items-center bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        
        {/* Selected Area Highlighter */}
        <div 
          className="absolute h-full bg-black/10 dark:bg-white/10 border-l border-r border-black dark:border-white transition-all duration-75"
          style={{
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`
          }}
        />

        {/* Overlapping double inputs */}
        <div className="absolute inset-0 flex items-center pointer-events-none">
          {/* Start Knob Input */}
          <input
            type="range"
            min={0}
            max={max}
            step={0.05}
            value={startTime}
            onChange={handleStartChange}
            className="absolute w-full appearance-none h-1 bg-transparent pointer-events-auto accent-black dark:accent-white z-20 outline-none"
            style={{
              WebkitAppearance: 'none',
              pointerEvents: 'auto'
            }}
          />

          {/* End Knob Input */}
          <input
            type="range"
            min={0}
            max={max}
            step={0.05}
            value={endTime}
            onChange={handleEndChange}
            className="absolute w-full appearance-none h-1 bg-transparent pointer-events-auto accent-black dark:accent-white z-20 outline-none"
            style={{
              WebkitAppearance: 'none',
              pointerEvents: 'auto'
            }}
          />
        </div>

        {/* Small hash marks for aesthetics */}
        <div className="absolute inset-x-0 bottom-0 h-1.5 flex justify-between px-1 opacity-25">
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={i} className="w-px h-full bg-black dark:bg-white" />
          ))}
        </div>
      </div>

      {/* Numeric inputs and fine tuning controllers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Start point controls */}
        <div className="flex items-center justify-between p-3 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-black text-neutral-450 tracking-widest uppercase">
              START CUT BOUNDARY
            </span>
            <span className="text-xs font-black text-black dark:text-white">
              {formatTime(startTime)} <span className="text-[9px] font-normal opacity-50">({startTime.toFixed(2)}s)</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => adjustStart(-1)}
              className="p-1 border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer rounded-none"
              title="Back 1.0s"
            >
              -1.0s
            </button>
            <button
              onClick={() => adjustStart(-0.1)}
              className="p-1 border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer rounded-none"
              title="Back 0.1s"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={() => adjustStart(0.1)}
              className="p-1 border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer rounded-none"
              title="Forward 0.1s"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={() => adjustStart(1)}
              className="p-1 border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer rounded-none"
              title="Forward 1.0s"
            >
              +1.0s
            </button>
          </div>
        </div>

        {/* End point controls */}
        <div className="flex items-center justify-between p-3 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-black text-neutral-450 tracking-widest uppercase">
              END CUT BOUNDARY
            </span>
            <span className="text-xs font-black text-black dark:text-white">
              {formatTime(endTime)} <span className="text-[9px] font-normal opacity-50">({endTime.toFixed(2)}s)</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => adjustEnd(-1)}
              className="p-1 border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer rounded-none"
              title="Back 1.0s"
            >
              -1.0s
            </button>
            <button
              onClick={() => adjustEnd(-0.1)}
              className="p-1 border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer rounded-none"
              title="Back 0.1s"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={() => adjustEnd(0.1)}
              className="p-1 border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer rounded-none"
              title="Forward 0.1s"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={() => adjustEnd(1)}
              className="p-1 border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer rounded-none"
              title="Forward 1.0s"
            >
              +1.0s
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
