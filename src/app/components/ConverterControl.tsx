/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React from 'react';
import { Target } from 'lucide-react';

type TargetFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

interface ConverterControlProps {
  targetFormat: TargetFormat;
  onChange: (format: TargetFormat) => void;
}

export default function ConverterControl({ targetFormat, onChange }: ConverterControlProps) {
  const formats = [
    {
      id: 'image/webp' as TargetFormat,
      name: 'WebP Format',
      extension: 'webp',
      badge: 'RECOMMENDED',
      description: 'Superb size compression and visual detail. Universal web standard.'
    },
    {
      id: 'image/avif' as TargetFormat,
      name: 'AVIF Format',
      extension: 'avif',
      badge: 'NEXT GEN',
      description: 'Next-generation matrix compression. Achieves maximum byte downscaling.'
    },
    {
      id: 'image/png' as TargetFormat,
      name: 'PNG Format',
      extension: 'png',
      badge: 'LOSSLESS',
      description: 'Preserves full transparency layers and absolute pixel channels.'
    },
    {
      id: 'image/jpeg' as TargetFormat,
      name: 'JPEG Format',
      extension: 'jpg',
      badge: 'COMPATIBLE',
      description: 'Legacy compatible format. Ideal for traditional camera snapshots.'
    }
  ];

  return (
    <div className="flex flex-col gap-6 font-mono">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">
          [ 1. SELECT TARGET CONVERSION CONTAINER ]
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {formats.map((fmt) => {
          const isSelected = targetFormat === fmt.id;

          return (
            <button
              key={fmt.id}
              type="button"
              onClick={() => onChange(fmt.id)}
              className={`p-5 rounded-none border text-left flex flex-col justify-between gap-4 transition-all duration-100 cursor-pointer relative select-none ${
                isSelected
                  ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                  : 'bg-transparent border-neutral-200 dark:border-neutral-800 text-neutral-450 hover:text-black dark:hover:text-white hover:border-black dark:hover:border-white'
              }`}
            >
              <div className="flex flex-col gap-2">
                <span className={`text-[8px] font-extrabold uppercase tracking-widest block`}>
                  [ {fmt.badge} ]
                </span>

                <div className="leading-none mt-1">
                  <span className="text-xs font-black block tracking-wider">{fmt.name}</span>
                  <span className="text-[9px] block mt-1 opacity-60">
                    *.{fmt.extension}
                  </span>
                </div>
              </div>

              <p className={`text-[9px] leading-relaxed mt-2`}>
                {fmt.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
