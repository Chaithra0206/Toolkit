
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Clipboard, AlertCircle } from 'lucide-react';

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes: string[]; // e.g. ['application/pdf', 'image/*']
  acceptedExtensions: string[]; // e.g. ['.pdf'] or ['.jpg', '.png']
  descriptionText: string; // e.g. "DRAG & DROP PDF FILE(S) HERE"
  maxSizeMB?: number;
}

export default function UploadDropzone({
  onFilesSelected,
  acceptedTypes,
  acceptedExtensions,
  descriptionText,
  maxSizeMB = 100 // Default to 100MB
}: UploadDropzoneProps) {
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

  const validateAndProcessFiles = (files: FileList | File[]) => {
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    const oversizedFiles: string[] = [];

    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const type = file.type.toLowerCase();
      const name = file.name.toLowerCase();

      // Check size
      if (file.size > maxSizeBytes) {
        oversizedFiles.push(file.name);
        continue;
      }

      // Check mime type or extension match
      let isValid = false;

      // check mime-type wildcards
      for (const acceptedType of acceptedTypes) {
        if (acceptedType.endsWith('/*')) {
          const prefix = acceptedType.slice(0, -2);
          if (type.startsWith(prefix)) {
            isValid = true;
            break;
          }
        } else if (type === acceptedType) {
          isValid = true;
          break;
        }
      }

      // check file extensions if mime didn't match
      if (!isValid) {
        for (const ext of acceptedExtensions) {
          if (name.endsWith(ext.toLowerCase())) {
            isValid = true;
            break;
          }
        }
      }

      if (isValid) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    }

    if (oversizedFiles.length > 0) {
      setErrorText(`Exceeds ${maxSizeMB}MB size limit: ${oversizedFiles.join(', ')}`);
      setTimeout(() => setErrorText(null), 6000);
    } else if (invalidFiles.length > 0) {
      setErrorText(`Unsupported items (Expected ${acceptedExtensions.join(', ')}): ${invalidFiles.join(', ')}`);
      setTimeout(() => setErrorText(null), 6000);
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  // Clipboard Paste listener (useful for images)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Match mime-type
        let matchesMime = false;
        for (const acceptedType of acceptedTypes) {
          if (acceptedType.endsWith('/*')) {
            const prefix = acceptedType.slice(0, -2);
            if (item.type.startsWith(prefix)) {
              matchesMime = true;
              break;
            }
          } else if (item.type === acceptedType) {
            matchesMime = true;
            break;
          }
        }

        if (matchesMime) {
          const file = item.getAsFile();
          if (file) {
            const ext = item.type.split('/')[1] || 'bin';
            const namedFile = new File([file], `pasted-file-${Date.now()}-${i + 1}.${ext}`, {
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
  }, [onFilesSelected, acceptedTypes, acceptedExtensions, maxSizeMB]);

  return (
    <div className="w-full font-mono">
      <motion.div
        whileHover={{ scale: 1.001 }}
        whileTap={{ scale: 0.999 }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`relative group cursor-pointer border border-dashed text-center transition-all duration-150 flex flex-col items-center justify-center min-h-[220px] rounded-none ${
          isDragActive 
            ? 'border-black dark:border-white bg-neutral-50 dark:bg-neutral-900/40' 
            : 'border-neutral-300 dark:border-neutral-800 bg-transparent hover:border-black dark:hover:border-white hover:bg-neutral-50/20 dark:hover:bg-neutral-950/20'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedExtensions.join(',')}
          onChange={handleChange}
          className="hidden"
        />

        {showClipboardPulse && (
          <div className="absolute inset-0 bg-neutral-100/10 dark:bg-neutral-900/10 flex items-center justify-center animate-pulse border border-black dark:border-white pointer-events-none z-10">
            <div className="bg-black text-white dark:bg-white dark:text-black font-extrabold px-5 py-2.5 rounded-none text-[10px] border border-white dark:border-black shadow-md flex items-center gap-2 tracking-widest uppercase">
              <Clipboard className="w-4 h-4" />
              Pasted Item Captured!
            </div>
          </div>
        )}

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
              {descriptionText}
            </span>
            <span className="text-[9px] text-neutral-450 dark:text-neutral-500 block mt-2 tracking-wider">
              OR CLICK TO BROWSE COMPUTER (MAX {maxSizeMB}MB)
            </span>
          </div>

          {/* Quick specs section */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 select-none">
            {acceptedExtensions.map(ext => (
              <span key={ext} className="px-2 py-1 border border-neutral-200 dark:border-neutral-800 text-[8px] font-extrabold text-neutral-400 dark:text-neutral-550 rounded-none bg-transparent uppercase">
                {ext.replace('.', '')}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-[9px] text-neutral-400 dark:text-neutral-550 mt-3 select-none leading-none tracking-wide">
            <Clipboard className="w-3 h-3 shrink-0" />
            <span>Pasting with <kbd className="border border-neutral-250 dark:border-neutral-700 px-1 py-0.5 text-[8px]">Ctrl+V</kbd> or <kbd className="border border-neutral-250 dark:border-neutral-700 px-1 py-0.5 text-[8px]">⌘+V</kbd> supported</span>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {errorText && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-3 flex items-start gap-2 p-3 bg-transparent border border-red-600 dark:border-red-400 text-red-600 dark:text-red-400 text-[9px] tracking-wider rounded-none font-bold uppercase"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorText}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
