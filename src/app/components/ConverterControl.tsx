/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React from 'react';
import { Sparkles, FileImage, Image, Award, AlertCircle } from 'lucide-react';

type TargetFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

interface ConverterControlProps {
  targetFormat: TargetFormat;
  onChange: (format: TargetFormat) => void;
}

export default function ConverterControl({ targetFormat, onChange }: ConverterControlProps) {
  const formats = [
    {
      id: 'image/webp' as TargetFormat,
      name: 'WebP',
      extension: 'webp',
      badge: 'Recommended',
      description: 'Excellent compression and fidelity. Great replacement for JPEG & PNG.',
      icon: Sparkles
    },
    {
      id: 'image/avif' as TargetFormat,
      name: 'AVIF',
      extension: 'avif',
      badge: 'Next Gen',
      description: 'Next-generation compression with maximum size savings. Perfect web format.',
      icon: Award
    },
    {
      id: 'image/png' as TargetFormat,
      name: 'PNG',
      extension: 'png',
      badge: 'Transparency',
      description: 'Lossless compression. Preserves alpha channels and transparent backgrounds.',
      icon: FileImage
    },
    {
      id: 'image/jpeg' as TargetFormat,
      name: 'JPEG / JPG',
      extension: 'jpg',
      badge: 'Legacy',
      description: 'Universal compatibility. Lossy compression ideal for digital photos.',
      icon: Image
    }
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Select Target Conversion Format
        </label>
        <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-tight">
          All images added to the workspace will convert directly to your chosen file container format.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {formats.map((fmt) => {
          const isSelected = targetFormat === fmt.id;
          const Icon = fmt.icon;

          return (
            <button
              key={fmt.id}
              type="button"
              onClick={() => onChange(fmt.id)}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-4 transition-all duration-155 cursor-pointer relative select-none ${
                isSelected
                  ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-md'
                  : 'bg-slate-50/50 dark:bg-slate-905/30 border-slate-200/50 dark:border-slate-800/80 text-slate-800 dark:text-slate-250 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-[#121315]'
              }`}
            >
              {/* Badge for format traits */}
              <span className={`absolute top-3.5 right-3.5 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase font-mono tracking-wider ${
                isSelected
                  ? 'bg-white/15 dark:bg-black/10 text-white dark:text-black'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-450 dark:text-slate-500'
              }`}>
                {fmt.badge}
              </span>

              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isSelected 
                    ? 'bg-white/10 dark:bg-black/10' 
                    : 'bg-slate-100 dark:bg-slate-900'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="leading-none">
                  <span className="text-xs font-black block">{fmt.name}</span>
                  <span className={`text-[9px] font-mono mt-0.5 block ${isSelected ? 'text-white/60 dark:text-black/60' : 'text-slate-400'}`}>
                    *.{fmt.extension}
                  </span>
                </div>
              </div>

              <p className={`text-[10px] leading-relaxed ${
                isSelected 
                  ? 'text-slate-200 dark:text-slate-800 font-medium' 
                  : 'text-slate-450 dark:text-slate-500 font-normal'
              }`}>
                {fmt.description}
              </p>
            </button>
          );
        })}
      </div>
      
      {targetFormat === 'image/avif' && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 dark:bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            <strong>Format Note:</strong> AVIF offers industry-leading scaling compression but requires a modern browser. 
            Legacy systems or older email clients may fall back to JPG representation.
          </span>
        </div>
      )}
    </div>
  );
}
