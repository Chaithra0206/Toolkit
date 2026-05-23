/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Clipboard, AlertCircle } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
}

export default function DropZone({ onFilesSelected }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [showClipboardPulse, setShowClipboardPulse] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFiles(e.target.files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Safe file types validator
  const validateAndProcessFiles = (files: FileList | File[]) => {
    const validFiles: File[] = [];
    const invalidTypes: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const type = file.type.toLowerCase();
      const name = file.name.toLowerCase();

      // Check standard formats: JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF, SVG, HEIC
      const isImage = 
        type.startsWith('image/') || 
        name.endsWith('.heic') || 
        name.endsWith('.heif') || 
        name.endsWith('.tiff') || 
        name.endsWith('.tif') || 
        name.endsWith('.bmp');

      if (isImage) {
        validFiles.push(file);
      } else {
        invalidTypes.push(file.name);
      }
    }

    if (invalidTypes.length > 0) {
      setErrorText(`Unsupported items: ${invalidTypes.join(', ')}`);
      setTimeout(() => setErrorText(null), 6000);
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  // Clipboard Paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const namedFile = new File([file], `pasted-image-${Date.now()}-${i + 1}.png`, {
              type: file.type
            });
            pastedFiles.push(namedFile);
          }
        }
      }

      if (pastedFiles.length > 0) {
        setShowClipboardPulse(true);
        setTimeout(() => setShowClipboardPulse(false), 1200);
        validateAndProcessFiles(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFilesSelected]);

  return (
    <div className="w-full font-mono">
      <motion.div
        id="dropzone"
        whileHover={{ scale: 1.002 }}
        whileTap={{ scale: 0.998 }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`relative group cursor-pointer border border-dashed text-center transition-all duration-150 flex flex-col items-center justify-center min-h-[220px] rounded-none ${
          isDragActive 
            ? 'border-black dark:border-white bg-neutral-50 dark:bg-neutral-900/40 shadow-[none]' 
            : 'border-neutral-300 dark:border-neutral-800 bg-transparent hover:border-black dark:hover:border-white hover:bg-neutral-50/20 dark:hover:bg-neutral-950/20'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.heic,.heif"
          onChange={handleChange}
          className="hidden"
        />

        {showClipboardPulse && (
          <div className="absolute inset-0 bg-neutral-100/10 dark:bg-neutral-900/10 flex items-center justify-center animate-pulse border border-black dark:border-white pointer-events-none">
            <div className="bg-black text-white dark:bg-white dark:text-black font-extrabold px-5 py-2.5 rounded-none text-xs border border-white dark:border-black shadow-md flex items-center gap-2 tracking-widest uppercase">
              <Clipboard className="w-4 h-4" />
              Pasted Image Captured!
            </div>
          </div>
        )}

        {/* Visual indicators design */}
        <div className="flex flex-col items-center gap-4 max-w-md p-6">
          <div className={`w-10 h-10 border flex items-center justify-center transition-colors duration-150 rounded-none ${
            isDragActive 
              ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black' 
              : 'border-neutral-300 dark:border-neutral-800 text-black dark:text-white'
          }`}>
            <Upload className="w-4 h-4" />
          </div>

          <div>
            <span className="text-xs font-black text-black dark:text-white uppercase tracking-widest block leading-none">
              DRAG & DROP IMAGE FILE(S) HERE
            </span>
            <span className="text-[9px] text-neutral-450 dark:text-neutral-500 block mt-2 tracking-wider">
              OR CLICK TO BROWSE COMPUTER
            </span>
          </div>

          {/* Quick specs section */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 select-none">
            {['JPG', 'PNG', 'WEBP', 'AVIF', 'GIF', 'HEIC'].map(fmt => (
              <span key={fmt} className="px-2 py-1 border border-neutral-200 dark:border-neutral-800 text-[8px] font-extrabold text-neutral-400 dark:text-neutral-500 rounded-none bg-transparent">
                {fmt}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-[9px] text-neutral-400 dark:text-neutral-550 mt-3 select-none leading-none tracking-wide">
            <Clipboard className="w-3 h-3 shrink-0" />
            <span>Pasting with <kbd className="border border-neutral-250 dark:border-neutral-700 px-1 py-0.5 text-[8px]">Ctrl+V</kbd> or <kbd className="border border-neutral-250 dark:border-neutral-700 px-1 py-0.5 text-[8px]">⌘+V</kbd> supported</span>
          </div>
        </div>
      </motion.div>

      {errorText && (
        <motion.div
          id="dropzone-error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="mt-3 flex items-start gap-2 p-3 bg-transparent border border-black dark:border-white text-black dark:text-white text-[9px] tracking-wider rounded-none font-bold uppercase"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorText}</span>
        </motion.div>
      )}
    </div>
  );
}
