/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
      setErrorText(`Some files were skipped as they are not valid images: ${invalidTypes.join(', ')}`);
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
            // Give names to pasted images if generic
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
    <div className="w-full">
      <motion.div
        id="dropzone"
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 flex flex-col items-center justify-center min-h-[220px] ${
          isDragActive 
            ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-lg shadow-indigo-500/15' 
            : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-indigo-400 dark:hover:border-indigo-500/80 hover:bg-slate-50/50 dark:hover:bg-slate-900'
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
          <div className="absolute inset-0 bg-green-500/10 dark:bg-green-500/5 rounded-2xl flex items-center justify-center animate-pulse border border-green-500 pointer-events-none">
            <div className="bg-green-600 text-white font-medium px-4 py-2 rounded-full text-sm shadow-md flex items-center gap-1.5">
              <Clipboard className="w-4 h-4 text-white" />
              Pasted Image from Clipboard!
            </div>
          </div>
        )}

        {/* Visual indicators design */}
        <div className="flex flex-col items-center gap-4 max-w-md">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center duration-300 ${
            isDragActive 
              ? 'bg-indigo-500 text-white' 
              : 'bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 group-hover:scale-110'
          }`}>
            <Upload className="w-6 h-6" />
          </div>

          <div>
            <span className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 block">
              Drag & drop your images here
            </span>
            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 block mt-1">
              or <span className="text-indigo-600 dark:text-indigo-400 group-hover:underline font-medium">browse from your computer</span>
            </span>
          </div>

          {/* Quick specs section */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              JPG/JPEG
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              PNG
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              WEBP
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              AVIF
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              GIF
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              BMP
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              TIFF
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              SVG
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              HEIC
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mt-2 hover:text-slate-500">
            <Clipboard className="w-3.5 h-3.5" />
            <span>Pasting images directly with <kbd className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px] font-mono">Ctrl+V</kbd> or <kbd className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px] font-mono">⌘+V</kbd> is supported!</span>
          </div>
        </div>
      </motion.div>

      {errorText && (
        <motion.div
          id="dropzone-error"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mt-3 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-900/30 font-medium"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorText}</span>
        </motion.div>
      )}
    </div>
  );
}
