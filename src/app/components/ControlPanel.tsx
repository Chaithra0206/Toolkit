/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CompressionSettings } from '../types';
import { Sparkles, CheckSquare, Square } from 'lucide-react';

interface ControlPanelProps {
  settings: CompressionSettings;
  onChange: (settings: CompressionSettings) => void;
  onApplyToAll: () => void;
  hasImages: boolean;
}

export default function ControlPanel({ settings, onChange, onApplyToAll, hasImages }: ControlPanelProps) {
  const handleQualityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...settings,
      quality: parseFloat(e.target.value) / 100
    });
  };

  const handleResizeModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...settings,
      resizeMode: e.target.value as any
    });
  };

  const handleResizeValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    onChange({ ...settings, resizeValue: val });
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    onChange({ ...settings, resizeWidth: val });
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    onChange({ ...settings, resizeHeight: val });
  };

  const togglePreserveMetadata = () => {
    onChange({
      ...settings,
      preserveMetadata: !settings.preserveMetadata
    });
  };

  const toggleAutoFormat = () => {
    onChange({
      ...settings,
      autoFormat: !settings.autoFormat
    });
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Target parameters group */}
      <div className="flex flex-col gap-5">
        
        {/* Toggle Lossless / Lossy Mode */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Compression Mode
          </label>
          <div className="grid grid-cols-2 gap-1 bg-slate-100/70 dark:bg-slate-900 p-1 rounded-xl">
            <button
              id="lossy-mode-btn"
              type="button"
              onClick={() => onChange({ ...settings, lossless: false })}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-155 cursor-pointer ${
                !settings.lossless
                  ? 'bg-white dark:bg-[#1C1E22] text-slate-950 dark:text-slate-50 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-850'
              }`}
            >
              Lossy (Best size)
            </button>
            <button
              id="lossless-mode-btn"
              type="button"
              onClick={() => onChange({ ...settings, lossless: true })}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-155 cursor-pointer ${
                settings.lossless
                  ? 'bg-white dark:bg-[#1C1E22] text-slate-950 dark:text-slate-50 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-855'
              }`}
            >
              Lossless
            </button>
          </div>
        </div>

        {/* Compression Quality Slider - Dimmed if Lossless */}
        <div className={`flex flex-col gap-2 transition-opacity duration-200 ${settings.lossless ? 'opacity-30 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Compression Quality
            </label>
            <span className="text-xs font-bold text-slate-955 dark:text-white font-mono">
              {Math.round(settings.quality * 100)}%
            </span>
          </div>
          <input
            id="quality-slider"
            type="range"
            min="5"
            max="100"
            step="1"
            value={Math.round(settings.quality * 100)}
            onChange={handleQualityChange}
            className="w-full accent-black dark:accent-white bg-slate-150 dark:bg-slate-800 h-1 rounded-sm cursor-pointer"
          />
        </div>

        {/* Target Format Dropdown */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Output Format
            </label>
            <button
              id="toggle-auto-format"
              type="button"
              onClick={toggleAutoFormat}
              className={`text-[9px] font-bold tracking-tight uppercase flex items-center gap-1.5 px-2 py-0.5 rounded-md border transition-colors ${
                settings.autoFormat
                  ? 'bg-green-500/10 text-green-650 dark:text-green-455 border-green-500/20'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-505 border-slate-200/50 dark:border-slate-800/60'
              }`}
            >
              <Sparkles className="w-2.5 h-2.5" />
              Auto Choice
            </button>
          </div>
          <select
            id="format-select"
            value={settings.autoFormat ? 'auto' : settings.format}
            onChange={(e) => {
              if (e.target.value === 'auto') {
                onChange({ ...settings, autoFormat: true });
              } else {
                onChange({ ...settings, autoFormat: false, format: e.target.value as any });
              }
            }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {settings.autoFormat && <option value="auto">Auto-optimized Format (Suggested)</option>}
            <option value="original">Keep Original Format</option>
            <option value="image/webp">WebP (Highly optimized size)</option>
            <option value="image/avif">AVIF (Maximum compression)</option>
            <option value="image/jpeg">JPEG / JPG (Fully compatible)</option>
            <option value="image/png">PNG (Preserves alpha/transparency)</option>
          </select>
        </div>

        {/* Dimension Rescale Control block */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Dimensions Scale
          </label>
          <select
            id="resize-mode-select"
            value={settings.resizeMode}
            onChange={handleResizeModeChange}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="none">Resize: No Changes</option>
            <option value="percentage">Resize: Scale by Percentage (%)</option>
            <option value="width">Resize: Lock Custom Width (px)</option>
            <option value="height">Resize: Lock Custom Height (px)</option>
            <option value="fit">Resize: Fit Boundary Limits (px)</option>
          </select>

          {/* Dynamic input fields based on selection */}
          {settings.resizeMode === 'percentage' && (
            <div className="flex items-center gap-2 mt-1">
              <input
                id="resize-percentage-input"
                type="number"
                min="5"
                max="100"
                value={settings.resizeValue}
                onChange={handleResizeValueChange}
                className="w-20 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-mono font-bold"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500">
                % percentage factor
              </span>
            </div>
          )}

          {settings.resizeMode === 'width' && (
            <div className="flex items-center gap-2 mt-1">
              <input
                id="resize-width-input"
                type="number"
                min="8"
                max="10000"
                value={settings.resizeWidth}
                onChange={handleWidthChange}
                className="w-24 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-mono font-bold"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500">
                px width bounds
              </span>
            </div>
          )}

          {settings.resizeMode === 'height' && (
            <div className="flex items-center gap-2 mt-1">
              <input
                id="resize-height-input"
                type="number"
                min="8"
                max="10000"
                value={settings.resizeHeight}
                onChange={handleHeightChange}
                className="w-24 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-mono font-bold"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500">
                px height bounds
              </span>
            </div>
          )}

          {settings.resizeMode === 'fit' && (
            <div className="grid grid-cols-2 gap-2 mt-1 p-2 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Max Width (px)</span>
                <input
                  id="fit-width-input"
                  type="number"
                  min="8"
                  value={settings.resizeWidth}
                  onChange={handleWidthChange}
                  className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded font-mono font-bold text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Max Height (px)</span>
                <input
                  id="fit-height-input"
                  type="number"
                  min="8"
                  value={settings.resizeHeight}
                  onChange={handleHeightChange}
                  className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded font-mono font-bold text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Binary Toggles (Preserve EXIF block) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60">
          <button
            id="toggle-metadata-btn"
            type="button"
            onClick={togglePreserveMetadata}
            className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 select-none py-1.5 font-semibold text-left transition-colors"
          >
            {settings.preserveMetadata ? (
              <CheckSquare className="w-4 h-4 text-black dark:text-white shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-slate-350 dark:text-slate-650 shrink-0" />
            )}
            <span>Preserve EXIF photo metadata</span>
          </button>
        </div>

      </div>

      {/* Primary Action Row Block */}
      {hasImages && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60">
          <button
            id="apply-to-all-btn"
            type="button"
            onClick={onApplyToAll}
            className="w-full py-2.5 bg-black hover:bg-slate-850 dark:bg-white dark:hover:bg-slate-100 active:scale-98 text-white dark:text-black rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all duration-150"
          >
            Apply to All Queue
          </button>
        </div>
      )}

    </div>
  );
}
